-- Create staff_paychecks table
CREATE TABLE public.staff_paychecks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  staff_email TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  payment_method payment_method DEFAULT 'cash',
  notes TEXT,
  paid_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_paychecks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_paychecks
CREATE POLICY "Admins can view all paychecks"
ON public.staff_paychecks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert paychecks"
ON public.staff_paychecks
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update paychecks"
ON public.staff_paychecks
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete paychecks"
ON public.staff_paychecks
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_staff_paychecks_updated_at
BEFORE UPDATE ON public.staff_paychecks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_staff_paychecks_staff_id ON public.staff_paychecks(staff_id);
CREATE INDEX idx_staff_paychecks_period ON public.staff_paychecks(period_start, period_end);
CREATE INDEX idx_staff_paychecks_status ON public.staff_paychecks(status);