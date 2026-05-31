
-- Pension request status enum
DO $$ BEGIN
  CREATE TYPE public.pension_request_status AS ENUM (
    'brouillon', 'soumis_drh', 'valide_drh', 'transmis_dpc',
    'en_instruction', 'accordee', 'rejetee'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main table
CREATE TABLE IF NOT EXISTS public.pension_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  status public.pension_request_status NOT NULL DEFAULT 'brouillon',
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  age_years integer,
  service_years numeric,
  is_eligible boolean,
  eligibility_notes text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  comments text,
  drh_comment text,
  dpc_reference text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pension_requests TO authenticated;
GRANT ALL ON public.pension_requests TO service_role;

ALTER TABLE public.pension_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view their own pension requests"
  ON public.pension_requests FOR SELECT
  USING (employee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Employees can create their own pension requests"
  ON public.pension_requests FOR INSERT
  WITH CHECK (
    employee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Employees can update their own draft pension requests"
  ON public.pension_requests FOR UPDATE
  USING (
    employee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND status IN ('brouillon', 'soumis_drh')
  );

CREATE POLICY "HR can manage pension requests in their org"
  ON public.pension_requests FOR ALL
  USING (public.has_admin_role(auth.uid(), organization_id))
  WITH CHECK (public.has_admin_role(auth.uid(), organization_id));

CREATE TRIGGER update_pension_requests_updated_at
  BEFORE UPDATE ON public.pension_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
