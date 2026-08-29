CREATE POLICY "HR can create agent records in their organization"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (
  organization_id IS NOT NULL
  AND public.has_hr_access(auth.uid(), organization_id)
  AND user_id IS NULL
  AND public.check_user_limit(organization_id)
);