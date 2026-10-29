ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'social_media',
  ADD COLUMN IF NOT EXISTS submission_target text NOT NULL DEFAULT 'pair',
  ADD COLUMN IF NOT EXISTS media_names jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_content_type_check
    CHECK (content_type IN ('social_media', 'website_article')),
  ADD CONSTRAINT submissions_submission_target_check
    CHECK (submission_target IN ('department', 'pair'));

NOTIFY pgrst, 'reload schema';
