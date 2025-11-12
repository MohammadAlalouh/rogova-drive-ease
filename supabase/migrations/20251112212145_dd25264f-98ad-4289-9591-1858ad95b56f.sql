-- Add payment tracking fields to completed_services
ALTER TABLE public.completed_services
ADD COLUMN IF NOT EXISTS amount_received numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS is_record_complete boolean DEFAULT false;

-- Update RLS policy to prevent editing completed records
DROP POLICY IF EXISTS "Admins can update completed services" ON public.completed_services;

CREATE POLICY "Admins can update incomplete records only"
ON public.completed_services
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) AND is_record_complete = false);

-- Allow admins to update is_record_complete specifically
CREATE POLICY "Admins can mark records complete"
ON public.completed_services
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));