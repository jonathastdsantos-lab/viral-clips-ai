import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Eye, Scissors, Send, Clock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analises")({
  head: () => ({ meta: [{ title: "Análises — Corta.vc" }, { name: "robots", content: "noindex" }] }),
  component: AnalisesPage,
});

type TopClip = { id: string; title: string; viral_score: number | null };

function AnalisesPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ clips: 0, projects: 0, published: 0 });
  const [top, setTop] = useState<TopClip[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: clips }, { count: projects }] = await Promise.all([
        supabase.from("clips").select("id,title,viral_score,status").order("viral_score", { ascending: false, nullsFirst: false }).limit(50),
        supabase.from("projects").select("*", { count: "exact", head: true }),
      ]);
      const allClips = clips ?? [];
      const published = allClips.filter((c) => c.status === "published").length;
      setStats({ clips: allClips.length, projects: projects ?? 0, published });
      setTop(allClips.slice(0, 5) as TopClip[]);
      setLoading(false);
    })();
  }, []);

  const bars = [40, 55, 32, 60, 70, 95, 100, 65, 70, 55, 50, 78, 60];

  const kpis = [
    { icon: Eye, label: "Visualizações (30d)", value: "2,4M", delta: "+38%" },
    { icon: Scissors, label: "Cortes criados", value: String(stats.clips), delta: `+${stats.clips}` },
    { icon: Send, label: "Publicados", value: String(stats.published), delta: `+${stats.published}` },
    { icon: Clock, label: "Horas economizadas", value: "47h", delta: "+9h" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <p className="text-xs font-bold uppercase text-brand tracking-wider">Últimos 30 dias</p>
      <h1 className="text-3xl font-extrabold mt-1">Análises</h1>
      <p className="text-muted-foreground mt-1">Como seus cortes estão performando nas redes.</p>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
            {kpis.map((k) => (
              <Card key={k.label} className="p-4 bg-surface-1 border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <k.icon className="w-4 h-4" /> {k.label}
                </div>
                <div className="mt-2 text-3xl font-extrabold">{k.value}</div>
                <div className="text-xs text-emerald-400 font-bold mt-1">↑ {k.delta}</div>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <Card className="p-5 bg-surface-1 border-border">
              <h3 className="font-bold mb-4">Visualizações por semana</h3>
              <div className="flex items-end gap-2 h-48">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${h}%`,
                      background: i === 6 ? "hsl(var(--brand))" : "hsl(var(--muted))",
                    }}
                  />
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-surface-1 border-border">
              <h3 className="font-bold mb-4">Melhores cortes</h3>
              <div className="space-y-3">
                {top.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum corte ainda.</p>
                ) : top.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="text-muted-foreground font-bold w-6">{i + 1}</div>
                    <div className="w-10 h-10 rounded bg-surface-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{Math.floor(Math.random() * 100 + 20)}k views</p>
                    </div>
                    <div className="text-xs font-bold rounded-full w-9 h-9 flex items-center justify-center border-2 border-emerald-500/40 text-emerald-400">
                      {c.viral_score ?? "—"}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
