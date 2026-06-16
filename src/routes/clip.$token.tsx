import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Flame } from 'lucide-react';

export const Route = createFileRoute('/clip/$token')({
  head: () => ({ meta: [{ title: 'Corte — Corta.vc' }] }),
  component: PublicClipPage,
});

type Clip = {
  id: string;
  title: string;
  caption: string | null;
  hashtags: string[] | null;
  viral_score: number | null;
  output_url: string | null;
};

function PublicClipPage() {
  const { token } = Route.useParams();
  const [clip, setClip] = useState<Clip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('clips')
        .select('id, title, caption, hashtags, viral_score, output_url')
        .eq('share_token', token)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setClip(data as Clip);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !clip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <p className="text-2xl font-bold">Clip não encontrado</p>
        <p className="text-muted-foreground">O link pode ter expirado ou sido removido.</p>
        <a href="/" className="text-primary underline text-sm">Ir para o Corta.vc</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <a href="/" className="text-xl font-extrabold viral-text">Corta.vc</a>
          <p className="text-xs text-muted-foreground mt-1">Compartilhado via Corta.vc</p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-border bg-surface-1">
          {clip.output_url ? (
            <video
              src={clip.output_url}
              controls
              playsInline
              className="w-full aspect-[9/16] bg-black object-contain"
            />
          ) : (
            <div className="aspect-[9/16] bg-surface-2 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Vídeo não renderizado</p>
            </div>
          )}

          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h1 className="font-bold text-lg leading-tight">{clip.title}</h1>
              {clip.viral_score != null && (
                <span className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full shrink-0">
                  <Flame className="w-3 h-3" /> {clip.viral_score}
                </span>
              )}
            </div>
            {clip.caption && <p className="text-sm text-muted-foreground mb-3">{clip.caption}</p>}
            {clip.hashtags && clip.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {clip.hashtags.map((h) => (
                  <span key={h} className="text-xs text-primary">#{h.replace(/^#/, '')}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Crie seus próprios cortes virais em <a href="/" className="text-primary underline">corta.vc</a>
        </p>
      </div>
    </div>
  );
}
