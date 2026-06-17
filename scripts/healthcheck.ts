/**
 * CLI healthcheck — chama a server function /diagnostico via HTTP.
 *
 * Uso:
 *   BASE_URL=https://cut-and-post.lovable.app \
 *   SUPABASE_TOKEN=<access_token> \
 *   bun run scripts/healthcheck.ts
 *
 * Para pegar o SUPABASE_TOKEN: faça login no app, abra DevTools > Application >
 * Local Storage > procure por "sb-...-auth-token" e copie o campo access_token.
 */

const BASE_URL = process.env.BASE_URL ?? 'https://cut-and-post.lovable.app';
const TOKEN = process.env.SUPABASE_TOKEN;

if (!TOKEN) {
  console.error('❌ Defina SUPABASE_TOKEN (access token de uma sessão logada).');
  process.exit(1);
}

type CheckResult = {
  group: string;
  name: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
  durationMs: number;
};

const url = `${BASE_URL}/_serverFn/${btoa(JSON.stringify({
  file: '/src/lib/healthcheck.functions.ts?tss-serverfn-split',
  export: 'runHealthcheck_createServerFn_handler',
}))}`;

console.log(`→ POST ${BASE_URL}/_serverFn/runHealthcheck`);

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  },
  body: JSON.stringify({}),
});

if (!res.ok) {
  console.error(`❌ HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const { checks, summary } = (await res.json()) as {
  checks: CheckResult[];
  summary: { ok: number; warn: number; fail: number; total: number };
};

const icon = { ok: '✅', warn: '⚠️ ', fail: '❌' } as const;
let currentGroup = '';
for (const c of checks) {
  if (c.group !== currentGroup) {
    currentGroup = c.group;
    console.log(`\n── ${currentGroup} ──`);
  }
  console.log(`  ${icon[c.status]} ${c.name.padEnd(42)} ${c.message}  (${c.durationMs}ms)`);
}

console.log(
  `\nResumo: ${summary.ok} OK · ${summary.warn} avisos · ${summary.fail} falhas (total ${summary.total})`,
);

process.exit(summary.fail > 0 ? 1 : 0);
