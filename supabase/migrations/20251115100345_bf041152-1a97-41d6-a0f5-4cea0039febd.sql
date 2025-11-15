-- Update the has_admin_role function to include directeur_rh
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id UUID, _organization_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _organization_id
      AND role IN ('admin', 'directeur_general', 'directeur_administratif', 'directeur_rh')
  )
$$;

-- Update policies to include directeur_rh
DROP POLICY IF EXISTS "Admins can insert organizations" ON public.organizations;
CREATE POLICY "Admins can insert organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'directeur_general', 'directeur_administratif', 'directeur_rh')
  )
);