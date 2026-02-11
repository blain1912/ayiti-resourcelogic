-- Fix infinite recursion in correspondence_approvals RLS
-- The "Approvers can update their step" policy references the same table, causing recursion

-- Create a security definer function to check previous steps
CREATE OR REPLACE FUNCTION public.check_previous_steps_approved(_record_id uuid, _step_order integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.correspondence_approvals
    WHERE record_id = _record_id
      AND step_order < _step_order
      AND status <> 'approved'
  )
$$;

-- Drop the old recursive policy
DROP POLICY IF EXISTS "Approvers can update their step" ON public.correspondence_approvals;

-- Recreate without self-referencing subquery
CREATE POLICY "Approvers can update their step"
ON public.correspondence_approvals
FOR UPDATE
USING (
  status = 'pending'
  AND (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.organization_id = correspondence_approvals.organization_id
        AND (
          (correspondence_approvals.step_role = 'chef_service' AND user_roles.role IN ('admin', 'directeur_general', 'directeur_administratif', 'directeur_rh'))
          OR (correspondence_approvals.step_role = 'directeur_rh' AND user_roles.role IN ('admin', 'directeur_general', 'directeur_rh'))
          OR (correspondence_approvals.step_role = 'directeur_general' AND user_roles.role IN ('admin', 'directeur_general'))
          OR (correspondence_approvals.step_role = 'admin' AND user_roles.role = 'admin')
        )
    )
    OR has_admin_role(auth.uid(), organization_id)
  )
  AND check_previous_steps_approved(record_id, step_order)
);