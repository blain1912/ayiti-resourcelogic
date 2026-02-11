
-- Drop the existing insert policy
DROP POLICY IF EXISTS "Employees can insert their own documents" ON public.employee_documents;

-- Create a new insert policy that allows both employees and HR
CREATE POLICY "Employees and HR can insert documents"
ON public.employee_documents
FOR INSERT
WITH CHECK (
  (
    -- Employee can insert their own documents
    (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
    AND
    (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()))
  )
  OR
  -- HR can insert documents for employees in their organization
  has_admin_role(auth.uid(), organization_id)
);
