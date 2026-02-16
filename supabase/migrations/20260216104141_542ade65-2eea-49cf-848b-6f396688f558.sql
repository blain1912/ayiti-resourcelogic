
-- Create storage bucket for payroll/emargement documents
INSERT INTO storage.buckets (id, name, public) VALUES ('emargement-documents', 'emargement-documents', false);

-- RLS policies for the bucket
CREATE POLICY "HR can upload emargement documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'emargement-documents' AND EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('admin', 'directeur_rh', 'directeur_administratif', 'directeur_general')
));

CREATE POLICY "HR can view emargement documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'emargement-documents' AND EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('admin', 'directeur_rh', 'directeur_administratif', 'directeur_general')
));

CREATE POLICY "HR can delete emargement documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'emargement-documents' AND EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('admin', 'directeur_rh', 'directeur_administratif', 'directeur_general')
));

-- Table to track uploaded emargement documents
CREATE TABLE public.emargement_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  uploaded_by UUID NOT NULL,
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_label TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.emargement_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can manage emargement documents"
ON public.emargement_documents FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));
