import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { runHealthcheck, type CheckResult } from '@/lib/healthcheck.functions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, PlayCircle } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/diagnostico')({
  head: () => ({ meta: [{ title: 'Diagnóstico — Corta.vc' }] }),
  component: DiagnosticoPage,
});

type Result = { checks: CheckResult[]; summary: { ok: number; warn: number; fail: number; total: number }; ranAt: string };

function DiagnosticoPage() {
  const run = useServerFn(runHealthcheck);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const r = await run({ data: undefined as never });
      setResult(r as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const grouped = result
    ? result.checks.reduce<Record<string, CheckResult[]>>((acc, c) => {
        (acc[c.group] ??= []).push(c);
        return acc;
      }, {})
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Diagnóstico do sistema</h1>
          <p className="text-sm text-muted-foreground">
            Smoke-test de todas as rotas, queries, edge functions e integrações.
          </p>
        </div>
        <Button onClick={handleRun} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          Rodar checklist
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-destructive text-sm">
          Falha ao executar checklist: {error}
        </Card>
      )}

      {result && (
        <div className="flex gap-2 text-sm">
          <Badge variant="outline" className="gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{result.summary.ok} OK</Badge>
          <Badge variant="outline" className="gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />{result.summary.warn} avisos</Badge>
          <Badge variant="outline" className="gap-1.5"><XCircle className="w-3.5 h-3.5 text-destructive" />{result.summary.fail} falhas</Badge>
          <span className="text-muted-foreground ml-auto text-xs self-center">
            Executado em {new Date(result.ranAt).toLocaleString('pt-BR')}
          </span>
        </div>
      )}

      {grouped && Object.entries(grouped).map(([group, items]) => (
        <Card key={group} className="p-4">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">{group}</h2>
          <ul className="divide-y divide-border">
            {items.map((c) => (
              <li key={c.name} className="flex items-start gap-3 py-2.5">
                <StatusIcon status={c.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className={`text-xs mt-0.5 ${c.status === 'fail' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {c.message}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{c.durationMs}ms</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {!result && !loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Clique em "Rodar checklist" para validar todas as integrações.
        </Card>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: CheckResult['status'] }) {
  if (status === 'ok') return <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />;
  return <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />;
}
