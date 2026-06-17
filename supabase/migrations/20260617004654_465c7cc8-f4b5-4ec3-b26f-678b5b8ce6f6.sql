
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS transcript_data text;

ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS caption_style text,
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS published_platform text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS narration_url text,
  ADD COLUMN IF NOT EXISTS narration_voice_id text,
  ADD COLUMN IF NOT EXISTS narration_status text,
  ADD COLUMN IF NOT EXISTS reframe_url text,
  ADD COLUMN IF NOT EXISTS reframe_status text,
  ADD COLUMN IF NOT EXISTS heygen_video_url text,
  ADD COLUMN IF NOT EXISTS heygen_status text;
