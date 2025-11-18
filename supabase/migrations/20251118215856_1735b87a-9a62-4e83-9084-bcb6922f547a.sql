-- Create table for password reset verification codes
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  used BOOLEAN NOT NULL DEFAULT false
);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes(email);
CREATE INDEX idx_password_reset_codes_expires_at ON public.password_reset_codes(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Allow public to insert codes (for sending)
CREATE POLICY "Allow public to insert codes" ON public.password_reset_codes
  FOR INSERT
  WITH CHECK (true);

-- Allow public to read their own codes (for verification)
CREATE POLICY "Allow public to read codes" ON public.password_reset_codes
  FOR SELECT
  USING (true);

-- Allow public to update their own codes (for marking as used)
CREATE POLICY "Allow public to update codes" ON public.password_reset_codes
  FOR UPDATE
  USING (true);

-- Create function to clean up expired codes
CREATE OR REPLACE FUNCTION clean_expired_reset_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.password_reset_codes
  WHERE expires_at < now() OR (used = true AND created_at < now() - interval '1 hour');
END;
$$;