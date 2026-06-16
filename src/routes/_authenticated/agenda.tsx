import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Loader2, Calendar as CalendarIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Corta.vc" }, { name: "robots", content: "noindex" }] }),
  component: AgendaPage,
});

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DOW = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];

const PLATFORMS: Record<string, { color: string; label: string }> = {
  youtube: { color: "#ff0033", label: "YouTube Shorts" },
  instagram: { color: "#d6249f", label: "Instagram Reels" },
  tiktok: { color: "#111111", label: "TikTok" },
  kwai: { color: "#ff5000", label: "Kwai" },
  linkedin: { color: "#0a66c2", label: "LinkedIn" },
};

type ScheduledPost = {
  id: string;
  platform: string;
  scheduled_for: string;
  status: string;
  clip: {
    title: string;
    project_id: string;
  } | null;
};

function AgendaPage() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('scheduled_posts')
        .select(`
          id,
          platform,
          scheduled_for,
          status,
          clip:clips(title, project_id)
        `)
        .order('scheduled_for', { ascending: true });

      setPosts((data ?? []) as any[]);
      setLoading(false);
    })();
  }, [cursor]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const lead = first.getDay();
    const arr: (number | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  function shift(d: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + d, 1));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-brand tracking-wider">Calendário</p>
          <h1 className="text-3xl font-extrabold mt-1">Agenda de publicação</h1>
          <p className="text-muted-foreground mt-1">Programe seus cortes nas redes — a IA adapta cada formato.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Sparkles className="w-4 h-4" /> Melhor horário (IA)</Button>
          <Button asChild>
            <Link to="/dashboard">
              <Plus className="w-4 h-4" /> Novo agendamento
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-8">
          <Card className="p-5 bg-surface-1 border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => shift(-1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => shift(1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-2">
              {DOW.map((d) => <div key={d} className="px-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                const dayPosts = d == null ? [] : posts.filter((p) => {
                  const date = new Date(p.scheduled_for);
                  return date.getDate() === d &&
                    date.getMonth() === cursor.getMonth() &&
                    date.getFullYear() === cursor.getFullYear();
                });

                return (
                  <div
                    key={i}
                    className={`min-h-24 rounded-md border border-border p-1.5 text-xs ${
                      d == null ? "bg-transparent border-transparent" : "bg-background"
                    }`}
                  >
                    {d != null && <div className="font-medium text-muted-foreground mb-1">{d}</div>}
                    <div className="space-y-1">
                      {dayPosts.map((p, j) => {
                        const platInfo = PLATFORMS[p.platform] ?? { color: "#111", label: p.platform };
                        const time = new Date(p.scheduled_for).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const title = p.clip?.title ?? "Sem título";
                        return (
                          <Link
                            key={j}
                            to={p.clip?.project_id ? "/projects/$id" : "/agenda"}
                            params={p.clip?.project_id ? { id: p.clip.project_id } : undefined}
                            className="block text-[10px] font-bold text-white px-1.5 py-0.5 rounded truncate hover:opacity-85 transition-opacity"
                            style={{ background: platInfo.color }}
                            title={`${platInfo.label} às ${time} - ${title}`}
                          >
                            {time} {title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 bg-surface-1 border-border h-fit">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Fila de publicação</h3>
              <span className="text-xs bg-brand/15 text-brand px-2 py-0.5 rounded-full font-bold">
                {posts.length} agendados
              </span>
            </div>
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum post agendado ainda.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {posts.map((p) => {
                  const platInfo = PLATFORMS[p.platform] ?? { color: "#111", label: p.platform };
                  const date = new Date(p.scheduled_for);
                  const formattedDate = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                  const title = p.clip?.title ?? "Sem título";

                  return (
                    <Link
                      key={p.id}
                      to={p.clip?.project_id ? "/projects/$id" : "/agenda"}
                      params={p.clip?.project_id ? { id: p.clip.project_id } : undefined}
                      className="flex items-center gap-3 p-2 rounded-md bg-background hover:bg-muted/30 transition-colors block"
                    >
                      <div className="w-10 h-10 rounded bg-surface-2 flex-shrink-0 flex items-center justify-center text-white" style={{ background: platInfo.color }}>
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{title}</p>
                        <p className="text-xs text-muted-foreground">{formattedDate} ({p.status})</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
