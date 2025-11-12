-- Add staff_hours column to store hours per staff member
ALTER TABLE completed_services 
ADD COLUMN staff_hours jsonb DEFAULT '{}'::jsonb;