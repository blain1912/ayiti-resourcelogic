-- Mise à jour des RLS policies pour supporter le super admin

-- Fonction pour vérifier si un utilisateur est super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Permettre au super admin de voir toutes les organisations
DROP POLICY IF EXISTS "Super admins can view all organizations" ON public.organizations;
CREATE POLICY "Super admins can view all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()) OR id IN (
  SELECT organization_id
  FROM profiles
  WHERE user_id = auth.uid()
));

-- Permettre au super admin de modifier toutes les organisations
DROP POLICY IF EXISTS "Super admins can update all organizations" ON public.organizations;
CREATE POLICY "Super admins can update all organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()) OR has_admin_role(auth.uid(), id));

-- Permettre au super admin de voir tous les profils
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid()) OR
  auth.uid() = user_id OR
  organization_id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'directeur_rh')
  ) OR
  (approval_status = 'pending' AND organization_id IS NULL AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'directeur_general', 'directeur_administratif', 'directeur_rh')
  ))
);

-- Permettre au super admin de gérer tous les rôles
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  is_super_admin(auth.uid()) OR
  user_id = auth.uid() OR
  has_admin_role(auth.uid(), organization_id)
)
WITH CHECK (
  is_super_admin(auth.uid()) OR
  user_id = auth.uid() OR
  has_admin_role(auth.uid(), organization_id)
);