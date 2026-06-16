-- Workspaces (agências gerenciam múltiplos clientes)
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace: owner full access"
ON public.workspaces FOR ALL
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER set_updated_at_workspaces BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Membros do workspace com roles
CREATE TABLE public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor', -- 'admin' | 'editor' | 'viewer'
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members: members can view"
ON public.workspace_members FOR SELECT
USING (
  auth.uid() = user_id OR
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Workspace members: owner manages"
ON public.workspace_members FOR ALL
USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
) WITH CHECK (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- Brand Kit por workspace
CREATE TABLE public.brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- para uso pessoal sem workspace
  logo_url TEXT,
  logo_storage_path TEXT,
  caption_style TEXT NOT NULL DEFAULT 'karaoke',
  primary_color TEXT NOT NULL DEFAULT '#ffffff',
  highlight_color TEXT NOT NULL DEFAULT '#ffe14d',
  font_size INTEGER NOT NULL DEFAULT 56,
  position TEXT NOT NULL DEFAULT 'bottom', -- 'top' | 'middle' | 'bottom'
  watermark_enabled BOOLEAN NOT NULL DEFAULT false,
  watermark_position TEXT NOT NULL DEFAULT 'bottom-right',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kits TO authenticated;
GRANT ALL ON public.brand_kits TO service_role;
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand kits: user manages own"
ON public.brand_kits FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_brand_kits BEFORE UPDATE ON public.brand_kits
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- API Keys para integração externa (n8n, Make, Zapier)
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 da key, nunca armazenar em plain text
  key_prefix TEXT NOT NULL, -- primeiros 8 chars para identificação visual
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "API keys: user manages own"
ON public.api_keys FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX api_keys_user_id_idx ON public.api_keys(user_id);
CREATE INDEX api_keys_key_hash_idx ON public.api_keys(key_hash);

-- Storage policy para logos do brand kit
CREATE POLICY "brand-assets: users read own"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "brand-assets: users upload own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
