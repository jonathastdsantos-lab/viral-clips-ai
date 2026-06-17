import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { clipId, mode } = await req.json() as {
      clipId: string;
      mode: 'face_track' | 'center_crop';
    };

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error('Não autorizado');

    // Buscar clip com output_url (vídeo original renderizado)
    const { data: clip } = await supabase
      .from('clips')
      .select('id, output_url, start_sec, end_sec')
      .eq('id', clipId)
      .eq('user_id', user.id)
      .single();

    if (!clip?.output_url) throw new Error('Clip sem vídeo renderizado. Renderize antes de aplicar auto-reframe.');

    await supabase.from('clips').update({ reframe_status: 'processing' }).eq('id', clipId);

    const replicateToken = Deno.env.get('REPLICATE_API_TOKEN')!;

    // Usar modelo de auto-reframe/crop para vertical
    if (mode === 'center_crop') {
      // Modo simples: crop central sem face detection usando ffmpeg
      const videoBytes = await fetch(clip.output_url).then((r) => r.arrayBuffer());
      await Deno.writeFile('/tmp/input_reframe.mp4', new Uint8Array(videoBytes));

      const ffmpeg = new Deno.Command('ffmpeg', {
        args: [
          '-y',
          '-i', '/tmp/input_reframe.mp4',
          '-vf', [
            'scale=ih*9/16:ih',
            'crop=ih*9/16:ih:(iw-ih*9/16)/2:0',
            'scale=1080:1920',
          ].join(','),
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '26',
          '-c:a', 'aac', '-b:a', '128k',
          '-movflags', '+faststart',
          '/tmp/output_reframe.mp4',
        ],
      });
      const { code, stderr } = await ffmpeg.output();
      if (code !== 0) throw new Error(`ffmpeg: ${new TextDecoder().decode(stderr).slice(-200)}`);

      const outputBytes = await Deno.readFile('/tmp/output_reframe.mp4');
      const storagePath = `${user.id}/${clipId}/reframe-${Date.now()}.mp4`;
      const { error: upErr } = await supabase.storage
        .from('videos')
        .upload(storagePath, outputBytes, { contentType: 'video/mp4', upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(storagePath);

      await supabase.from('clips').update({
        reframe_url: publicUrl,
        reframe_status: 'ready',
      }).eq('id', clipId);

      await Deno.remove('/tmp/input_reframe.mp4').catch(() => {});
      await Deno.remove('/tmp/output_reframe.mp4').catch(() => {});

      return new Response(JSON.stringify({ ok: true, url: publicUrl, mode: 'center_crop' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Modo face_track: usar Replicate com modelo de smart crop
    const predRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
        input: {
          video: clip.output_url,
          target_width: 1080,
          target_height: 1920,
          smart_crop: true,
          face_detection: true,
        },
        webhook: `${Deno.env.get('SUPABASE_URL')}/functions/v1/replicate-webhook`,
        webhook_events_filter: ['completed'],
      }),
    });

    if (!predRes.ok) {
      // Fallback para center crop se o modelo não existir
      const errText = await predRes.text();
      console.warn('Replicate model unavailable, falling back to center_crop:', errText);

      const videoBytes = await fetch(clip.output_url).then((r) => r.arrayBuffer());
      await Deno.writeFile('/tmp/input_reframe.mp4', new Uint8Array(videoBytes));

      const ffmpeg = new Deno.Command('ffmpeg', {
        args: [
          '-y', '-i', '/tmp/input_reframe.mp4',
          '-vf', 'scale=ih*9/16:ih,crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920',
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '26',
          '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
          '/tmp/output_reframe.mp4',
        ],
      });
      const { code } = await ffmpeg.output();
      if (code !== 0) throw new Error('Falha no reframe fallback');

      const outputBytes = await Deno.readFile('/tmp/output_reframe.mp4');
      const storagePath = `${user.id}/${clipId}/reframe-${Date.now()}.mp4`;
      await supabase.storage.from('videos').upload(storagePath, outputBytes, { contentType: 'video/mp4', upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(storagePath);

      await supabase.from('clips').update({ reframe_url: publicUrl, reframe_status: 'ready' }).eq('id', clipId);
      return new Response(JSON.stringify({ ok: true, url: publicUrl, mode: 'center_crop_fallback' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pred = await predRes.json() as { id: string };
    await supabase.from('clips').update({ reframe_prediction_id: pred.id }).eq('id', clipId);

    return new Response(JSON.stringify({ ok: true, predictionId: pred.id, async: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
