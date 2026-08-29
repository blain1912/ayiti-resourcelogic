-- 1) Moteur RH central : statut du jour pour toute une organisation en un appel
CREATE OR REPLACE FUNCTION public.hr_day_status_bulk(_organization_id uuid, _date date)
RETURNS TABLE(profile_id uuid, status jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_in_organization(auth.uid(), _organization_id) THEN
    RAISE EXCEPTION 'Accès refusé à cette organisation';
  END IF;

  RETURN QUERY
  SELECT p.id, public.hr_day_status(p.id, _date)
  FROM public.profiles p
  WHERE p.organization_id = _organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.hr_day_status_bulk(uuid, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.hr_day_status_bulk(uuid, date) TO authenticated, service_role;

-- Les fonctions RH existantes doivent rester inaccessibles aux anonymes
REVOKE ALL ON FUNCTION public.hr_day_status(uuid, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.hr_day_status(uuid, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.hr_detect_conflicts(uuid, date, date, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.hr_detect_conflicts(uuid, date, date, uuid) TO authenticated, service_role;

-- 2) Interdiction d'auto-approbation des autorisations
DROP POLICY IF EXISTS absence_auth_manage_hr ON public.absence_authorizations;

CREATE POLICY absence_auth_insert_hr ON public.absence_authorizations
FOR INSERT TO authenticated
WITH CHECK (
  public.has_hr_access(auth.uid(), organization_id)
  OR public.can_approve_leaves(auth.uid(), organization_id)
);

CREATE POLICY absence_auth_review_hr ON public.absence_authorizations
FOR UPDATE TO authenticated
USING (
  (public.has_hr_access(auth.uid(), organization_id)
   OR public.can_approve_leaves(auth.uid(), organization_id))
  AND (
    profile_id IS DISTINCT FROM public.current_profile_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role, organization_id)
  )
)
WITH CHECK (
  (public.has_hr_access(auth.uid(), organization_id)
   OR public.can_approve_leaves(auth.uid(), organization_id))
  AND (
    profile_id IS DISTINCT FROM public.current_profile_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role, organization_id)
  )
);

CREATE POLICY absence_auth_delete_hr ON public.absence_authorizations
FOR DELETE TO authenticated
USING (public.has_hr_access(auth.uid(), organization_id));

-- 3) Interdiction d'auto-approbation des congés
DROP POLICY IF EXISTS "HR can manage leave requests in their organization" ON public.leave_requests;

CREATE POLICY leave_requests_insert_hr ON public.leave_requests
FOR INSERT TO authenticated
WITH CHECK (public.can_approve_leaves(auth.uid(), organization_id));

CREATE POLICY leave_requests_review_hr ON public.leave_requests
FOR UPDATE TO authenticated
USING (
  public.can_approve_leaves(auth.uid(), organization_id)
  AND (
    employee_id IS DISTINCT FROM public.current_profile_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role, organization_id)
  )
)
WITH CHECK (
  public.can_approve_leaves(auth.uid(), organization_id)
  AND (
    employee_id IS DISTINCT FROM public.current_profile_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role, organization_id)
  )
);

CREATE POLICY leave_requests_delete_hr ON public.leave_requests
FOR DELETE TO authenticated
USING (public.can_approve_leaves(auth.uid(), organization_id));