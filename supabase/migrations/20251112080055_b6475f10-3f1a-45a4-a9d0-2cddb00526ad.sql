-- Add appointment information columns to completed_services
ALTER TABLE completed_services 
ADD COLUMN customer_name text,
ADD COLUMN customer_phone text,
ADD COLUMN customer_email text,
ADD COLUMN car_make text,
ADD COLUMN car_model text,
ADD COLUMN car_year integer,
ADD COLUMN appointment_date date,
ADD COLUMN appointment_time time,
ADD COLUMN confirmation_number text;