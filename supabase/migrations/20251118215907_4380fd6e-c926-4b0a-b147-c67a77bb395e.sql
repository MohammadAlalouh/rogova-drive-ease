-- Fix search path for the clean_expired_reset_codes function
DROP FUNCTION IF EXISTS clean_expired_reset_codes();

CREATE OR REPLACE FUNCTION clean_expired_reset_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_codes
  WHERE expires_at < now() OR (used = true AND created_at < now() - interval '1 hour');
END;
$$;