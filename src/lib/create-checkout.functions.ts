import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { PLANS, type PlanId } from './plans';

const Input = z.object({
  planId: z.enum(['criador', 'pro', 'agencia']),
  paymentMethod: z.enum(['pix', 'credit_card']).default('pix'),
});

export const createCheckout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpAccessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado.');

    const plan = PLANS[data.planId as PlanId];
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email ?? 'cliente@corta.vc';

    // Criar preferência no Mercado Pago
    const preferenceBody = {
      items: [
        {
          id: plan.id,
          title: `Corta.vc — Plano ${plan.name}`,
          description: `${plan.creditsPerMonth} créditos/mês · ${plan.maxProjects === -1 ? 'projetos ilimitados' : `${plan.maxProjects} projetos`}`,
          quantity: 1,
          unit_price: plan.price / 100, // MP usa reais, não centavos
          currency_id: 'BRL',
        },
      ],
      payer: { email },
      external_reference: JSON.stringify({ userId, planId: data.planId }),
      back_urls: {
        success: `${process.env.VITE_BASE_URL ?? 'https://corta.vc'}/dashboard?payment=success`,
        failure: `${process.env.VITE_BASE_URL ?? 'https://corta.vc'}/dashboard?payment=failure`,
        pending: `${process.env.VITE_BASE_URL ?? 'https://corta.vc'}/dashboard?payment=pending`,
      },
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_types:
          data.paymentMethod === 'pix'
            ? [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }]
            : [{ id: 'account_money' }],
      },
      notification_url: `${process.env.SUPABASE_URL}/functions/v1/mp-webhook`,
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(preferenceBody),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      throw new Error(`Mercado Pago error: ${err.slice(0, 300)}`);
    }

    const mpJson = await mpRes.json() as {
      id: string;
      init_point: string;
      sandbox_init_point: string;
    };

    // Registrar pagamento pendente
    await supabase.from('payments').insert({
      user_id: userId,
      provider: 'mercado_pago',
      provider_payment_id: mpJson.id,
      amount_brl: plan.price / 100,
      plan: data.planId,
      status: 'pending',
      credits_granted: plan.creditsPerMonth,
    });

    const isDev = process.env.NODE_ENV !== 'production';
    return {
      ok: true as const,
      checkoutUrl: isDev ? mpJson.sandbox_init_point : mpJson.init_point,
      preferenceId: mpJson.id,
    };
  });
