-- Create a function to check if user can approve leaves
CREATE OR REPLACE FUNCTION public.can_approve_leaves(_user_id uuid, _organization_id uuid)
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
      AND role IN ('admin', 'directeur_general', 'directeur_administratif', 'directeur_rh', 'approbateur_conges')
  )
$$;

-- Update leave_requests RLS policy to include approbateur_conges
DROP POLICY IF EXISTS "HR can view all leave requests in their organization" ON public.leave_requests;
CREATE POLICY "HR can view all leave requests in their organization" 
ON public.leave_requests 
FOR SELECT 
USING (
  organization_id IN (
    SELECT user_roles.organization_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'directeur_rh', 'directeur_administratif', 'directeur_general', 'approbateur_conges')
  )
);

-- Update the ALL policy for HR to include approbateur_conges for managing leave requests
DROP POLICY IF EXISTS "HR can manage leave requests in their organization" ON public.leave_requests;
CREATE POLICY "HR can manage leave requests in their organization" 
ON public.leave_requests 
FOR ALL 
USING (can_approve_leaves(auth.uid(), organization_id))
WITH CHECK (can_approve_leaves(auth.uid(), organization_id));