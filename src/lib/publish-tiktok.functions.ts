import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const Input = z.object({
  clipId: z.string().uuid(),
  caption: z.string().max(2200).optional(),
  scheduleFor: z.string().datetime().optional(),
});

export const publishToTikTok = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Buscar clip
    const { data: clip, error: clipErr } = await supabase
      .from('clips')
      .select('id, title, caption, hashtags, output_url, status')
      .eq('id', data.clipId)
      .eq('user_id', userId)
      .single();
    if (clipErr || !clip) throw new Error('Clip não encontrado.');
    if (!clip.output_url) throw new Error('Renderize o clip antes de publicar no TikTok.');

    // Buscar conexão TikTok
    const { data: conn, error: connErr } = await supabase
      .from('tiktok_connections')
      .select('access_token, refresh_token, open_id, expires_at')
      .eq('user_id', userId)
      .single();
    if (connErr || !conn) throw new Error('Conecte sua conta TikTok em Configurações > Redes Sociais.');

    // Renovar token se expirado
    let accessToken = conn.access_token;
    if (conn.expires_at && new Date(conn.expires_at) <= new Date() && conn.refresh_token) {
      const refreshRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY!,
          client_secret: process.env.TIKTOK_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: conn.refresh_token,
        }),
      });
      const refreshJson = await refreshRes.json() as {
        data: { access_token: string; expires_in: number; refresh_token: string };
      };
      accessToken = refreshJson.data.access_token;
      await supabase.from('tiktok_connections').update({
        access_token: accessToken,
        refresh_token: refreshJson.data.refresh_token,
        expires_at: new Date(Date.now() + refreshJson.data.expires_in * 1000).toISOString(),
      }).eq('user_id', userId);
    }

    // Montar caption com hashtags
    const hashtags = (clip.hashtags ?? []).map((h: string) => `#${h.replace(/^#/, '')}`).join(' ');
    const captionText = data.caption ?? `${clip.caption ?? clip.title}\n\n${hashtags}`;

    // Step 1: Iniciar upload via TikTok Content Posting API
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: captionText.slice(0, 2200),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: clip.output_url,
        },
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.text();
      throw new Error(`TikTok API erro ${initRes.status}: ${err.slice(0, 300)}`);
    }

    const initJson = await initRes.json() as {
      data: { publish_id: string };
      error: { code: string; message: string };
    };

    if (initJson.error?.code !== 'ok') {
      throw new Error(`TikTok: ${initJson.error?.message ?? 'Erro desconhecido'}`);
    }

    const publishId = initJson.data.publish_id;

    // Atualizar clip como publicado
    await supabase.from('clips').update({
      status: 'published',
      tiktok_post_id: publishId,
      published_at: new Date().toISOString(),
      published_platform: 'tiktok',
    }).eq('id', data.clipId);

    return { ok: true as const, publishId };
  });
