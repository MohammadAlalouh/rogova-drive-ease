-- Drop the DELETE policy for completed_services to make them immutable
DROP POLICY IF EXISTS "Admins can delete completed services" ON public.completed_services;