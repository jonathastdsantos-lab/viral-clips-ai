import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Eye } from 'lucide-react';

function toMmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface ClipPreviewDialogProps {
  videoUrl: string | null;
  outputUrl?: string | null;
  start: number;
  end: number;
  title: string;
}

export function ClipPreviewDialog({ videoUrl, outputUrl, start, end, title }: ClipPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(start);

  // Se houver clip renderizado, usar ele (sem trim). Senão, usar o original com trim.
  const useRendered = !!outputUrl;
  const src = outputUrl ?? videoUrl;

  useEffect(() => {
    if (!open) return;
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      v.currentTime = useRendered ? 0 : start;
      v.play().catch(() => {});
      setPlaying(true);
    };
    const onTime = () => {
      setCurrent(v.currentTime);
      if (!useRendered && v.currentTime >= end) {
        v.pause();
        v.currentTime = end;
        setPlaying(false);
      }
    };
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    if (v.readyState >= 1) onLoaded();
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
      v.pause();
    };
  }, [open, start, end, useRendered]);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      if (!useRendered && (v.currentTime >= end || v.currentTime < start)) v.currentTime = start;
      v.play().catch(() => {});
      setPlaying(true);
    }
  }

  function restart() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = useRendered ? 0 : start;
    v.play().catch(() => {});
    setPlaying(true);
  }

  const duration = end - start;
  const elapsed = useRendered ? current : Math.max(0, current - start);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1"
        onClick={() => setOpen(true)}
        disabled={!src}
        title={!src ? 'Envie o vídeo para ver a prévia' : 'Ver prévia do corte'}
      >
        <Eye className="w-3 h-3" /> Ver prévia
      </Button>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm truncate">
            {useRendered ? 'Prévia do corte renderizado' : 'Prévia do corte (vídeo original)'} — {title}
          </DialogTitle>
        </DialogHeader>

        {src ? (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                src={src}
                className="w-full h-full object-contain"
                playsInline
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
              <div className="absolute bottom-2 left-2 text-xs font-mono bg-black/70 text-white px-2 py-0.5 rounded">
                {toMmss(elapsed)} / {toMmss(duration)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={toggle}>
                {playing ? <><Pause className="w-3 h-3" /> Pausar</> : <><Play className="w-3 h-3" /> Tocar</>}
              </Button>
              <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={restart}>
                <RotateCcw className="w-3 h-3" /> Reiniciar
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {useRendered ? 'Vídeo final (9:16)' : `Corte: ${toMmss(start)} → ${toMmss(end)}`}
              </span>
            </div>

            {!useRendered && (
              <p className="text-xs text-muted-foreground">
                Esta prévia toca o vídeo original entre o início e o fim do corte. Renderize para gerar o vídeo final em 9:16.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Faça upload do vídeo do projeto para ver a prévia.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
