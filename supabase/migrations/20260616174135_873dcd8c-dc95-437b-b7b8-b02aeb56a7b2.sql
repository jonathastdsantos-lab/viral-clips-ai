
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  false,
  536870912,
  ARRAY['video/mp4','video/webm','video/quicktime','audio/mp4','audio/mpeg','audio/m4a','audio/webm']
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS transcript text,
  ADD COLUMN IF NOT EXISTS processing_error text;

-- Storage policies for the 'videos' bucket (created via tool).
-- Path convention: <user_id>/<project_id>/<filename>
CREATE POLICY "videos: users read own"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "videos: users upload own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "videos: users update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "videos: users delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
