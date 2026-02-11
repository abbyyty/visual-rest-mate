ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS consent_given boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_text_version text NOT NULL DEFAULT 'v1';