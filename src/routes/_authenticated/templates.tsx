import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Templates — Corta.vc" }, { name: "robots", content: "noindex" }] }),
  component: TemplatesPage,
});

const TABS = ["Estilos de legenda", "Enquadramentos", "Por nicho", "Formatos"] as const;

const STYLES = [
  { id: "impacto", name: "Impacto", sub: "CAIXA ALTA", words: ["ISSO", "É", "VIRAL"], hl: "#ffe14d", upper: true },
  { id: "clean", name: "Clean", sub: "Normal", words: ["isso", "é", "viral"], hl: "#ffffff", upper: false },
  { id: "karaoke", name: "Karaokê", sub: "Karaokê", words: ["isso", "é", "viral"], hl: "#22c55e", upper: false },
  { id: "minimal", name: "Minimal", sub: "Normal", words: ["isso", "é", "viral"], hl: "#ef4444", upper: false },
  { id: "neon", name: "Neon", sub: "CAIXA ALTA", words: ["ISSO", "É", "VIRAL"], hl: "#22d3ee", upper: true, glow: true },
  { id: "faixa", name: "Faixa", sub: "CAIXA ALTA", words: ["ISSO", "É", "VIRAL"], hl: "#ffffff", upper: true, banner: true },
];

function TemplatesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Estilos de legenda");

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-brand tracking-wider">Biblioteca</p>
          <h1 className="text-3xl font-extrabold mt-1">Templates</h1>
          <p className="text-muted-foreground mt-1">
            Comece de um estilo pronto ou crie o seu. Tudo é editável.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === t ? "bg-foreground text-background" : "bg-surface-1 text-foreground hover:bg-surface-2"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-8">
        {STYLES.map((s) => (
          <Card key={s.id} className="overflow-hidden bg-surface-1 border-border hover:border-primary/40 transition-colors cursor-pointer">
            <div className="aspect-[9/16] bg-[#0c0c10] flex items-center justify-center p-4 relative">
              <div className={`text-center ${s.upper ? "uppercase" : ""} font-extrabold text-white text-xl leading-tight`}>
                {s.words.map((w, i) => {
                  const isHl = i === 2;
                  if (s.banner && isHl) {
                    return (
                      <span key={i} className="inline-block px-2 py-0.5 ml-1" style={{ background: "hsl(var(--brand))" }}>
                        {w}
                      </span>
                    );
                  }
                  return (
                    <span key={i} style={isHl ? { color: s.hl, textShadow: s.glow ? `0 0 12px ${s.hl}` : undefined } : undefined}>
                      {i > 0 ? " " : ""}{w}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-bold">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
