ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz;

NOTIFY pgrst, 'reload schema';
