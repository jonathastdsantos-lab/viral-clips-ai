ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS heygen_video_id TEXT;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS heygen_video_url TEXT;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS heygen_status TEXT;
