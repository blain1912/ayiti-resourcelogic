
-- Update has_admin_role to NOT include secretaire (they're not full admins)
-- Instead, create a helper function for secretaire-level access
CREATE OR REPLACE FUNCTION public.has_hr_access(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _organization_id
      AND role IN ('admin', 'directeur_general', 'directeur_administratif', 'directeur_rh', 'secretaire')
  )
$$;

-- Allow secretaire to view profiles in their organization
CREATE POLICY "Secretaire can view profiles in organization"
ON public.profiles
FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'secretaire'
  )
);

-- Allow secretaire to update profiles in their organization
CREATE POLICY "Secretaire can update profiles in organization"
ON public.profiles
FOR UPDATE
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'secretaire'
  )
);

-- Allow secretaire to insert attendance
CREATE POLICY "Secretaire can insert attendance"
ON public.attendance
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'secretaire'
  )
);

-- Allow secretaire to view attendance
CREATE POLICY "Secretaire can view attendance"
ON public.attendance
FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'secretaire'
  )
);

-- Allow secretaire to update attendance
CREATE POLICY "Secretaire can update attendance"
ON public.attendance
FOR UPDATE
USING (
  organization_id IN (
    SELECT ur.organization_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'secretaire'
  )
);
