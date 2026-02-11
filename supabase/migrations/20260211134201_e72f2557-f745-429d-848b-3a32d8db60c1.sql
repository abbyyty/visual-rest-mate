
-- Create the unified daily_summary table
CREATE TABLE public.daily_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  days_of_use INTEGER NOT NULL DEFAULT 1,
  daily_screen_time INTERVAL NOT NULL DEFAULT '00:00:00'::interval,
  daily_overuse_time INTERVAL NOT NULL DEFAULT '00:00:00'::interval,
  daily_sessions_count INTEGER NOT NULL DEFAULT 0,
  daily_sessions_eye_exercise INTEGER NOT NULL DEFAULT 0,
  daily_sessions_eye_exercise_early_end INTEGER NOT NULL DEFAULT 0,
  daily_sessions_eye_close INTEGER NOT NULL DEFAULT 0,
  daily_sessions_eye_close_early_end INTEGER NOT NULL DEFAULT 0,
  daily_sessions_skip INTEGER NOT NULL DEFAULT 0,
  early_end_count INTEGER NOT NULL DEFAULT 0,
  daily_percentage_full_eye_exercise NUMERIC NOT NULL DEFAULT 0,
  daily_percentage_full_eye_close NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Hong_Kong'::text) AT TIME ZONE 'UTC'::text),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Hong_Kong'::text) AT TIME ZONE 'UTC'::text),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_summary ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own summary data"
  ON public.daily_summary FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own summary data"
  ON public.daily_summary FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summary data"
  ON public.daily_summary FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_daily_summary_updated_at
  BEFORE UPDATE ON public.daily_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill from daily_tracking (primary source)
INSERT INTO public.daily_summary (
  user_id, username, date, days_of_use,
  daily_screen_time, daily_overuse_time,
  daily_sessions_count,
  daily_sessions_eye_exercise, daily_sessions_eye_exercise_early_end,
  daily_sessions_eye_close, daily_sessions_eye_close_early_end,
  daily_sessions_skip, early_end_count,
  daily_percentage_full_eye_exercise, daily_percentage_full_eye_close,
  created_at, updated_at
)
SELECT
  dt.user_id, dt.username, dt.date, dt.days_of_use,
  dt.daily_screen_time, dt.daily_overuse_time,
  dt.daily_sessions_count,
  dt.daily_sessions_eye_exercise, dt.daily_sessions_eye_exercise_early_end,
  dt.daily_sessions_eye_close, dt.daily_sessions_eye_close_early_end,
  dt.daily_sessions_skip,
  dt.daily_sessions_eye_exercise_early_end + dt.daily_sessions_eye_close_early_end,
  dt.daily_percentage_full_eye_exercise, dt.daily_percentage_full_eye_close,
  dt.created_at, dt.updated_at
FROM public.daily_tracking dt
ON CONFLICT (user_id, date) DO NOTHING;

-- Backfill from daily_stats for any dates NOT already covered by daily_tracking
INSERT INTO public.daily_summary (
  user_id, username, date, days_of_use,
  daily_screen_time, daily_overuse_time,
  daily_sessions_count,
  daily_sessions_eye_exercise, daily_sessions_eye_exercise_early_end,
  daily_sessions_eye_close, daily_sessions_eye_close_early_end,
  daily_sessions_skip, early_end_count,
  daily_percentage_full_eye_exercise, daily_percentage_full_eye_close
)
SELECT
  ds.user_id::uuid,
  COALESCE(p.username, 'User'),
  ds.date::date,
  1,
  make_interval(secs => ds.total_screen_time_seconds),
  make_interval(secs => ds.overuse_time_seconds),
  ds.exercise_count + ds.close_eyes_count + ds.skip_count,
  ds.exercise_count, 0,
  ds.close_eyes_count, 0,
  ds.skip_count, ds.early_end_count,
  0, 0
FROM public.daily_stats ds
LEFT JOIN public.profiles p ON p.id = ds.user_id::uuid
ON CONFLICT (user_id, date) DO NOTHING;
