-- Create leave types enum
CREATE TYPE public.leave_type AS ENUM (
  'conge_annuel',
  'conge_maladie',
  'conge_maternite',
  'conge_paternite',
  'conge_sans_solde',
  'conge_exceptionnel',
  'conge_etudes'
);

-- Create leave request status enum
CREATE TYPE public.leave_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

-- Create leave requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status leave_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view their own leave requests
CREATE POLICY "Employees can view their own leave requests"
ON public.leave_requests
FOR SELECT
USING (employee_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Employees can create their own leave requests
CREATE POLICY "Employees can create their own leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (
  employee_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
);

-- Employees can cancel their own pending requests
CREATE POLICY "Employees can cancel their own pending requests"
ON public.leave_requests
FOR UPDATE
USING (
  employee_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND status = 'pending'
);

-- HR can view all leave requests in their organization
CREATE POLICY "HR can view all leave requests in their organization"
ON public.leave_requests
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'directeur_rh', 'directeur_administratif', 'directeur_general')
  )
);

-- HR can manage leave requests in their organization
CREATE POLICY "HR can manage leave requests in their organization"
ON public.leave_requests
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

-- Create trigger for updated_at
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();