import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const Input = z.object({
  clipId: z.string().uuid(),
  mode: z.enum(['face_track', 'center_crop']).default('face_track'),
});

export const reframeClip = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Não autenticado');

    const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/reframe-clip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });

    const json = await res.json() as { ok?: boolean; url?: string; predictionId?: string; error?: string };
    if (!res.ok) throw new Error(json.error ?? 'Falha no reframe');
    return { ok: true as const, url: json.url, predictionId: json.predictionId, async: !json.url };
  });
