CREATE TABLE IF NOT EXISTS public.tiktok_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  open_id TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_connections TO authenticated;
GRANT ALL ON public.tiktok_connections TO service_role;
ALTER TABLE public.tiktok_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tiktok connection"
ON public.tiktok_connections FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_tiktok_connections
BEFORE UPDATE ON public.tiktok_connections
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Adicionar coluna tiktok_post_id na tabela clips
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS tiktok_post_id TEXT;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS published_platform TEXT;
