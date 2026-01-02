-- Enable realtime for daily_tracking table
ALTER TABLE public.daily_tracking REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tracking;