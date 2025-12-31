-- Create daily_stats table for tracking screen time and breaks
CREATE TABLE public.daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  total_screen_time_seconds INTEGER NOT NULL DEFAULT 0,
  exercise_count INTEGER NOT NULL DEFAULT 0,
  close_eyes_count INTEGER NOT NULL DEFAULT 0,
  skip_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security (public access for MVP with anonymous UUIDs)
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read/write their own data by user_id
CREATE POLICY "Users can view their own stats"
ON public.daily_stats
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own stats"
ON public.daily_stats
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own stats"
ON public.daily_stats
FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_stats_updated_at
BEFORE UPDATE ON public.daily_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();