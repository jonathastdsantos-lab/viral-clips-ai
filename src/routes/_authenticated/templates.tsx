import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CAPTION_STYLES } from "@/lib/caption-styles";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Templates — Corta.vc" }, { name: "robots", content: "noindex" }] }),
  component: TemplatesPage,
});

const TABS = ["Estilos de legenda", "Enquadramentos", "Por nicho", "Formatos"] as const;

const ENQUADRAMENTOS = [
  { id: "vertical", name: "Vertical", sub: "9:16 · TikTok / Reels / Shorts", ratio: "aspect-[9/16]", label: "1080×1920" },
  { id: "quadrado", name: "Quadrado", sub: "1:1 · Feed Instagram", ratio: "aspect-square", label: "1080×1080" },
  { id: "horizontal", name: "Horizontal", sub: "16:9 · YouTube", ratio: "aspect-video", label: "1920×1080" },
];

function TemplatesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Estilos de legenda");
  const [selectedStyle, setSelectedStyle] = useState<string>(
    () => localStorage.getItem("defaultCaptionStyle") ?? "karaoke"
  );
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  function selectStyle(id: string) {
    setSelectedStyle(id);
    localStorage.setItem("defaultCaptionStyle", id);
    setSavedFeedback(id);
    setTimeout(() => setSavedFeedback(null), 2000);
  }

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

      {/* Estilos de legenda reais */}
      {tab === "Estilos de legenda" && (
        <>
          <p className="text-xs text-muted-foreground mt-6 mb-2">
            Clique em um estilo para definir como padrão em novos clips.
            {selectedStyle && (
              <span className="ml-2 text-primary font-medium">
                Padrão atual: {CAPTION_STYLES.find((s) => s.id === selectedStyle)?.name}
              </span>
            )}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-2">
            {CAPTION_STYLES.map((s) => {
              const isSelected = selectedStyle === s.id;
              const justSaved = savedFeedback === s.id;
              return (
                <Card
                  key={s.id}
                  onClick={() => selectStyle(s.id)}
                  className={`overflow-hidden bg-surface-1 border-2 transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? "border-primary shadow-lg shadow-primary/10"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div
                    className="aspect-[9/16] bg-[#0c0c10] flex items-center justify-center p-4 relative"
                    style={{ borderBottom: `2px solid ${s.color}22` }}
                  >
                    {/* Preview visual único por estilo */}
                    {s.id === "faixa" ? (
                      <div className="absolute bottom-12 left-0 right-0 bg-black/70 px-3 py-2 text-center">
                        <p className="text-white font-extrabold text-xl uppercase">{s.preview}</p>
                      </div>
                    ) : (
                      <p
                        className="text-center font-extrabold text-xl uppercase leading-tight"
                        style={{
                          color: s.id === "neon" ? s.color : "white",
                          textShadow:
                            s.id === "neon"
                              ? `0 0 16px ${s.color}, 0 0 32px ${s.color}`
                              : s.id === "impacto"
                              ? "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000"
                              : "1px 1px 3px rgba(0,0,0,0.8)",
                          opacity: s.id === "minimal" ? 0.9 : 1,
                        }}
                      >
                        {s.preview}
                      </p>
                    )}
                    {/* Badge "Padrão" */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold flex items-center gap-1">
                      {s.name}
                      {justSaved && (
                        <span className="text-xs text-primary font-normal">✓ Salvo</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Enquadramentos */}
      {tab === "Enquadramentos" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {ENQUADRAMENTOS.map((e) => (
            <Card key={e.id} className="overflow-hidden bg-surface-1 border-border hover:border-primary/40 transition-colors cursor-pointer">
              <div className="bg-[#0c0c10] flex items-center justify-center p-8">
                <div className={`${e.ratio} bg-surface-2 border-2 border-border rounded max-w-[120px] flex items-center justify-center`}>
                  <span className="text-xs text-muted-foreground font-mono">{e.label}</span>
                </div>
              </div>
              <div className="p-4">
                <p className="font-bold">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.sub}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Por nicho */}
      {tab === "Por nicho" && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">Templates por nicho em breve.</p>
          <p className="text-xs text-muted-foreground mt-1">Finanças, Fitness, Motivacional, Educação e mais.</p>
        </div>
      )}

      {/* Formatos */}
      {tab === "Formatos" && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">Formatos personalizados em breve.</p>
        </div>
      )}
    </div>
  );
}
