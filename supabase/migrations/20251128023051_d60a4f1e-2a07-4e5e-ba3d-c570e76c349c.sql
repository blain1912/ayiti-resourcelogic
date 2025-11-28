-- Add time and updated notes column to attendance table
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS time TIME DEFAULT CURRENT_TIME;

-- Add comment to explain the time column
COMMENT ON COLUMN public.attendance.time IS 'Time when attendance was marked';