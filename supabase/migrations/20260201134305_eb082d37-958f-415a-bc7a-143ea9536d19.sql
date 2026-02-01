-- Create leave_balances table
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type public.leave_type NOT NULL,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  total_days numeric(5,1) NOT NULL DEFAULT 0,
  used_days numeric(5,1) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type, year)
);

-- Enable RLS
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- Create update trigger
CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Employees can view their own balances
CREATE POLICY "Employees can view their own leave balances"
ON public.leave_balances
FOR SELECT
USING (employee_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- HR can view all balances in their organization
CREATE POLICY "HR can view all leave balances in their organization"
ON public.leave_balances
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'directeur_rh', 'directeur_administratif', 'directeur_general', 'approbateur_conges')
  )
);

-- HR can manage balances in their organization
CREATE POLICY "HR can manage leave balances in their organization"
ON public.leave_balances
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

-- Function to calculate days between two dates (excluding weekends)
CREATE OR REPLACE FUNCTION public.calculate_leave_days(start_date date, end_date date)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  total_days numeric := 0;
  current_date_iter date := start_date;
BEGIN
  WHILE current_date_iter <= end_date LOOP
    -- Exclude weekends (0 = Sunday, 6 = Saturday in PostgreSQL's DOW)
    IF EXTRACT(DOW FROM current_date_iter) NOT IN (0, 6) THEN
      total_days := total_days + 1;
    END IF;
    current_date_iter := current_date_iter + 1;
  END LOOP;
  RETURN total_days;
END;
$$;

-- Function to update leave balance when a leave is approved
CREATE OR REPLACE FUNCTION public.update_leave_balance_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_used numeric;
  current_year integer;
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    days_used := calculate_leave_days(NEW.start_date, NEW.end_date);
    current_year := EXTRACT(YEAR FROM NEW.start_date);
    
    -- Insert or update the balance
    INSERT INTO leave_balances (organization_id, employee_id, leave_type, year, used_days)
    VALUES (NEW.organization_id, NEW.employee_id, NEW.leave_type, current_year, days_used)
    ON CONFLICT (employee_id, leave_type, year)
    DO UPDATE SET 
      used_days = leave_balances.used_days + days_used,
      updated_at = now();
  END IF;
  
  -- Handle cancellation of approved leave
  IF OLD.status = 'approved' AND NEW.status = 'cancelled' THEN
    days_used := calculate_leave_days(OLD.start_date, OLD.end_date);
    current_year := EXTRACT(YEAR FROM OLD.start_date);
    
    UPDATE leave_balances
    SET used_days = GREATEST(0, used_days - days_used),
        updated_at = now()
    WHERE employee_id = OLD.employee_id
      AND leave_type = OLD.leave_type
      AND year = current_year;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update balances
CREATE TRIGGER update_leave_balance_trigger
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leave_balance_on_approval();