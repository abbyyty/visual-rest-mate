
-- Fix daily_stats RLS policies: replace permissive 'true' with user-scoped conditions
DROP POLICY "Users can view their own stats" ON public.daily_stats;
DROP POLICY "Users can insert their own stats" ON public.daily_stats;
DROP POLICY "Users can update their own stats" ON public.daily_stats;

CREATE POLICY "Users can view their own stats"
ON public.daily_stats FOR SELECT
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own stats"
ON public.daily_stats FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own stats"
ON public.daily_stats FOR UPDATE
USING (user_id = auth.uid()::text);
