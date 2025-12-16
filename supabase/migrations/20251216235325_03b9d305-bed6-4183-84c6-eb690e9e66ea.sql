-- Allow HR to view CVs for applications in their organization
CREATE POLICY "HR can view CVs for their organization"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cv-documents' 
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'directeur_rh', 'directeur_administratif', 'directeur_general')
  )
);