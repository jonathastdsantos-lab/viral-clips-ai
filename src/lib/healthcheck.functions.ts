import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export type CheckResult = {
  group: string;
  name: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
  durationMs: number;
};

async function run(
  group: string,
  name: string,
  fn: () => Promise<{ status: 'ok' | 'warn'; message: string }>,
): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const r = await fn();
    return { group, name, status: r.status, message: r.message, durationMs: Date.now() - t0 };
  } catch (e) {
    return {
      group,
      name,
      status: 'fail',
      message: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - t0,
    };
  }
}

export const runHealthcheck = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const checks: CheckResult[] = [];

    // ===== ROTAS (queries que cada página executa) =====
    checks.push(await run('Rotas', 'Dashboard → profiles', async () => {
      const { error } = await supabase.from('profiles').select('id, credits_remaining, plan').eq('id', userId).single();
      if (error) throw new Error(error.message);
      return { status: 'ok', message: 'profile carregado' };
    }));
    checks.push(await run('Rotas', 'Dashboard → projects (lista)', async () => {
      const { error, count } = await supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      if (error) throw new Error(error.message);
      return { status: 'ok', message: `${count ?? 0} projeto(s)` };
    }));
    checks.push(await run('Rotas', 'Cortes → clips (lista)', async () => {
      const { error, count } = await supabase.from('clips').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      if (error) throw new Error(error.message);
      return { status: 'ok', message: `${count ?? 0} clip(s)` };
    }));
    checks.push(await run('Rotas', 'Projects.$id → select completo', async () => {
      const { data: proj } = await supabase.from('projects').select('id').eq('user_id', userId).limit(1).maybeSingle();
      if (!proj) return { status: 'warn', message: 'nenhum projeto para validar — crie um para testar' };
      const { error } = await supabase.from('projects')
        .select('id, title, status, source_url, source_type, transcript_data, processing_error, duration_sec, created_at')
        .eq('id', proj.id).single();
      if (error) throw new Error(error.message);
      return { status: 'ok', message: `projeto ${proj.id.slice(0, 8)} OK` };
    }));

    // ===== Configurações / Agenda / Analytics =====
    checks.push(await run('Configurações', 'brand_kits', async () => {
      const { error } = await supabase.from('brand_kits').select('id').eq('user_id', userId).limit(1);
      if (error) throw new Error(error.message);
      return { status: 'ok', message: 'leitura OK' };
    }));
    checks.push(await run('Configurações', 'api_keys', async () => {
      const { error } = await supabase.from('api_keys').select('id').eq('user_id', userId).limit(1);
      if (error) throw new Error(error.message);
      return { status: 'ok', message: 'leitura OK' };
    }));
    checks.push(await run('Agenda', 'scheduled_posts', async () => {
      const { error } = await supabase.from('scheduled_posts').select('id').eq('user_id', userId).limit(1);
      if (error) throw new Error(error.message);
      return { status: 'ok', message: 'leitura OK' };
    }));
    checks.push(await run('Analytics', 'credit_events', async () => {
      const { error } = await supabase.from('credit_events').select('id').eq('user_id', userId).limit(1);
      if (error) throw new Error(error.message);
      return { status: 'ok', message: 'leitura OK' };
    }));

    // ===== Publicação TikTok =====
    checks.push(await run('TikTok', 'Conexão tiktok_connections', async () => {
      const { data, error } = await supabase.from('tiktok_connections')
        .select('access_token, expires_at').eq('user_id', userId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return { status: 'warn', message: 'nenhuma conta TikTok conectada' };
      const expired = data.expires_at && new Date(data.expires_at) <= new Date();
      return { status: expired ? 'warn' : 'ok', message: expired ? 'token expirado (será renovado no publish)' : 'conectado' };
    }));
    checks.push(await run('TikTok', 'Secrets TIKTOK_CLIENT_KEY/SECRET', async () => {
      const missing: string[] = [];
      if (!process.env.TIKTOK_CLIENT_KEY) missing.push('TIKTOK_CLIENT_KEY');
      if (!process.env.TIKTOK_CLIENT_SECRET) missing.push('TIKTOK_CLIENT_SECRET');
      if (missing.length) return { status: 'warn', message: `faltando: ${missing.join(', ')}` };
      return { status: 'ok', message: 'configurado' };
    }));
    checks.push(await run('TikTok', 'Clip pronto para publicar', async () => {
      const { data, error } = await supabase.from('clips')
        .select('id, output_url').eq('user_id', userId).not('output_url', 'is', null).limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return { status: 'warn', message: 'nenhum clip renderizado (output_url) ainda' };
      return { status: 'ok', message: `clip ${data.id.slice(0, 8)} renderizado` };
    }));

    // ===== Publicação YouTube =====
    checks.push(await run('YouTube', 'Conexão social_connections', async () => {
      const { data, error } = await supabase.from('social_connections')
        .select('access_token, expires_at').eq('user_id', userId).eq('platform', 'youtube').maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return { status: 'warn', message: 'nenhuma conta YouTube conectada' };
      return { status: 'ok', message: 'conectado' };
    }));
    checks.push(await run('YouTube', 'Secrets YOUTUBE_CLIENT_ID/SECRET', async () => {
      const missing: string[] = [];
      if (!process.env.YOUTUBE_CLIENT_ID) missing.push('YOUTUBE_CLIENT_ID');
      if (!process.env.YOUTUBE_CLIENT_SECRET) missing.push('YOUTUBE_CLIENT_SECRET');
      if (missing.length) return { status: 'warn', message: `faltando: ${missing.join(', ')}` };
      return { status: 'ok', message: 'configurado' };
    }));

    // ===== Transcrição / Render / Reframe =====
    checks.push(await run('Pipeline', 'Secret OPENAI_API_KEY (transcribe)', async () => {
      return process.env.OPENAI_API_KEY
        ? { status: 'ok', message: 'configurado' }
        : { status: 'warn', message: 'faltando OPENAI_API_KEY' };
    }));
    checks.push(await run('Pipeline', 'Edge function render-clip', async () => {
      const { data, error } = await supabase.functions.invoke('render-clip', { body: { __ping: true } });
      // esperamos erro de validação, não erro de infra
      if (error && !/clip|project|input|required|invalid/i.test(error.message)) throw new Error(error.message);
      return { status: 'ok', message: 'edge function alcançável' };
    }));
    checks.push(await run('Pipeline', 'Edge function reframe-clip', async () => {
      const { error } = await supabase.functions.invoke('reframe-clip', { body: { __ping: true } });
      if (error && !/clip|input|required|invalid/i.test(error.message)) throw new Error(error.message);
      return { status: 'ok', message: 'edge function alcançável' };
    }));
    checks.push(await run('Pipeline', 'Storage bucket videos', async () => {
      const { error } = await supabase.storage.from('videos').list(userId, { limit: 1 });
      if (error) throw new Error(error.message);
      return { status: 'ok', message: 'acessível' };
    }));

    // ===== HeyGen / ElevenLabs / Narration =====
    checks.push(await run('HeyGen', 'Secret HEYGEN_API_KEY', async () => {
      return process.env.HEYGEN_API_KEY
        ? { status: 'ok', message: 'configurado' }
        : { status: 'warn', message: 'faltando HEYGEN_API_KEY — listHeyGenAvatars/generateHeyGenVideo falharão' };
    }));
    checks.push(await run('ElevenLabs', 'Secret ELEVENLABS_API_KEY', async () => {
      return process.env.ELEVENLABS_API_KEY
        ? { status: 'ok', message: 'configurado' }
        : { status: 'warn', message: 'faltando ELEVENLABS_API_KEY — listElevenLabsVoices/generateNarration falharão' };
    }));

    const summary = {
      ok: checks.filter((c) => c.status === 'ok').length,
      warn: checks.filter((c) => c.status === 'warn').length,
      fail: checks.filter((c) => c.status === 'fail').length,
      total: checks.length,
    };

    return { checks, summary, ranAt: new Date().toISOString() };
  });
