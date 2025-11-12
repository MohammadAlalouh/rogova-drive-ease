-- Create completed_services table for tracking completed appointments
CREATE TABLE public.completed_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  services_performed JSONB DEFAULT '[]'::jsonb,
  items_purchased TEXT,
  subtotal NUMERIC(10, 2) DEFAULT 0,
  taxes NUMERIC(10, 2) DEFAULT 0,
  total_cost NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.completed_services ENABLE ROW LEVEL SECURITY;

-- Create policies for admins
CREATE POLICY "Admins can view all completed services" 
ON public.completed_services 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert completed services" 
ON public.completed_services 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update completed services" 
ON public.completed_services 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete completed services" 
ON public.completed_services 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_completed_services_updated_at
BEFORE UPDATE ON public.completed_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();