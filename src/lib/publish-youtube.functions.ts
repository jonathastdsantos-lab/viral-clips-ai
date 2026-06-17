import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const Input = z.object({
  clipId: z.string().uuid(),
  scheduleFor: z.string().datetime().optional(), // ISO string, se vazio publica agora
});

export const publishToYouTube = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Buscar clip com output_url
    const { data: clip, error: clipErr } = await supabase
      .from('clips')
      .select('id, title, caption, hashtags, output_url, status')
      .eq('id', data.clipId)
      .eq('user_id', userId)
      .single();

    if (clipErr || !clip) throw new Error('Clip não encontrado');
    if (!clip.output_url) throw new Error('Renderize o clip antes de publicar.');

    // Buscar conexão OAuth do YouTube
    const { data: conn, error: connErr } = await supabase
      .from('social_connections')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .eq('platform', 'youtube')
      .single();

    if (connErr || !conn) throw new Error('Conecte sua conta do YouTube em Configurações > Redes Sociais.');

    // Verificar se token expirou e renovar
    let accessToken = conn.access_token;
    if (conn.expires_at && new Date(conn.expires_at) < new Date() && conn.refresh_token) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.YOUTUBE_CLIENT_ID!,
          client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
          refresh_token: conn.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      const refreshJson = await refreshRes.json() as { access_token: string; expires_in: number };
      accessToken = refreshJson.access_token;
      await supabase.from('social_connections').update({
        access_token: accessToken,
        expires_at: new Date(Date.now() + refreshJson.expires_in * 1000).toISOString(),
      }).eq('user_id', userId).eq('platform', 'youtube');
    }

    // Se tem agendamento, salvar na tabela scheduled_posts
    if (data.scheduleFor) {
      const { data: scheduled, error: schedErr } = await supabase
        .from('scheduled_posts')
        .insert({
          user_id: userId,
          clip_id: data.clipId,
          platform: 'youtube',
          scheduled_for: data.scheduleFor,
          status: 'scheduled',
        })
        .select('id')
        .single();
      if (schedErr) throw schedErr;
      return { ok: true as const, scheduled: true, scheduledPostId: scheduled.id };
    }

    // Publicar imediatamente via YouTube Data API v3
    // Step 1: Baixar o arquivo do clip do Supabase Storage
    const videoResponse = await fetch(clip.output_url);
    if (!videoResponse.ok) throw new Error('Falha ao baixar o clip para publicação');
    const videoBlob = await videoResponse.blob();

    // Step 2: Criar o vídeo no YouTube (upload multipart)
    const hashtags = (clip.hashtags ?? []).map((h: string) => `#${h.replace(/^#/, '')}`).join(' ');
    const description = `${clip.caption ?? ''}\n\n${hashtags}\n\n#Shorts`;
    const title = clip.title.slice(0, 100);

    const metadata = JSON.stringify({
      snippet: {
        title,
        description,
        tags: clip.hashtags ?? [],
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    });

    const boundary = '-------corta_vc_boundary';
    const body = [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
      `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`,
    ];

    const bodyStart = new TextEncoder().encode(body.join(''));
    const bodyEnd = new TextEncoder().encode(`\r\n--${boundary}--`);
    const videoBuffer = await videoBlob.arrayBuffer();

    const finalBody = new Uint8Array(bodyStart.byteLength + videoBuffer.byteLength + bodyEnd.byteLength);
    finalBody.set(bodyStart, 0);
    finalBody.set(new Uint8Array(videoBuffer), bodyStart.byteLength);
    finalBody.set(bodyEnd, bodyStart.byteLength + videoBuffer.byteLength);

    const ytRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: finalBody,
      }
    );

    if (!ytRes.ok) {
      const err = await ytRes.text();
      throw new Error(`YouTube API error ${ytRes.status}: ${err.slice(0, 300)}`);
    }

    const ytJson = await ytRes.json() as { id: string };

    // Atualizar clip como publicado
    await supabase
      .from('clips')
      .update({
        status: 'published',
        output_url: `https://youtube.com/shorts/${ytJson.id}`,
      })
      .eq('id', data.clipId);

    return { ok: true as const, scheduled: false, youtubeId: ytJson.id };
  });
