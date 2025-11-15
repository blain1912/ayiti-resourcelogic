-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can delete their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can insert units in their organization" ON public.organizational_units;
DROP POLICY IF EXISTS "Admins can update units in their organization" ON public.organizational_units;
DROP POLICY IF EXISTS "Admins can delete units in their organization" ON public.organizational_units;
DROP POLICY IF EXISTS "Admins can manage roles in their organization" ON public.user_roles;

-- Drop and recreate has_role function
DROP FUNCTION IF EXISTS public.has_role;
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role, _organization_id UUID)
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
      AND role = _role
      AND organization_id = _organization_id
  )
$$;

-- Create function to check if user has admin-level role
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
      AND role IN ('admin', 'directeur_general', 'directeur_administratif')
  )
$$;

-- Recreate policies
CREATE POLICY "Admins can insert organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'directeur_general', 'directeur_administratif')
  )
);

CREATE POLICY "Admins can update their organization"
ON public.organizations
FOR UPDATE
USING (
  public.has_admin_role(auth.uid(), id)
);

CREATE POLICY "Admins can delete their organization"
ON public.organizations
FOR DELETE
USING (
  public.has_admin_role(auth.uid(), id)
);

CREATE POLICY "Admins can insert units in their organization"
ON public.organizational_units
FOR INSERT
WITH CHECK (
  public.has_admin_role(auth.uid(), organization_id)
);

CREATE POLICY "Admins can update units in their organization"
ON public.organizational_units
FOR UPDATE
USING (
  public.has_admin_role(auth.uid(), organization_id)
);

CREATE POLICY "Admins can delete units in their organization"
ON public.organizational_units
FOR DELETE
USING (
  public.has_admin_role(auth.uid(), organization_id)
);

CREATE POLICY "Admins can manage roles in their organization"
ON public.user_roles
FOR ALL
USING (
  public.has_admin_role(auth.uid(), organization_id)
);