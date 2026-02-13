-- Create a secure function to check username availability (callable by anyone including unauthenticated users)
CREATE OR REPLACE FUNCTION public.check_username_available(desired_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = desired_username
  );
END;
$$;
