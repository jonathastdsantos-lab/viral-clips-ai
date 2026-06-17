import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { publishToTikTok } from '@/lib/publish-tiktok.functions';

interface Props {
  clipId: string;
  defaultCaption?: string;
  hasOutputUrl: boolean;
}

export function TikTokPublishButton({ clipId, defaultCaption, hasOutputUrl }: Props) {
  const publish = useServerFn(publishToTikTok);
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState(defaultCaption ?? '');
  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    setPublishing(true);
    try {
      const result = await publish({ data: { clipId, caption: caption.trim() || undefined } });
      if (result.ok) {
        toast.success('Clip enviado para o TikTok! Pode levar alguns minutos para aparecer.');
        setOpen(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao publicar no TikTok');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasOutputUrl}
          title={!hasOutputUrl ? 'Renderize o clip antes de publicar' : 'Publicar no TikTok'}
          className="gap-1.5 text-xs"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.28 8.28 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/>
          </svg>
          TikTok
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publicar no TikTok</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm">Legenda / Caption</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              maxLength={2200}
              placeholder="Legenda do vídeo, hashtags..."
              className="mt-1 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {caption.length}/2200
            </p>
          </div>
          <div className="p-3 rounded-md bg-surface-2 text-xs text-muted-foreground">
            O vídeo será publicado como público. O processamento pelo TikTok pode levar de 1 a 5 minutos.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={publishing}>
            Cancelar
          </Button>
          <Button onClick={handlePublish} disabled={publishing}>
            {publishing
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Publicando…</>
              : 'Publicar agora'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
