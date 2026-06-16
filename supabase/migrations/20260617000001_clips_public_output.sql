-- Permitir leitura pública dos clips renderizados (output_url é URL pública do Storage)
-- O bucket 'videos' precisa ter a política de leitura pública para o path clips/*
CREATE POLICY "videos: clips rendered public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos' AND name LIKE '%/clips/%');
