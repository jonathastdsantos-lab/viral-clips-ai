import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const listHeyGenAvatars = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) return { ok: false as const, configured: false, avatars: [], error: 'HEYGEN_API_KEY não configurada.' };

    const res = await fetch('https://api.heygen.com/v2/avatars', {
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('HeyGen /v2/avatars error', res.status, body.slice(0, 300));
      const msg = res.status === 401
        ? 'HEYGEN_API_KEY inválida ou sem permissão (401). Verifique a chave no painel HeyGen.'
        : `HeyGen error ${res.status}`;
      return { ok: false as const, configured: true, avatars: [], error: msg };
    }
    const json = await res.json() as {
      data: {
        avatars: Array<{
          avatar_id: string;
          avatar_name: string;
          preview_image_url: string;
          preview_video_url: string;
          gender: string;
        }>;
      };
    };

    return {
      ok: true as const,
      avatars: json.data.avatars.map((a) => ({
        id: a.avatar_id,
        name: a.avatar_name,
        previewImage: a.preview_image_url,
        previewVideo: a.preview_video_url,
        gender: a.gender,
      })),
    };
  });
