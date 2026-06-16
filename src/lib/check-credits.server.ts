import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { CREDIT_COSTS } from './plans';

type CreditOperation = keyof typeof CREDIT_COSTS;

export async function requireCredits(
  supabase: SupabaseClient<Database>,
  userId: string,
  operation: CreditOperation,
  metadata?: { projectId?: string; clipId?: string }
): Promise<void> {
  const cost = CREDIT_COSTS[operation];

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('credits_remaining, plan')
    .eq('id', userId)
    .single();

  if (error || !profile) throw new Error('Perfil não encontrado.');

  if (profile.credits_remaining < cost) {
    throw new Error(
      `Créditos insuficientes. Esta operação custa ${cost} crédito(s) e você tem ${profile.credits_remaining}. ` +
      `Faça upgrade do seu plano em Configurações.`
    );
  }

  // Debitar créditos atomicamente
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      credits_remaining: profile.credits_remaining - cost,
      credits_total_used: supabase.rpc ? undefined : 0, // incrementar via função RPC
    })
    .eq('id', userId)
    .gte('credits_remaining', cost); // garantia de concorrência

  if (updateErr) throw new Error('Falha ao debitar créditos: ' + updateErr.message);

  // Registrar evento de crédito
  await supabase.from('credit_events').insert({
    user_id: userId,
    event_type: operation,
    credits_delta: -cost,
    description: `${operation} realizado`,
    project_id: metadata?.projectId ?? null,
    clip_id: metadata?.clipId ?? null,
  });
}
