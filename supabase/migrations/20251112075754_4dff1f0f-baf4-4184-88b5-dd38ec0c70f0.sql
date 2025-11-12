-- Make appointment_id nullable in completed_services
ALTER TABLE completed_services 
ALTER COLUMN appointment_id DROP NOT NULL;