
-- Add username column to consent_records
ALTER TABLE public.consent_records ADD COLUMN username text;

-- Backfill existing records with usernames from profiles
UPDATE public.consent_records cr
SET username = p.username
FROM public.profiles p
WHERE cr.user_id = p.id;

-- Make it NOT NULL with a default for safety going forward
ALTER TABLE public.consent_records ALTER COLUMN username SET DEFAULT '';
