-- Melhoria 2: Word-level timestamps para base de legendas queimadas
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS transcript_data TEXT;

-- Melhoria 3: Campos extras nos clips para reason, custom_prompt, legenda queimada
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS srt_content TEXT;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS caption_style TEXT NOT NULL DEFAULT 'karaoke';
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS custom_prompt TEXT;
