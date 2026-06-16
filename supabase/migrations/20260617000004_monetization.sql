-- Adicionar colunas de plano na profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credits_remaining INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS credits_total_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_subscription_id TEXT;

-- Tabela de histórico de uso de créditos
CREATE TABLE public.credit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'transcribe' | 'analyze' | 'render' | 'topup' | 'plan_grant'
  credits_delta INTEGER NOT NULL, -- negativo = consumo, positivo = recarga
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  clip_id UUID REFERENCES public.clips(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.credit_events TO authenticated;
GRANT ALL ON public.credit_events TO service_role;
ALTER TABLE public.credit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own credit events"
ON public.credit_events FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Service role manages credit events"
ON public.credit_events FOR ALL
USING (true)
WITH CHECK (true);

-- Tabela de pagamentos
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'mercado_pago' | 'stripe'
  provider_payment_id TEXT UNIQUE,
  amount_brl DECIMAL(10,2) NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'refunded'
  credits_granted INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX credit_events_user_id_idx ON public.credit_events(user_id);
CREATE INDEX payments_user_id_idx ON public.payments(user_id);
CREATE INDEX payments_provider_payment_id_idx ON public.payments(provider_payment_id);
