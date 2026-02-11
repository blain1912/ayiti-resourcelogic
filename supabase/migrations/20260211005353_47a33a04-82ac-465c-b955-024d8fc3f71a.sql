
-- Allow HR/admins to upload documents for employees in their organization
CREATE POLICY "HR can upload organization documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'employee-documents'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'directeur_rh', 'directeur_administratif')
  )
);

-- Allow HR/admins to delete documents for employees in their organization
CREATE POLICY "HR can delete organization documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'employee-documents'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'directeur_rh', 'directeur_administratif')
  )
);
