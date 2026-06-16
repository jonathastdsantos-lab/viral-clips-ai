ALTER TABLE public.clips ALTER COLUMN status SET DEFAULT 'ready';
UPDATE public.clips SET status = 'ready' WHERE status = 'pending';
