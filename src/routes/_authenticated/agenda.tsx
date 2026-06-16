import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Corta.vc" }, { name: "robots", content: "noindex" }] }),
  component: AgendaPage,
});

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DOW = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];

type Slot = { day: number; time: string; platform: string; color: string; title: string };

const SEED: Slot[] = [
  { day: 9, time: "18:00", platform: "tiktok", color: "#111", title: "O segredo de quem nunca desiste" },
  { day: 9, time: "20:30", platform: "instagram", color: "#d6249f", title: "Pare de fazer isso com seu dinheiro" },
  { day: 11, time: "12:00", platform: "youtube", color: "#ff0033", title: "A virada que ninguém te conta" },
  { day: 12, time: "19:15", platform: "tiktok", color: "#111", title: "O clutch mais insano do campeonato" },
  { day: 15, time: "09:00", platform: "instagram", color: "#d6249f", title: "Coragem de recomeçar do zero" },
  { day: 15, time: "21:00", platform: "kwai", color: "#ff5000", title: "Energia nova" },
  { day: 18, time: "17:30", platform: "youtube", color: "#ff0033", title: "Você ainda não viu isso" },
  { day: 22, time: "08:30", platform: "linkedin", color: "#0a66c2", title: "Mentalidade pra começar a semana" },
];

function AgendaPage() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

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
          <Button><Plus className="w-4 h-4" /> Agendar corte</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-8">
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
              const slots = d == null ? [] : SEED.filter((s) => s.day === d);
              return (
                <div
                  key={i}
                  className={`min-h-24 rounded-md border border-border p-1.5 text-xs ${
                    d == null ? "bg-transparent border-transparent" : "bg-background"
                  }`}
                >
                  {d != null && <div className="font-medium text-muted-foreground mb-1">{d}</div>}
                  <div className="space-y-1">
                    {slots.map((s, j) => (
                      <div
                        key={j}
                        className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded truncate"
                        style={{ background: s.color }}
                        title={s.title}
                      >
                        {s.time}
                      </div>
                    ))}
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
              {SEED.length} agendados
            </span>
          </div>
          <div className="space-y-3">
            {SEED.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-background">
                <div className="w-10 h-10 rounded bg-surface-2 flex-shrink-0" style={{ background: s.color }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{String(s.day).padStart(2, "0")}/{String(cursor.getMonth()+1).padStart(2,"0")} · {s.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
