import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const listHeyGenAvatars = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('HEYGEN_API_KEY não configurada.');

    const res = await fetch('https://api.heygen.com/v2/avatars', {
      headers: {
        'X-Api-Key': apiKey,
        Accept: 'application/json',
      },
    });

    if (!res.ok) throw new Error(`HeyGen error: ${res.status}`);
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
