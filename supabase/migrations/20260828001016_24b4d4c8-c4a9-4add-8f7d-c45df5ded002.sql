DROP POLICY IF EXISTS "Users can self-assign safe or first-admin role" ON public.user_roles;

CREATE POLICY "Users can self-assign safe or first-org-admin role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    role = ANY (ARRAY['employe'::app_role, 'user'::app_role])
    OR (
      organization_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.organization_id = user_roles.organization_id
      )
    )
  )
);