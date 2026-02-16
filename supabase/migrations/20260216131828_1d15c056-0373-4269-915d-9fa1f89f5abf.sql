
-- Table for shared organization documents (read-only for employees)
CREATE TABLE public.organization_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'autre',
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_documents ENABLE ROW LEVEL SECURITY;

-- All employees in the organization can view/download
CREATE POLICY "Employees can view shared documents"
ON public.organization_documents
FOR SELECT
USING (organization_id IN (
  SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()
));

-- HR/admins can manage
CREATE POLICY "HR can manage shared documents"
ON public.organization_documents
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_organization_documents_updated_at
BEFORE UPDATE ON public.organization_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
