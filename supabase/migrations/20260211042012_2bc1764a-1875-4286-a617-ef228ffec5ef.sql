
-- Approval workflow steps for correspondence
CREATE TABLE public.correspondence_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.correspondence_records(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  step_order integer NOT NULL,
  step_role text NOT NULL, -- 'chef_service', 'directeur_rh', 'directeur_general', etc.
  step_label text NOT NULL, -- Display label
  approver_id uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  comment text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.correspondence_approvals ENABLE ROW LEVEL SECURITY;

-- Users in org can view approvals
CREATE POLICY "Users can view approvals in their org"
ON public.correspondence_approvals FOR SELECT
USING (organization_id IN (
  SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()
));

-- HR admins can create approvals
CREATE POLICY "HR can create approvals"
ON public.correspondence_approvals FOR INSERT
WITH CHECK (has_admin_role(auth.uid(), organization_id));

-- Approvers can update their own pending step
CREATE POLICY "Approvers can update their step"
ON public.correspondence_approvals FOR UPDATE
USING (
  status = 'pending'
  AND (
    -- Check if user has the required role for this step
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
  -- And all previous steps must be approved
  AND NOT EXISTS (
    SELECT 1 FROM correspondence_approvals ca2
    WHERE ca2.record_id = correspondence_approvals.record_id
      AND ca2.step_order < correspondence_approvals.step_order
      AND ca2.status != 'approved'
  )
);

-- HR admins can also manage all approvals
CREATE POLICY "HR can manage all approvals"
ON public.correspondence_approvals FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

-- Add locked field to correspondence_records to prevent edits after signature
ALTER TABLE public.correspondence_records
ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
