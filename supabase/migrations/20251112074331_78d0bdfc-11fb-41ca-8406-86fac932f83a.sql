-- Remove CASCADE delete from completed_services foreign key to prevent deletion when appointment is deleted
ALTER TABLE completed_services 
DROP CONSTRAINT IF EXISTS completed_services_appointment_id_fkey;

-- Add the foreign key back without CASCADE delete
ALTER TABLE completed_services 
ADD CONSTRAINT completed_services_appointment_id_fkey 
FOREIGN KEY (appointment_id) 
REFERENCES appointments(id) 
ON DELETE SET NULL;