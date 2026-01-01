-- Add emergency_stop_count column to daily_stats table
ALTER TABLE public.daily_stats 
ADD COLUMN emergency_stop_count integer NOT NULL DEFAULT 0;