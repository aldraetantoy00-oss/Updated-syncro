ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS desired_post_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_language text,
  ADD COLUMN IF NOT EXISTS ai_tone text;

NOTIFY pgrst, 'reload schema';
