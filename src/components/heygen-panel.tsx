import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, User, Download } from 'lucide-react';
import { toast } from 'sonner';
import { listHeyGenAvatars } from '@/lib/heygen-avatars.functions';
import { generateHeyGenVideo } from '@/lib/generate-heygen-video.functions';

interface Avatar {
  id: string;
  name: string;
  previewImage: string;
  previewVideo: string;
  gender: string;
}

interface Props {
  clipId: string;
  clipTitle: string;
  clipCaption: string | null;
  existingVideoUrl: string | null;
  heygenStatus: string | null;
}

export function HeyGenPanel({ clipId, clipTitle, clipCaption, existingVideoUrl, heygenStatus }: Props) {
  const fetchAvatars = useServerFn(listHeyGenAvatars);
  const generate = useServerFn(generateHeyGenVideo);

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [script, setScript] = useState(clipCaption ?? clipTitle);
  const [generating, setGenerating] = useState(heygenStatus === 'generating' || heygenStatus === 'processing');
  const [videoUrl, setVideoUrl] = useState(existingVideoUrl);

  useEffect(() => {
    (async () => {
      setLoadingAvatars(true);
      try {
        const result = await fetchAvatars();
        setAvatars(result.avatars);
        if (result.avatars[0]) setSelectedAvatar(result.avatars[0].id);
      } catch (e) {
        toast.error('Erro ao carregar avatares HeyGen');
      } finally {
        setLoadingAvatars(false);
      }
    })();
  }, []);

  async function handleGenerate() {
    if (!selectedAvatar || !script.trim()) return;
    setGenerating(true);
    try {
      const result = await generate({ data: { clipId, avatarId: selectedAvatar, script: script.trim() } });
      setVideoUrl(result.url);
      toast.success('Vídeo com avatar gerado!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro no HeyGen');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mt-4 p-4 rounded-lg border border-border bg-background space-y-4">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Avatar IA (HeyGen)</span>
        <span className="text-xs text-muted-foreground">— apresentador virtual em PT-BR</span>
      </div>

      {loadingAvatars ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Carregando avatares…
        </div>
      ) : (
        <div>
          <Label className="text-xs text-muted-foreground">Escolher avatar</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {avatars.slice(0, 8).map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAvatar(a.id)}
                className={`rounded-lg overflow-hidden border-2 text-left transition-colors ${
                  selectedAvatar === a.id ? 'border-primary bg-primary/5' : 'border-transparent bg-surface-2'
                }`}
              >
                <img
                  src={a.previewImage}
                  alt={a.name}
                  className="w-full aspect-square object-cover"
                />
                <p className="text-[10px] text-center py-1 truncate px-1">{a.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs text-muted-foreground">Script (o que o avatar vai falar)</Label>
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={5}
          maxLength={1500}
          className="mt-1 text-sm"
          placeholder="Texto que o avatar irá apresentar em PT-BR…"
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">{script.length}/1500</p>
      </div>

      <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground">
        O vídeo demora 1–3 minutos para ser gerado. Não feche a página.
      </div>

      <Button
        className="w-full"
        size="sm"
        disabled={generating || !selectedAvatar || !script.trim()}
        onClick={handleGenerate}
      >
        {generating ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin mr-2" /> Gerando apresentador…
          </>
        ) : (
          'Gerar vídeo com apresentador'
        )}
      </Button>

      {videoUrl && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Vídeo gerado</Label>
          <video src={videoUrl} controls className="w-full rounded-md aspect-[9/16] bg-black" />
          <a
            href={videoUrl}
            download
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Download className="w-3 h-3" /> Baixar apresentador HeyGen
          </a>
        </div>
      )}
    </div>
  );
}
