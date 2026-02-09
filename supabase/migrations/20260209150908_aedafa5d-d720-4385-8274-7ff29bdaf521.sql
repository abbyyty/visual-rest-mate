
CREATE TABLE public.consent_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Hong_Kong') AT TIME ZONE 'UTC'),
  UNIQUE (user_id)
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consent" ON public.consent_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consent" ON public.consent_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
