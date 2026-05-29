
-- 1. Fix user_roles privilege escalation
DROP POLICY IF EXISTS "Users can create their own roles during onboarding" ON public.user_roles;

CREATE POLICY "Users can self-assign safe or first-admin role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    role IN ('employe'::app_role, 'user'::app_role)
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.organization_id IS NOT DISTINCT FROM user_roles.organization_id
    )
  )
);

-- 2. manual_payments and subscription_history: super admin only
DROP POLICY IF EXISTS "Super admins can manage payments" ON public.manual_payments;
CREATE POLICY "Super admins can manage payments"
ON public.manual_payments
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can view subscription history" ON public.subscription_history;
DROP POLICY IF EXISTS "Super admins can insert subscription history" ON public.subscription_history;
CREATE POLICY "Super admins can view subscription history"
ON public.subscription_history
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can insert subscription history"
ON public.subscription_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- 3. platform_settings: require authentication
DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can view platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

-- 4. Helper: check if storage path belongs to user's organization
CREATE OR REPLACE FUNCTION public.storage_path_in_user_org(_path text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH first_folder AS (
    SELECT (storage.foldername(_path))[1] AS ff
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur, first_folder
    WHERE ur.user_id = _user_id
      AND ur.organization_id IS NOT NULL
      AND (
        (first_folder.ff ~ '^[0-9a-fA-F-]{36}$' AND ur.organization_id::text = first_folder.ff)
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE first_folder.ff ~ '^[0-9a-fA-F-]{36}$'
            AND p.user_id::text = first_folder.ff
            AND p.organization_id = ur.organization_id
        )
      )
  )
$$;

-- 5. organization-logos storage: restrict modifications to admins of the org (folder = org id)
DROP POLICY IF EXISTS "Admins can upload organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete organization logos" ON storage.objects;

CREATE POLICY "Admins can upload organization logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.has_admin_role(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Admins can update organization logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.has_admin_role(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Admins can delete organization logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.has_admin_role(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- 6. employee-documents HR policies: scope to user's organization
DROP POLICY IF EXISTS "HR can view organization documents" ON storage.objects;
DROP POLICY IF EXISTS "HR can upload organization documents" ON storage.objects;
DROP POLICY IF EXISTS "HR can delete organization documents" ON storage.objects;

CREATE POLICY "HR can view organization documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND public.storage_path_in_user_org(name, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'directeur_rh'::app_role, 'directeur_administratif'::app_role, 'directeur_general'::app_role, 'secretaire'::app_role)
  )
);

CREATE POLICY "HR can upload organization documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND public.storage_path_in_user_org(name, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'directeur_rh'::app_role, 'directeur_administratif'::app_role, 'directeur_general'::app_role, 'secretaire'::app_role)
  )
);

CREATE POLICY "HR can delete organization documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND public.storage_path_in_user_org(name, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'directeur_rh'::app_role, 'directeur_administratif'::app_role, 'directeur_general'::app_role)
  )
);

-- 7. cv-documents HR policy: scope to user's organization
DROP POLICY IF EXISTS "HR can view CVs for their organization" ON storage.objects;
CREATE POLICY "HR can view CVs for their organization"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cv-documents'
  AND public.storage_path_in_user_org(name, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'directeur_rh'::app_role, 'directeur_administratif'::app_role, 'directeur_general'::app_role)
  )
);
