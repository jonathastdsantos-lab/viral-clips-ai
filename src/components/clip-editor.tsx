import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Play, Pause, RotateCcw, Save, Scissors,
  Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─── helpers ─────────────────────────────────── */
function toSec(mmss: string): number {
  const parts = mmss.split(':').map(Number);
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  return Number(mmss) || 0;
}

function toMmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/* ─── types ───────────────────────────────────── */
interface ClipEditorProps {
  clipId: string;
  title: string;
  initialStart: number;
  initialEnd: number;
  videoUrl: string | null;       // output_url do projeto (vídeo original no Storage)
  outputUrl: string | null;      // clip já renderizado (se existir)
  onSaved: (start: number, end: number) => void;
}

/* ─── component ───────────────────────────────── */
export function ClipEditor({
  clipId,
  title,
  initialStart,
  initialEnd,
  videoUrl,
  outputUrl,
  onSaved,
}: ClipEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  /* Estado de abertura do painel */
  const [open, setOpen] = useState(false);

  /* Duração total do vídeo (detectada após o metadata carregar) */
  const [duration, setDuration] = useState<number>(
    initialEnd > 0 ? initialEnd + 60 : 300
  );

  /* Posição atual do playhead */
  const [currentTime, setCurrentTime] = useState(initialStart);
  const [playing, setPlaying] = useState(false);

  /* Valores do trim */
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  /* Inputs de texto mm:ss */
  const [startInput, setStartInput] = useState(toMmss(initialStart));
  const [endInput, setEndInput] = useState(toMmss(initialEnd));

  /* Saving state */
  const [saving, setSaving] = useState(false);

  /* Sincronizar o vídeo ao abrir o editor */
  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = start;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Atualizar playhead em tempo real */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function onTimeUpdate() {
      if (!video) return;
      setCurrentTime(video.currentTime);
      // Parar automaticamente ao chegar no ponto de fim
      if (video.currentTime >= end) {
        video.pause();
        video.currentTime = end;
        setPlaying(false);
      }
    }

    function onLoadedMetadata() {
      if (!video) return;
      setDuration(video.duration);
    }

    function onEnded() {
      setPlaying(false);
    }

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('ended', onEnded);
    };
  }, [end]);

  /* Play / Pause */
  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
      setPlaying(false);
    } else {
      if (video.currentTime >= end || video.currentTime < start) {
        video.currentTime = start;
      }
      video.play().catch(() => {});
      setPlaying(true);
    }
  }

  /* Seek pelo playhead (clique na timeline) */
  function seekTo(sec: number) {
    const video = videoRef.current;
    if (!video) return;
    const clamped = clamp(sec, 0, duration);
    video.currentTime = clamped;
    setCurrentTime(clamped);
  }

  /* Atualizar start via slider */
  function handleSliderChange([newStart, newEnd]: number[]) {
    const s = Math.min(newStart, newEnd - 1);
    const e = Math.max(newEnd, newStart + 1);
    setStart(s);
    setEnd(e);
    setStartInput(toMmss(s));
    setEndInput(toMmss(e));
    // Mover o vídeo para o novo ponto de início
    const video = videoRef.current;
    if (video && !playing) video.currentTime = s;
  }

  /* Atualizar start via input de texto */
  function commitStartInput() {
    const s = clamp(toSec(startInput), 0, end - 1);
    setStart(s);
    setStartInput(toMmss(s));
    seekTo(s);
  }

  function commitEndInput() {
    const e = clamp(toSec(endInput), start + 1, duration);
    setEnd(e);
    setEndInput(toMmss(e));
  }

  /* Preview: ir direto para o ponto de início e dar play */
  function previewClip() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = start;
    video.play().catch(() => {});
    setPlaying(true);
  }

  /* Resetar para valores originais */
  function reset() {
    setStart(initialStart);
    setEnd(initialEnd);
    setStartInput(toMmss(initialStart));
    setEndInput(toMmss(initialEnd));
    seekTo(initialStart);
  }

  /* Salvar no Supabase */
  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('clips')
      .update({ start_sec: start, end_sec: end })
      .eq('id', clipId);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success('Corte atualizado!');
      onSaved(start, end);
    }
  }

  /* Porcentagem do playhead na timeline */
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const startPct = duration > 0 ? (start / duration) * 100 : 0;
  const endPct = duration > 0 ? (end / duration) * 100 : 0;
  const clipDuration = end - start;

  return (
    <div className="mt-3 rounded-lg border border-border overflow-hidden">
      {/* ── Header toggle ── */}
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-2 hover:bg-surface-1 transition-colors text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-primary" />
          Editar corte
          <span className="text-muted-foreground font-normal text-xs">
            {toMmss(start)} → {toMmss(end)}
            <span className="ml-1.5 text-primary font-medium">({toMmss(clipDuration)})</span>
          </span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-background">

          {/* ── Player de vídeo ── */}
          {videoUrl ? (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                preload="metadata"
                playsInline
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />

              {/* Overlay de controles */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                >
                  {playing
                    ? <Pause className="w-5 h-5" />
                    : <Play className="w-5 h-5 ml-0.5" />
                  }
                </button>
              </div>

              {/* Tempo atual */}
              <div className="absolute bottom-2 left-2 text-xs font-mono bg-black/70 text-white px-2 py-0.5 rounded">
                {toMmss(currentTime)} / {toMmss(duration)}
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-surface-2 aspect-video flex items-center justify-center">
              <p className="text-xs text-muted-foreground">
                Faça upload do vídeo para ver o preview
              </p>
            </div>
          )}

          {/* ── Timeline visual ── */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Timeline</Label>

            {/* Barra de timeline clicável */}
            <div
              className="relative h-8 rounded-md bg-surface-2 cursor-pointer select-none overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                seekTo(pct * duration);
              }}
            >
              {/* Região selecionada (zona do corte) */}
              <div
                className="absolute top-0 bottom-0 bg-primary/20 border-x-2 border-primary"
                style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
              />

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow"
                style={{ left: `${playheadPct}%` }}
              />

              {/* Marcadores de início e fim */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary rounded-l cursor-ew-resize"
                style={{ left: `${startPct}%` }}
                title="Início do corte"
              />
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary rounded-r cursor-ew-resize"
                style={{ left: `calc(${endPct}% - 4px)` }}
                title="Fim do corte"
              />
            </div>

            {/* Slider duplo de range */}
            <Slider
              min={0}
              max={Math.ceil(duration)}
              step={0.5}
              value={[start, end]}
              onValueChange={handleSliderChange}
              className="mt-1"
            />
          </div>

          {/* ── Inputs de tempo precisos ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Início (mm:ss)</Label>
              <Input
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                onBlur={commitStartInput}
                onKeyDown={(e) => e.key === 'Enter' && commitStartInput()}
                placeholder="0:00"
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fim (mm:ss)</Label>
              <Input
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                onBlur={commitEndInput}
                onKeyDown={(e) => e.key === 'Enter' && commitEndInput()}
                placeholder="1:00"
                className="mt-1 font-mono text-sm"
              />
            </div>
          </div>

          {/* ── Duração calculada ── */}
          <div className="flex items-center justify-between px-3 py-2 rounded-md bg-surface-2 text-xs">
            <span className="text-muted-foreground">Duração do corte</span>
            <span className={`font-bold font-mono ${clipDuration < 5 ? 'text-destructive' : clipDuration > 90 ? 'text-amber-400' : 'text-primary'}`}>
              {toMmss(clipDuration)}
              {clipDuration < 5 && ' — muito curto'}
              {clipDuration > 90 && ' — acima de 90s (recomendado ≤ 90s)'}
            </span>
          </div>

          {/* ── Ações ── */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={previewClip}
              disabled={!videoUrl}
            >
              <Play className="w-3 h-3" /> Preview do corte
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs text-muted-foreground"
              onClick={reset}
            >
              <RotateCcw className="w-3 h-3" /> Restaurar original
            </Button>

            <Button
              size="sm"
              className="gap-1.5 text-xs ml-auto"
              onClick={save}
              disabled={saving || (start === initialStart && end === initialEnd)}
            >
              {saving
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Salvando…</>
                : <><Save className="w-3 h-3" /> Salvar corte</>
              }
            </Button>
          </div>

          {/* Aviso se há output_url que será invalidado */}
          {outputUrl && (start !== initialStart || end !== initialEnd) ? (
            <p className="text-xs text-amber-400 flex items-center gap-1">
              ⚠ Você tem um clip renderizado. Ao salvar, será necessário re-renderizar para aplicar o novo corte.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
