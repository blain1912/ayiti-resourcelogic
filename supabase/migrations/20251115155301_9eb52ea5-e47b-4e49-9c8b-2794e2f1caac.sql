-- Add RLS policy to allow admins to update pending profiles (for approval/rejection)
CREATE POLICY "Admins can update pending profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  approval_status = 'pending' 
  AND organization_id IS NULL
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'directeur_general', 'directeur_administratif', 'directeur_rh')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'directeur_general', 'directeur_administratif', 'directeur_rh')
  )
);