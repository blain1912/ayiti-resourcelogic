-- 1. Fix privilege escalation on user_roles
-- Remove the "Super admins can manage all roles" policy that allows self-escalation via user_id = auth.uid()
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;

-- Recreate: super admins and org admins only (no self-escalation path)
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()) OR has_admin_role(auth.uid(), organization_id))
WITH CHECK (is_super_admin(auth.uid()) OR has_admin_role(auth.uid(), organization_id));

-- Users keep SELECT on their own rows (already exists via "Users can view their own roles")
-- Self-INSERT is still allowed by "Users can self-assign safe or first-admin role" (employe/user only, or first admin)

-- 2. Fix emargement-documents org scoping
DROP POLICY IF EXISTS "HR can view emargement documents" ON storage.objects;
DROP POLICY IF EXISTS "HR can upload emargement documents" ON storage.objects;
DROP POLICY IF EXISTS "HR can delete emargement documents" ON storage.objects;

CREATE POLICY "HR can view emargement documents in their org"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'emargement-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND has_admin_role(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "HR can upload emargement documents in their org"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'emargement-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND has_admin_role(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "HR can delete emargement documents in their org"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'emargement-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND has_admin_role(auth.uid(), ((storage.foldername(name))[1])::uuid)
);