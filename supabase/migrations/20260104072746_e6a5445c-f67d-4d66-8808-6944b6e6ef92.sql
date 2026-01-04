-- Add percentage columns for tracking full completion rates
ALTER TABLE public.daily_tracking 
ADD COLUMN IF NOT EXISTS daily_percentage_full_eye_exercise NUMERIC(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_percentage_full_eye_close NUMERIC(5,2) NOT NULL DEFAULT 0;

-- Update default for created_at and updated_at to use Hong Kong timezone
-- Note: This changes the DEFAULT value for new records, existing records remain unchanged
ALTER TABLE public.daily_tracking 
ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'Asia/Hong_Kong' AT TIME ZONE 'UTC'),
ALTER COLUMN updated_at SET DEFAULT (now() AT TIME ZONE 'Asia/Hong_Kong' AT TIME ZONE 'UTC');

-- Also update the update_updated_at_column trigger function to use HKT
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = (now() AT TIME ZONE 'Asia/Hong_Kong' AT TIME ZONE 'UTC');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update existing records to populate percentage columns based on current data
UPDATE public.daily_tracking
SET 
  daily_percentage_full_eye_exercise = CASE 
    WHEN daily_sessions_eye_exercise > 0 
    THEN ROUND(((daily_sessions_eye_exercise - daily_sessions_eye_exercise_early_end)::numeric / daily_sessions_eye_exercise::numeric) * 100, 2)
    ELSE 0 
  END,
  daily_percentage_full_eye_close = CASE 
    WHEN daily_sessions_eye_close > 0 
    THEN ROUND(((daily_sessions_eye_close - daily_sessions_eye_close_early_end)::numeric / daily_sessions_eye_close::numeric) * 100, 2)
    ELSE 0 
  END;