-- Make completed_services immutable by removing UPDATE policy
DROP POLICY IF EXISTS "Admins can update completed services" ON public.completed_services;

-- Add comment to document this is an immutable audit table
COMMENT ON TABLE public.completed_services IS 'Immutable audit table - records cannot be edited or deleted once created';