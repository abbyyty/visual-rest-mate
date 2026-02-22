CREATE POLICY "Users can update their own consent"
ON public.consent_records
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);