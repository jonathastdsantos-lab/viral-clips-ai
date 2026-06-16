import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { zip } from 'https://esm.sh/fflate@0.8.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { clipIds } = await req.json() as { clipIds: string[] };
    if (!clipIds?.length) throw new Error('clipIds obrigatório');
    if (clipIds.length > 20) throw new Error('Máximo 20 clips por download');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error('Não autorizado');

    const { data: clips } = await supabase
      .from('clips')
      .select('id, title, output_url')
      .in('id', clipIds)
      .eq('user_id', user.id)
      .not('output_url', 'is', null);

    if (!clips?.length) throw new Error('Nenhum clip renderizado encontrado');

    const files: Record<string, Uint8Array> = {};

    await Promise.all(clips.map(async (clip) => {
      const res = await fetch(clip.output_url!);
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      const safeName = clip.title.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').slice(0, 60).trim();
      files[`${safeName || clip.id}.mp4`] = new Uint8Array(buf);
    }));

    const zipped = await new Promise<Uint8Array>((resolve, reject) => {
      zip(files, { level: 0 }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    return new Response(zipped, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="cortes-corta-vc-${Date.now()}.zip"`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
