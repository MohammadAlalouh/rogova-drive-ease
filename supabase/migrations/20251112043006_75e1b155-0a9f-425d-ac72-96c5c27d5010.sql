-- Fix security warning: set search_path for function
DROP FUNCTION IF EXISTS public.generate_confirmation_number();

CREATE OR REPLACE FUNCTION public.generate_confirmation_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'CONF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$;