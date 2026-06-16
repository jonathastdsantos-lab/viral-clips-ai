import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Scissors } from "lucide-react";

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
              <Link
                key={c.id}
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
                    <p className="text-sm font-bold text-foreground line-clamp-3 relative z-10">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
