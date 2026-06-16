import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-corta-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function getUserFromApiKey(supabase: ReturnType<typeof createClient>, apiKey: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('user_id, id')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single();

  if (error || !keyData) return null;

  // Atualizar last_used_at
  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id);

  return keyData.user_id as string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const apiKey = req.headers.get('x-corta-api-key');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'X-Corta-API-Key header obrigatório' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = await getUserFromApiKey(supabase, apiKey);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Chave de API inválida ou revogada' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/functions/v1/api-v1', '');

  // GET /projects — listar projetos
  if (req.method === 'GET' && path === '/projects') {
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, status, created_at, source_type, duration_sec')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ data, count: data?.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // GET /projects/:id/clips
  const clipsMatch = path.match(/^\/projects\/([0-9a-f-]+)\/clips$/);
  if (req.method === 'GET' && clipsMatch) {
    const projectId = clipsMatch[1];
    const { data, error } = await supabase
      .from('clips')
      .select('id, title, caption, hashtags, viral_score, start_sec, end_sec, status, output_url, created_at')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('viral_score', { ascending: false });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // POST /projects — criar projeto via API
  if (req.method === 'POST' && path === '/projects') {
    const body = await req.json() as { title: string; source_url?: string };
    if (!body.title) {
      return new Response(JSON.stringify({ error: 'title obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        title: body.title,
        source_url: body.source_url ?? null,
        source_type: body.source_url ? 'url' : 'upload',
        status: 'draft',
      })
      .select('id, title, status, created_at')
      .single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ data }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: `Rota não encontrada: ${req.method} ${path}` }), {
    status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
