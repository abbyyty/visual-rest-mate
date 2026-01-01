-- Rename emergency_stop_count to early_end_count
ALTER TABLE public.daily_stats 
RENAME COLUMN emergency_stop_count TO early_end_count;