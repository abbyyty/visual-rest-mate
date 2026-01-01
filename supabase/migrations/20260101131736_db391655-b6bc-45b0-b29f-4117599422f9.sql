-- Add overuse_time_seconds column to daily_stats
ALTER TABLE public.daily_stats 
ADD COLUMN overuse_time_seconds integer NOT NULL DEFAULT 0;