-- Add unique constraint on username in profiles table
CREATE UNIQUE INDEX profiles_username_unique ON public.profiles (username);
