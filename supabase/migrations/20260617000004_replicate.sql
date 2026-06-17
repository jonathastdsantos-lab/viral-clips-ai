ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS reframe_status TEXT;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS reframe_url TEXT;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS reframe_prediction_id TEXT;
