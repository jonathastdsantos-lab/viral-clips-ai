import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap } from 'lucide-react';
import { PLANS } from '@/lib/plans';
import { createCheckout } from '@/lib/create-checkout.functions';

export const Route = createFileRoute('/_authenticated/planos')({
  head: () => ({ meta: [{ title: 'Planos — Corta.vc' }] }),
  component: PlanosPage,
});

function PlanosPage() {
  const checkout = useServerFn(createCheckout);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(planId: 'criador' | 'pro' | 'agencia') {
    setLoading(planId);
    try {
      const result = await checkout({ data: { planId, paymentMethod: 'pix' } });
      if (result.ok) window.location.href = result.checkoutUrl;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao criar checkout');
    } finally {
      setLoading(null);
    }
  }

  const planList = [PLANS.free, PLANS.criador, PLANS.pro, PLANS.agencia];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <p className="text-xs font-bold uppercase text-brand tracking-wider mb-2">Preços simples</p>
        <h1 className="text-4xl font-extrabold">Escolha seu plano</h1>
        <p className="text-muted-foreground mt-2">Sem taxas escondidas. Cancele quando quiser.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {planList.map((plan) => {
          const isPro = plan.id === 'pro';
          return (
            <Card
              key={plan.id}
              className={`p-5 flex flex-col bg-surface-1 border-border ${isPro ? 'border-primary ring-1 ring-primary' : ''}`}
            >
              {isPro && (
                <Badge className="mb-3 w-fit bg-primary/20 text-primary border-0">
                  <Zap className="w-3 h-3" /> Mais popular
                </Badge>
              )}
              <div className="mb-4">
                <h2 className="text-lg font-extrabold">
                  {plan.badge} {plan.name}
                </h2>
                <div className="mt-2">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-extrabold">Grátis</span>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold">
                        R${(plan.price / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                      </span>
                      <span className="text-muted-foreground text-sm">/mês</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>{plan.creditsPerMonth} créditos/mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>{plan.maxProjects === -1 ? 'Projetos ilimitados' : `${plan.maxProjects} projetos`}</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  {plan.canDownload ? (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <span className="w-4 h-4 shrink-0 text-red-500">✕</span>
                  )}
                  <span className={plan.canDownload ? '' : 'line-through'}>Download sem marca d'água</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  {plan.canSchedule ? (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <span className="w-4 h-4 shrink-0 text-red-500">✕</span>
                  )}
                  <span className={plan.canSchedule ? '' : 'line-through'}>Agendamento de publicação</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  {plan.hasBrandKit ? (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <span className="w-4 h-4 shrink-0 text-red-500">✕</span>
                  )}
                  <span className={plan.hasBrandKit ? '' : 'line-through'}>Brand Kit</span>
                </li>
              </ul>

              {plan.price === 0 ? (
                <Button variant="outline" disabled>Plano atual</Button>
              ) : (
                <Button
                  className={isPro ? '' : 'variant-outline'}
                  variant={isPro ? 'default' : 'outline'}
                  disabled={loading === plan.id}
                  onClick={() => handleCheckout(plan.id as 'criador' | 'pro' | 'agencia')}
                >
                  {loading === plan.id ? 'Redirecionando…' : `Assinar — PIX ou Cartão`}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        Pagamentos processados com segurança pelo Mercado Pago. 1 crédito = 1 transcrição (2 créditos) ou 1 análise (1 crédito) ou 1 render (3 créditos).
      </p>
    </div>
  );
}
