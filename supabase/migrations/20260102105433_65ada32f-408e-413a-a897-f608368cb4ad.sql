
-- Create daily_tracking table for authenticated users
CREATE TABLE public.daily_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  days_of_use integer NOT NULL DEFAULT 1,
  daily_screen_time interval NOT NULL DEFAULT '00:00:00',
  daily_sessions_count integer NOT NULL DEFAULT 0,
  daily_sessions_eye_exercise integer NOT NULL DEFAULT 0,
  daily_sessions_eye_exercise_early_end integer NOT NULL DEFAULT 0,
  daily_sessions_eye_close integer NOT NULL DEFAULT 0,
  daily_sessions_eye_close_early_end integer NOT NULL DEFAULT 0,
  daily_sessions_skip integer NOT NULL DEFAULT 0,
  daily_overuse_time interval NOT NULL DEFAULT '00:00:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own tracking data"
ON public.daily_tracking FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracking data"
ON public.daily_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracking data"
ON public.daily_tracking FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_daily_tracking_updated_at
BEFORE UPDATE ON public.daily_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create profiles table for username storage
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'username', 'User'));
  RETURN new;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
