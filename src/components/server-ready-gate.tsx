import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Status = 'checking' | 'ready' | 'error';

async function pingHealth(signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { signal, cache: 'no-store' });
    if (!res.ok) return false;
    const json = (await res.json()) as { status?: string };
    return json.status === 'ok';
  } catch {
    return false;
  }
}

export function ServerReadyGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;
    let attempts = 0;

    async function loop() {
      while (!cancelled) {
        attempts += 1;
        setAttempt(attempts);
        const ok = await pingHealth(ctrl.signal);
        if (cancelled) return;
        if (ok) {
          setStatus('ready');
          return;
        }
        if (attempts >= 10) {
          setStatus('error');
          return;
        }
        const delay = Math.min(500 * 2 ** (attempts - 1), 4000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    loop();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  if (status === 'ready') return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        {status === 'checking' ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
            <h1 className="mt-4 text-lg font-semibold text-foreground">
              Preparando o servidor…
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Verificando conexão{attempt > 1 ? ` (tentativa ${attempt})` : ''}.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-foreground">
              Servidor indisponível
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Não conseguimos contato com o servidor. Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground transition-colors hover:bg-brand/90"
            >
              Recarregar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
