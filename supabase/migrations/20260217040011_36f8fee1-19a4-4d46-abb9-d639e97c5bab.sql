
-- Allow HR/admins to delete profiles in their organization
CREATE POLICY "RH can delete profiles in organization"
ON public.profiles
FOR DELETE
USING (
  organization_id IN (
    SELECT user_roles.organization_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'directeur_rh')
  )
);
