import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { projectId } = await req.json();
    if (!projectId) throw new Error('projectId obrigatório');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar auth
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error('Não autorizado');

    // Buscar projeto
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, user_id, source_url, source_type')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projErr || !project) throw new Error('Projeto não encontrado');
    if (project.source_type !== 'url' || !project.source_url) {
      throw new Error('Projeto não tem URL do YouTube');
    }

    await supabase.from('projects').update({ status: 'downloading', processing_error: null }).eq('id', projectId);

    // Baixar áudio com yt-dlp (apenas áudio m4a, evita limite de 25MB)
    const ytdlp = new Deno.Command('yt-dlp', {
      args: [
        '--no-playlist',
        '--format', 'bestaudio[ext=m4a]/bestaudio',
        '--max-filesize', '24m',
        '--output', '/tmp/audio.%(ext)s',
        project.source_url,
      ],
    });
    const { code, stderr } = await ytdlp.output();
    if (code !== 0) {
      const errMsg = new TextDecoder().decode(stderr);
      throw new Error(`yt-dlp falhou: ${errMsg.slice(0, 300)}`);
    }

    // Descobrir extensão gerada
    let audioPath = '/tmp/audio.m4a';
    try { await Deno.stat(audioPath); } catch { audioPath = '/tmp/audio.webm'; }

    const audioBytes = await Deno.readFile(audioPath);
    if (audioBytes.byteLength > 25 * 1024 * 1024) {
      throw new Error('Áudio extraído excede 25MB. Tente um vídeo mais curto.');
    }

    // Upload para Storage
    const storagePath = `${user.id}/${projectId}/${Date.now()}-audio.m4a`;
    const { error: uploadErr } = await supabase.storage
      .from('videos')
      .upload(storagePath, audioBytes, { contentType: 'audio/mp4', upsert: false });
    if (uploadErr) throw uploadErr;

    await supabase.from('projects').update({
      source_url: storagePath,
      source_type: 'upload',
      status: 'draft',
    }).eq('id', projectId);

    // Limpar arquivo temporário
    await Deno.remove(audioPath).catch(() => {});

    return new Response(JSON.stringify({ ok: true, path: storagePath }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
