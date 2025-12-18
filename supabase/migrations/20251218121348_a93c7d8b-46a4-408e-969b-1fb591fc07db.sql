-- Create employee documents table
CREATE TABLE public.employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('cv', 'diplome', 'certificat', 'piece_identite', 'lettre_nomination', 'autre')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Employees can view their own documents
CREATE POLICY "Employees can view their own documents"
ON public.employee_documents
FOR SELECT
USING (profile_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Employees can insert their own documents
CREATE POLICY "Employees can insert their own documents"
ON public.employee_documents
FOR INSERT
WITH CHECK (
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
);

-- Employees can delete their own documents
CREATE POLICY "Employees can delete their own documents"
ON public.employee_documents
FOR DELETE
USING (profile_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- HR can view all documents in their organization
CREATE POLICY "HR can view documents in their organization"
ON public.employee_documents
FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM user_roles
  WHERE user_id = auth.uid()
  AND role IN ('admin', 'directeur_rh', 'directeur_administratif')
));

-- HR can manage all documents in their organization
CREATE POLICY "HR can manage documents in their organization"
ON public.employee_documents
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-documents', 'employee-documents', false);

-- Storage policies: employees can upload/view their own documents
CREATE POLICY "Employees can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Employees can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'employee-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Employees can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- HR can view all documents in organization (via signed URLs from backend)
CREATE POLICY "HR can view organization documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'employee-documents'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'directeur_rh', 'directeur_administratif')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_employee_documents_updated_at
BEFORE UPDATE ON public.employee_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();