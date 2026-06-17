import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const Input = z.object({
  clipId: z.string().uuid(),
  voiceId: z.string(),
  script: z.string().min(10).max(5000),
});

export const generateNarration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Não autenticado');

    const supabaseUrl = process.env.SUPABASE_URL;
    const res = await fetch(`${supabaseUrl}/functions/v1/generate-narration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const json = await res.json() as { ok?: boolean; url?: string; error?: string };
    if (!res.ok) throw new Error(json.error ?? 'Falha na narração');
    return { ok: true as const, url: json.url! };
  });
