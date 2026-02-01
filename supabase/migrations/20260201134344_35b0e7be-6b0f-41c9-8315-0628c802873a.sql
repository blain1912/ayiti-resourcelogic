-- Fix search_path for calculate_leave_days function
CREATE OR REPLACE FUNCTION public.calculate_leave_days(start_date date, end_date date)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  total_days numeric := 0;
  current_date_iter date := start_date;
BEGIN
  WHILE current_date_iter <= end_date LOOP
    IF EXTRACT(DOW FROM current_date_iter) NOT IN (0, 6) THEN
      total_days := total_days + 1;
    END IF;
    current_date_iter := current_date_iter + 1;
  END LOOP;
  RETURN total_days;
END;
$$;