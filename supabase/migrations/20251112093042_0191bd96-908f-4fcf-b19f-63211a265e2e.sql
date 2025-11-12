-- Add discount column to completed_services table
ALTER TABLE completed_services ADD COLUMN discount numeric DEFAULT 0;