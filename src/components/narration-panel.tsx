import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mic, Play, Download } from 'lucide-react';
import { toast } from 'sonner';
import { listElevenLabsVoices } from '@/lib/elevenlabs-voices.functions';
import { generateNarration } from '@/lib/generate-narration.functions';

interface Voice {
  id: string;
  name: string;
  language: string;
  accent: string;
  previewUrl: string;
}

interface Props {
  clipId: string;
  clipTitle: string;
  clipCaption: string | null;
  existingNarrationUrl: string | null;
  narrationStatus: string | null;
}

export function NarrationPanel({ clipId, clipTitle, clipCaption, existingNarrationUrl, narrationStatus }: Props) {
  const fetchVoices = useServerFn(listElevenLabsVoices);
  const generate = useServerFn(generateNarration);

  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [script, setScript] = useState(clipCaption ?? clipTitle);
  const [generating, setGenerating] = useState(narrationStatus === 'generating');
  const [narrationUrl, setNarrationUrl] = useState(existingNarrationUrl);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingVoices(true);
      try {
        const result = await fetchVoices();
        setVoices(result.voices);
        const ptVoice = result.voices.find((v) => v.language === 'pt' || v.accent === 'brazilian');
        if (ptVoice) setSelectedVoice(ptVoice.id);
        else if (result.voices[0]) setSelectedVoice(result.voices[0].id);
      } catch (e) {
        toast.error('Erro ao carregar vozes');
      } finally {
        setLoadingVoices(false);
      }
    })();
  }, []);

  function previewVoice() {
    const voice = voices.find((v) => v.id === selectedVoice);
    if (!voice?.previewUrl) return;
    if (previewAudio) previewAudio.pause();
    const audio = new Audio(voice.previewUrl);
    setPreviewAudio(audio);
    audio.play();
  }

  async function handleGenerate() {
    if (!selectedVoice || !script.trim()) return;
    setGenerating(true);
    try {
      const result = await generate({ data: { clipId, voiceId: selectedVoice, script: script.trim() } });
      setNarrationUrl(result.url);
      toast.success('Narração gerada com sucesso!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro na narração');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mt-4 p-4 rounded-lg border border-border bg-background space-y-4">
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Narração IA (ElevenLabs)</span>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Script da narração</Label>
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={4}
          maxLength={5000}
          className="mt-1 text-sm"
          placeholder="Texto que será narrado em voz..."
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">{script.length}/5000</p>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Voz</Label>
        <div className="flex gap-2 mt-1">
          {loadingVoices ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Carregando vozes…
            </div>
          ) : (
            <>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="flex-1 text-sm">
                  <SelectValue placeholder="Escolher voz" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-sm">
                      {v.name}
                      {(v.language === 'pt' || v.accent === 'brazilian') && (
                        <span className="ml-1 text-xs text-primary">🇧🇷</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={previewVoice} disabled={!selectedVoice} title="Ouvir prévia">
                <Play className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Button
        size="sm"
        className="w-full"
        disabled={generating || !selectedVoice || !script.trim()}
        onClick={handleGenerate}
      >
        {generating
          ? <><Loader2 className="w-3 h-3 animate-spin" /> Gerando narração…</>
          : <><Mic className="w-3 h-3" /> Gerar narração</>
        }
      </Button>

      {narrationUrl && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Narração gerada</Label>
          <video src={narrationUrl} controls className="w-full rounded-md aspect-[9/16] bg-black" />
          <a
            href={narrationUrl}
            download
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Download className="w-3 h-3" /> Baixar narração
          </a>
        </div>
      )}
    </div>
  );
}
