-- Add staff_names snapshot column to preserve names even after staff deletion
ALTER TABLE public.completed_services
ADD COLUMN IF NOT EXISTS staff_names text[] DEFAULT '{}'::text[];

-- Backfill staff_names for existing rows where missing, preserving order of staff_ids
UPDATE public.completed_services cs
SET staff_names = COALESCE((
  SELECT ARRAY_AGG(COALESCE(s.name, 'Unknown') ORDER BY u.idx)
  FROM unnest(cs.staff_ids) WITH ORDINALITY AS u(id, idx)
  LEFT JOIN public.staff s ON s.id = u.id
), '{}')
WHERE (cs.staff_names IS NULL OR array_length(cs.staff_names,1) IS NULL);