import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const Input = z.object({ projectId: z.string().uuid() });

export const downloadYoutube = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Não autenticado');

    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) throw new Error('SUPABASE_URL ausente');

    const res = await fetch(`${supabaseUrl}/functions/v1/download-youtube`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ projectId: data.projectId }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Falha no download');
    return { ok: true as const };
  });
