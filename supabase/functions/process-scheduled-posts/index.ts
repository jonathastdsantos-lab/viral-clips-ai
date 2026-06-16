import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Verificar secret do cron
  const authHeader = req.headers.get('authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);

  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('id, clip_id, platform, user_id')
    .eq('status', 'scheduled')
    .lte('scheduled_for', fiveMinLater.toISOString());

  let published = 0;
  let failed = 0;

  for (const post of posts ?? []) {
    try {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'publishing' })
        .eq('id', post.id);

      // Aqui chamar a lógica de publicação real por plataforma
      // Por agora, marcar como publicado (integração real nos próximos prompts de plataforma)

      await supabase
        .from('scheduled_posts')
        .update({ status: 'published', published_at: now.toISOString() })
        .eq('id', post.id);

      await supabase
        .from('clips')
        .update({ status: 'published' })
        .eq('id', post.clip_id);

      published++;
    } catch (err) {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', error_message: String(err) })
        .eq('id', post.id);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, published, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
