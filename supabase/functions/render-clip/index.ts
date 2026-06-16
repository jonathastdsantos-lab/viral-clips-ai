import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { clipId } = await req.json();
    if (!clipId) throw new Error('clipId obrigatório');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error('Não autorizado');

    // Buscar clip + projeto
    const { data: clip, error: clipErr } = await supabase
      .from('clips')
      .select('id, user_id, project_id, start_sec, end_sec, title, status')
      .eq('id', clipId)
      .eq('user_id', user.id)
      .single();
    if (clipErr || !clip) throw new Error('Clip não encontrado');

    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('source_url, source_type')
      .eq('id', clip.project_id)
      .eq('user_id', user.id)
      .single();
    if (projErr || !project) throw new Error('Projeto não encontrado');
    if (!project.source_url || project.source_type !== 'upload') {
      throw new Error('Projeto sem arquivo de vídeo. Faça upload ou baixe o áudio do YouTube primeiro.');
    }

    await supabase.from('clips').update({ status: 'rendering' }).eq('id', clipId);

    // Baixar vídeo original do Storage
    const { data: videoBlob, error: dlErr } = await supabase.storage
      .from('videos')
      .download(project.source_url);
    if (dlErr || !videoBlob) throw new Error('Falha ao baixar vídeo: ' + dlErr?.message);

    const videoBytes = new Uint8Array(await videoBlob.arrayBuffer());
    const ext = project.source_url.split('.').pop() ?? 'mp4';
    const inputPath = `/tmp/input_${clipId}.${ext}`;
    const outputPath = `/tmp/clip_${clipId}.mp4`;

    await Deno.writeFile(inputPath, videoBytes);

    const startSec = Number(clip.start_sec ?? 0);
    const endSec = Number(clip.end_sec ?? startSec + 60);
    const duration = Math.max(1, endSec - startSec);

    // Cortar com ffmpeg — formato vertical 9:16 para Shorts/Reels/TikTok
    const ffmpeg = new Deno.Command('ffmpeg', {
      args: [
        '-y',
        '-ss', String(startSec),
        '-t', String(duration),
        '-i', inputPath,
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputPath,
      ],
    });

    const { code, stderr } = await ffmpeg.output();
    if (code !== 0) {
      const errMsg = new TextDecoder().decode(stderr);
      throw new Error(`ffmpeg falhou: ${errMsg.slice(-400)}`);
    }

    const clipBytes = await Deno.readFile(outputPath);
    const storagePath = `${user.id}/${clip.project_id}/clips/${clipId}.mp4`;

    const { error: uploadErr } = await supabase.storage
      .from('videos')
      .upload(storagePath, clipBytes, { contentType: 'video/mp4', upsert: true });
    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(storagePath);

    await supabase.from('clips').update({
      output_url: publicUrl,
      status: 'ready',
    }).eq('id', clipId);

    // Limpar temporários
    await Promise.all([
      Deno.remove(inputPath).catch(() => {}),
      Deno.remove(outputPath).catch(() => {}),
    ]);

    return new Response(JSON.stringify({ ok: true, url: publicUrl }), {
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
