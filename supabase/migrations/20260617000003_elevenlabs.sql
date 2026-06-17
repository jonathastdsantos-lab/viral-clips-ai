ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS narration_url TEXT;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS narration_voice_id TEXT;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS narration_status TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS preferred_voice_id TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS preferred_voice_name TEXT;
