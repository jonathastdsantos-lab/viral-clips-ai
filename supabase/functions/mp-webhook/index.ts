import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json() as { type: string; data: { id: string } };

    if (body.type !== 'payment') {
      return new Response('ok', { headers: corsHeaders });
    }

    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${body.data.id}`, {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
    });

    const payment = await paymentRes.json() as {
      id: number;
      status: string;
      external_reference: string;
      preference_id: string;
    };

    if (payment.status !== 'approved') {
      await supabase
        .from('payments')
        .update({ status: payment.status })
        .eq('provider_payment_id', payment.preference_id);
      return new Response('ok', { headers: corsHeaders });
    }

    // Pagamento aprovado — conceder créditos e upgrade do plano
    const { userId, planId } = JSON.parse(payment.external_reference) as { userId: string; planId: string };

    const PLAN_CREDITS: Record<string, number> = {
      criador: 100, pro: 500, agencia: 2000,
    };

    const creditsToGrant = PLAN_CREDITS[planId] ?? 0;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

    // Atualizar plano e créditos
    await supabase
      .from('profiles')
      .update({
        plan: planId,
        plan_expires_at: expiresAt.toISOString(),
        credits_remaining: creditsToGrant,
      })
      .eq('id', userId);

    // Registrar evento de crédito
    await supabase.from('credit_events').insert({
      user_id: userId,
      event_type: 'plan_grant',
      credits_delta: creditsToGrant,
      description: `Plano ${planId} ativado`,
    });

    // Atualizar pagamento
    await supabase
      .from('payments')
      .update({ status: 'approved' })
      .eq('provider_payment_id', payment.preference_id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('MP webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
