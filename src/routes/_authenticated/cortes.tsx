import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Scissors, Download } from "lucide-react";

type Clip = {
  id: string;
  title: string;
  caption: string | null;
  viral_score: number | null;
  project_id: string;
  start_sec: number | null;
  end_sec: number | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/cortes")({
  head: () => ({ meta: [{ title: "Cortes — Corta.vc" }, { name: "robots", content: "noindex" }] }),
  component: CortesPage,
});

function fmtDur(s: number | null, e: number | null) {
  if (s == null || e == null) return "—";
  const d = Math.max(0, Math.round(e - s));
  return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`;
}

function scoreColor(s: number | null) {
  if (s == null) return "bg-muted text-muted-foreground";
  if (s >= 85) return "bg-emerald-500/20 text-emerald-400";
  if (s >= 70) return "bg-amber-500/20 text-amber-400";
  return "bg-muted text-muted-foreground";
}

function CortesPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clips")
        .select("id,title,caption,viral_score,project_id,start_sec,end_sec,created_at")
        .order("viral_score", { ascending: false, nullsFirst: false });
      setClips((data ?? []) as Clip[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <p className="text-xs font-bold uppercase text-brand tracking-wider">Último lote</p>
      <h1 className="text-3xl font-extrabold mt-1">Seus cortes</h1>
      <p className="text-muted-foreground mt-1">
        {clips.length} cortes · ordenados pela nota de viralização da IA
      </p>

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : clips.length === 0 ? (
          <Card className="p-12 text-center border-dashed bg-surface-1">
            <Scissors className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Nenhum corte ainda</h2>
            <p className="text-muted-foreground">
              Gere cortes a partir de um projeto para vê-los aqui.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {clips.map((c) => (
              <div key={c.id} className="relative">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(c.id);
                    else next.delete(c.id);
                    setSelected(next);
                  }}
                  className="absolute top-2.5 left-2.5 z-20 w-4 h-4 rounded accent-primary cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <Link
                  to="/projects/$id"
                  params={{ id: c.project_id }}
                  className="block group"
                >
                  <Card className="overflow-hidden bg-surface-1 border-border hover:border-primary/40 transition-colors">
                    <div className="aspect-[9/16] bg-gradient-to-br from-surface-2 to-surface-1 relative flex items-end p-3">
                      <Badge className={`absolute top-2 right-2 ${scoreColor(c.viral_score)}`}>
                        {c.viral_score ?? "—"}
                      </Badge>
                      <span className="absolute bottom-2 left-2 text-xs font-mono bg-black/60 text-white px-1.5 py-0.5 rounded">
                        {fmtDur(c.start_sec, c.end_sec)}
                      </span>
                      <p className="text-sm font-bold text-foreground line-clamp-3 relative z-10 pl-6">
                        {c.title}
                      </p>
                    </div>
                    {c.caption && (
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.caption}</p>
                      </div>
                    )}
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-foreground text-background px-5 py-3 rounded-full shadow-lg">
          <span className="text-sm font-medium">{selected.size} selecionados</span>
          <Button
            size="sm"
            variant="secondary"
            disabled={downloadingZip}
            onClick={async () => {
              setDownloadingZip(true);
              try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`${supabaseUrl}/functions/v1/download-clips-zip`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                  },
                  body: JSON.stringify({ clipIds: Array.from(selected) }),
                });
                if (!res.ok) throw new Error('Falha no download');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cortes-corta-vc-${Date.now()}.zip`;
                a.click();
                URL.revokeObjectURL(url);
                setSelected(new Set());
              } catch (e) {
                alert('Erro ao baixar ZIP. Verifique se os clips foram renderizados.');
              } finally {
                setDownloadingZip(false);
              }
            }}
          >
            {downloadingZip ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Baixar ZIP
          </Button>
          <button className="text-xs opacity-60 hover:opacity-100 cursor-pointer" onClick={() => setSelected(new Set())}>
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}
