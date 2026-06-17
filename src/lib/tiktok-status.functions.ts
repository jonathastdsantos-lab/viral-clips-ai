import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const Input = z.object({ publishId: z.string() });

export const getTikTokStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: conn } = await supabase
      .from('tiktok_connections')
      .select('access_token')
      .eq('user_id', userId)
      .single();
    if (!conn) throw new Error('Sem conexão TikTok');

    const res = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: data.publishId }),
    });

    const json = await res.json() as {
      data: { status: string; fail_reason?: string; publicaly_available_post_id?: string[] };
    };

    return {
      ok: true as const,
      status: json.data?.status ?? 'PROCESSING',
      failReason: json.data?.fail_reason ?? null,
      postId: json.data?.publicaly_available_post_id?.[0] ?? null,
    };
  });
