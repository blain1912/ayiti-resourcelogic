CREATE TABLE public.staff_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  employee_name text NOT NULL,
  employee_code text,
  movement_type text NOT NULL,
  from_unit text,
  to_unit text,
  from_position text,
  to_position text,
  from_category text,
  to_category text,
  effective_date date NOT NULL,
  decision_reference text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_movements TO authenticated;
GRANT ALL ON public.staff_movements TO service_role;

ALTER TABLE public.staff_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can manage movements in their organization"
ON public.staff_movements
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

CREATE POLICY "Employees can view their own movements"
ON public.staff_movements
FOR SELECT
USING (employee_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE INDEX idx_staff_movements_org ON public.staff_movements(organization_id, effective_date DESC);
CREATE INDEX idx_staff_movements_employee ON public.staff_movements(employee_id);

CREATE TRIGGER update_staff_movements_updated_at
BEFORE UPDATE ON public.staff_movements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();