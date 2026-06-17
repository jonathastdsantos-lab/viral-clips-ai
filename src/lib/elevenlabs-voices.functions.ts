import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const listElevenLabsVoices = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY não configurada.');

    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`);

    const json = await res.json() as {
      voices: Array<{
        voice_id: string;
        name: string;
        labels: Record<string, string>;
        preview_url: string;
      }>;
    };

    // Filtrar vozes em PT-BR primeiro, depois inglês
    const ptVoices = json.voices.filter(
      (v) => v.labels?.language === 'pt' || v.labels?.accent === 'brazilian'
    );
    const others = json.voices.filter(
      (v) => v.labels?.language !== 'pt' && v.labels?.accent !== 'brazilian'
    ).slice(0, 10);

    return {
      ok: true as const,
      voices: [
        ...ptVoices,
        ...others,
      ].map((v) => ({
        id: v.voice_id,
        name: v.name,
        language: v.labels?.language ?? 'en',
        accent: v.labels?.accent ?? '',
        previewUrl: v.preview_url,
      })),
    };
  });
