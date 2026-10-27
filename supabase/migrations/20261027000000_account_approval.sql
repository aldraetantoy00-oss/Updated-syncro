ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS is_approved boolean;

UPDATE public.users
SET is_approved = true
WHERE is_approved IS NULL;

ALTER TABLE public.users
  ALTER COLUMN is_approved SET DEFAULT false,
  ALTER COLUMN is_approved SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique
  ON public.users (lower(username))
  WHERE username IS NOT NULL AND btrim(username) <> '';

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;