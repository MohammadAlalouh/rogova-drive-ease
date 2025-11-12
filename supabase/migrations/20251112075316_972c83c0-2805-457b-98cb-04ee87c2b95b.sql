-- Add payment method to completed_services table
CREATE TYPE payment_method AS ENUM ('cash', 'visa', 'mastercard', 'etransfer', 'other');

ALTER TABLE completed_services 
ADD COLUMN payment_method payment_method NOT NULL DEFAULT 'cash';