
-- profiles: credits
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_remaining integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS credits_total_used integer NOT NULL DEFAULT 0;

-- clips: extra fields
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS custom_prompt text,
  ADD COLUMN IF NOT EXISTS tiktok_post_id text,
  ADD COLUMN IF NOT EXISTS heygen_video_id text;

-- credit_events
CREATE TABLE IF NOT EXISTS public.credit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  credits_delta integer NOT NULL,
  description text,
  project_id uuid,
  clip_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.credit_events TO authenticated;
GRANT ALL ON public.credit_events TO service_role;
ALTER TABLE public.credit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own credit events" ON public.credit_events;
CREATE POLICY "Users view own credit events" ON public.credit_events
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own credit events" ON public.credit_events;
CREATE POLICY "Users insert own credit events" ON public.credit_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS credit_events_user_created_idx ON public.credit_events(user_id, created_at DESC);

-- scheduled_posts
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clip_id uuid NOT NULL,
  platform text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  published_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_posts TO authenticated;
GRANT ALL ON public.scheduled_posts TO service_role;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Users manage own scheduled posts" ON public.scheduled_posts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS scheduled_posts_user_idx ON public.scheduled_posts(user_id, scheduled_for);
DROP TRIGGER IF EXISTS scheduled_posts_set_updated_at ON public.scheduled_posts;
CREATE TRIGGER scheduled_posts_set_updated_at BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  provider_payment_id text,
  amount_brl numeric(10,2) NOT NULL,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  credits_granted integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS payments_user_idx ON public.payments(user_id, created_at DESC);
DROP TRIGGER IF EXISTS payments_set_updated_at ON public.payments;
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- tiktok_connections
CREATE TABLE IF NOT EXISTS public.tiktok_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  open_id text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_connections TO authenticated;
GRANT ALL ON public.tiktok_connections TO service_role;
ALTER TABLE public.tiktok_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own tiktok connection" ON public.tiktok_connections;
CREATE POLICY "Users manage own tiktok connection" ON public.tiktok_connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS tiktok_connections_set_updated_at ON public.tiktok_connections;
CREATE TRIGGER tiktok_connections_set_updated_at BEFORE UPDATE ON public.tiktok_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
