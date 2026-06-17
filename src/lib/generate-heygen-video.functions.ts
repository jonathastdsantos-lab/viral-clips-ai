import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const Input = z.object({
  clipId: z.string().uuid(),
  avatarId: z.string(),
  script: z.string().min(10).max(1500),
  voiceId: z.string().optional(),
});

export const generateHeyGenVideo = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('HEYGEN_API_KEY não configurada.');

    await supabase.from('clips').update({ heygen_status: 'generating' }).eq('id', data.clipId);

    // Criar vídeo no HeyGen - formato vertical 9:16
    const payload = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: data.avatarId,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            input_text: data.script,
            voice_id: data.voiceId ?? 'pt-BR-FranciscaNeural', // voz PT-BR padrão
            speed: 1.0,
          },
          background: {
            type: 'color',
            value: '#000000',
          },
        },
      ],
      dimension: { width: 1080, height: 1920 },
      aspect_ratio: null,
      test: process.env.NODE_ENV !== 'production',
    };

    const createRes = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`HeyGen API ${createRes.status}: ${err.slice(0, 300)}`);
    }

    const createJson = await createRes.json() as { data: { video_id: string }; error?: string };
    if (createJson.error) throw new Error(`HeyGen: ${createJson.error}`);

    const videoId = createJson.data.video_id;

    await supabase.from('clips').update({
      heygen_video_id: videoId,
      heygen_status: 'processing',
    }).eq('id', data.clipId);

    // Polling para aguardar conclusão (HeyGen leva 1-3 minutos)
    let attempts = 0;
    const maxAttempts = 60; // 5 min timeout
    let videoUrl: string | null = null;

    while (attempts < maxAttempts && !videoUrl) {
      await new Promise((r) => setTimeout(r, 5000));
      attempts++;

      const statusRes = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        headers: { 'X-Api-Key': apiKey },
      });

      const statusJson = await statusRes.json() as {
        data: { status: string; video_url?: string; thumbnail_url?: string };
      };

      if (statusJson.data.status === 'completed' && statusJson.data.video_url) {
        videoUrl = statusJson.data.video_url;
      } else if (statusJson.data.status === 'failed') {
        throw new Error('HeyGen: geração do vídeo falhou');
      }
    }

    if (!videoUrl) throw new Error('HeyGen: timeout aguardando vídeo (5min). Tente novamente.');

    // Salvar no Storage Supabase para acesso permanente
    const videoBytes = await fetch(videoUrl).then((r) => r.arrayBuffer());
    const storagePath = `${userId}/${data.clipId}/heygen-${Date.now()}.mp4`;
    const { error: upErr } = await supabase.storage
      .from('videos')
      .upload(storagePath, new Uint8Array(videoBytes), { contentType: 'video/mp4', upsert: true });

    let finalUrl = videoUrl;
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(storagePath);
      finalUrl = publicUrl;
    }

    await supabase.from('clips').update({
      heygen_video_url: finalUrl,
      heygen_status: 'ready',
    }).eq('id', data.clipId);

    return { ok: true as const, url: finalUrl };
  });
