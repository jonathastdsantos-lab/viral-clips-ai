import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { clipId, voiceId, script } = await req.json() as {
      clipId: string;
      voiceId: string;
      script: string;
    };

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error('Não autorizado');

    await supabase.from('clips').update({ narration_status: 'generating' }).eq('id', clipId);

    const elevenKey = Deno.env.get('ELEVENLABS_API_KEY')!;

    // Gerar áudio com ElevenLabs
    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
        }),
      }
    );

    if (!ttsRes.ok) throw new Error(`ElevenLabs TTS error: ${ttsRes.status}`);
    const audioBuffer = await ttsRes.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    await Deno.writeFile('/tmp/narration.mp3', audioBytes);

    // Criar vídeo vertical 1080x1920 com fundo preto + ondas de áudio simuladas via ffmpeg
    const ffmpeg = new Deno.Command('ffmpeg', {
      args: [
        '-y',
        '-f', 'lavfi',
        '-i', 'color=c=black:s=1080x1920:r=30',
        '-i', '/tmp/narration.mp3',
        '-filter_complex',
        '[0:v][1:a]showwaves=s=1080x400:mode=cline:colors=white@0.8[wave];[0:v][wave]overlay=0:760[v]',
        '-map', '[v]',
        '-map', '1:a',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        '-movflags', '+faststart',
        '/tmp/narration_output.mp4',
      ],
    });

    const { code, stderr } = await ffmpeg.output();
    if (code !== 0) {
      const errMsg = new TextDecoder().decode(stderr);
      throw new Error(`ffmpeg narration error: ${errMsg.slice(-300)}`);
    }

    const outputBytes = await Deno.readFile('/tmp/narration_output.mp4');
    const storagePath = `${user.id}/${clipId}/narration-${Date.now()}.mp4`;

    const { error: uploadErr } = await supabase.storage
      .from('videos')
      .upload(storagePath, outputBytes, { contentType: 'video/mp4', upsert: true });
    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(storagePath);

    await supabase.from('clips').update({
      narration_url: publicUrl,
      narration_voice_id: voiceId,
      narration_status: 'ready',
    }).eq('id', clipId);

    await Promise.all([
      Deno.remove('/tmp/narration.mp3').catch(() => {}),
      Deno.remove('/tmp/narration_output.mp4').catch(() => {}),
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
