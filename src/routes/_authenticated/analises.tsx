import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Loader2, Scissors, Send, Flame, TrendingUp, Clock, FolderOpen, Sparkles } from 'lucide-react';
import { getAnalytics } from '@/lib/analytics.functions';
import { generateInsights } from '@/lib/ai-insights.functions';

export const Route = createFileRoute('/_authenticated/analises')({
  head: () => ({ meta: [{ title: 'Análises — Corta.vc' }, { name: 'robots', content: 'noindex' }] }),
  component: AnalisesPage,
});

function fmtDur(s: number) {
  return `${Math.floor(s / 60)}m${Math.floor(s % 60).toString().padStart(2, '0')}s`;
}

function AnalisesPage() {
  const fetchAnalytics = useServerFn(getAnalytics);
  const fetchInsights = useServerFn(generateInsights);

  const [data, setData] = useState<Awaited<ReturnType<typeof getAnalytics>> | null>(null);
  const [insights, setInsights] = useState<Array<{ icon: string; title: string; body: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await fetchAnalytics();
      setData(result);
      setLoading(false);
    })();
  }, []);

  async function loadInsights() {
    if (!data) return;
    setLoadingInsights(true);
    try {
      const clipsData = JSON.stringify(data.topClips.map((c) => ({
        title: c.title,
        viral_score: c.viral_score,
        duration: (c.end_sec ?? 0) - (c.start_sec ?? 0),
        hasRender: !!c.output_url,
      })));
      const result = await fetchInsights({ data: { clipsData } });
      if (result.ok) setInsights(result.insights);
    } finally {
      setLoadingInsights(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, topClips, weeklyData, scoreDistribution, creditsByType } = data;

  const kpis = [
    {
      icon: FolderOpen,
      label: 'Total de projetos',
      value: String(summary.totalProjects),
      sub: `${summary.totalProjects} criados`,
    },
    {
      icon: Scissors,
      label: 'Clips gerados',
      value: String(summary.totalClips),
      sub: `${summary.thisWeekClips} esta semana`,
      delta: summary.deltaClipsPct,
    },
    {
      icon: Send,
      label: 'Clips renderizados',
      value: String(summary.renderedClips),
      sub: `${summary.publishedClips} publicados`,
    },
    {
      icon: Flame,
      label: 'Viral score médio',
      value: String(summary.avgViralScore),
      sub: `Duração média: ${fmtDur(summary.avgDurationSec)}`,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-xs font-bold uppercase text-brand tracking-wider">Últimos 30 dias</p>
          <h1 className="text-3xl font-extrabold mt-1">Análises</h1>
          <p className="text-muted-foreground mt-1">Seus dados reais de criação e publicação.</p>
        </div>
        <Button variant="outline" onClick={loadInsights} disabled={loadingInsights}>
          {loadingInsights
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando insights…</>
            : <><Sparkles className="w-4 h-4" /> Insights da IA</>
          }
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 bg-surface-1 border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <k.icon className="w-4 h-4" /> {k.label}
            </div>
            <div className="text-3xl font-extrabold">{k.value}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{k.sub}</span>
              {k.delta !== undefined && (
                <span className={`text-xs font-bold ${k.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {k.delta >= 0 ? '↑' : '↓'} {Math.abs(k.delta)}%
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Insights da IA */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {insights.map((ins, i) => (
            <Card key={i} className="p-4 bg-primary/5 border-primary/20">
              <div className="text-2xl mb-2">{ins.icon}</div>
              <p className="text-sm font-bold mb-1">{ins.title}</p>
              <p className="text-xs text-muted-foreground">{ins.body}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Clips por semana */}
        <Card className="p-5 bg-surface-1 border-border">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Clips por semana
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="clips" name="Gerados" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rendered" name="Renderizados" fill="hsl(var(--brand) / 0.3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribuição de viral score */}
        <Card className="p-5 bg-surface-1 border-border">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" /> Distribuição de viral score
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreDistribution} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" name="Clips" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top clips */}
        <Card className="p-5 bg-surface-1 border-border">
          <h3 className="font-bold mb-4">Melhores cortes (por viral score)</h3>
          {topClips.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum clip ainda.</p>
          ) : (
            <div className="space-y-3">
              {topClips.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-muted-foreground font-bold w-5 text-sm">{i + 1}</span>
                  <div className="w-9 h-9 rounded-md bg-surface-2 flex-shrink-0 flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {((c.end_sec ?? 0) - (c.start_sec ?? 0)).toFixed(0)}s
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{c.status}</p>
                  </div>
                  <Badge className={`shrink-0 ${
                    (c.viral_score ?? 0) >= 85
                      ? 'bg-emerald-500/20 text-emerald-400 border-0'
                      : (c.viral_score ?? 0) >= 70
                      ? 'bg-amber-500/20 text-amber-400 border-0'
                      : 'bg-muted text-muted-foreground border-0'
                  }`}>
                    <Flame className="w-3 h-3" /> {c.viral_score ?? '—'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Créditos consumidos por tipo */}
        <Card className="p-5 bg-surface-1 border-border">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Créditos usados (30d)
          </h3>
          {Object.keys(creditsByType).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum crédito usado ainda.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(creditsByType).map(([type, count]) => {
                const labels: Record<string, string> = {
                  transcribe: 'Transcrições',
                  analyze: 'Análises de IA',
                  render: 'Renders de clip',
                };
                const total = Object.values(creditsByType).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{labels[type] ?? type}</span>
                      <span className="font-bold">{count} créditos</span>
                    </div>
                    <div className="w-full bg-surface-2 rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
