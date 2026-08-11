CREATE POLICY "HR leadership can view profiles in organization"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_hr_access(auth.uid(), organization_id));

CREATE POLICY "HR leadership can update profiles in organization"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_hr_access(auth.uid(), organization_id))
WITH CHECK (public.has_hr_access(auth.uid(), organization_id));