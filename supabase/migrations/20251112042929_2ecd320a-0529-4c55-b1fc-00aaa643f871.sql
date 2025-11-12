-- Create enum for appointment status
CREATE TYPE public.appointment_status AS ENUM ('pending', 'in_progress', 'complete', 'cancelled');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_range TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  confirmation_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  service_ids UUID[] NOT NULL,
  notes TEXT,
  status appointment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to generate confirmation number
CREATE OR REPLACE FUNCTION public.generate_confirmation_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'CONF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$;

-- RLS Policies for services
CREATE POLICY "Services are viewable by everyone"
ON public.services FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can insert services"
ON public.services FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update services"
ON public.services FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete services"
ON public.services FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for appointments
CREATE POLICY "Anyone can create appointments"
ON public.appointments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete appointments"
ON public.appointments FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "User roles are viewable by the user themselves"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some default services
INSERT INTO public.services (name, description, price_range, duration_minutes) VALUES
('Oil Change', 'Complete oil change service with filter replacement and fluid top-up', '$50 - $80', 30),
('Brake Service', 'Comprehensive brake inspection, pad replacement, and rotor resurfacing', '$150 - $300', 90),
('Tire Rotation', 'Professional tire rotation and balance for even wear', '$40 - $60', 45),
('Engine Diagnostics', 'Advanced computer diagnostics to identify engine issues', '$80 - $150', 60),
('Battery Check', 'Complete battery testing and replacement if needed', '$100 - $200', 30),
('AC Service', 'Air conditioning system inspection and recharge', '$120 - $250', 60);