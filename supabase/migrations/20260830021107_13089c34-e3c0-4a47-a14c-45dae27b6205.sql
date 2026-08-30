-- 1. Empêcher un agent d'approuver sa propre demande via la police d'annulation
DROP POLICY IF EXISTS "Employees can cancel their own pending requests" ON public.leave_requests;
CREATE POLICY "Employees can cancel their own pending requests"
ON public.leave_requests
FOR UPDATE
TO authenticated
USING (
  employee_id = public.current_profile_id(auth.uid())
  AND status IN ('pending'::leave_status, 'draft'::leave_status, 'in_review'::leave_status)
)
WITH CHECK (
  employee_id = public.current_profile_id(auth.uid())
  AND status = 'cancelled'::leave_status
);

-- 2. Réaffectation atomique côté serveur
CREATE OR REPLACE FUNCTION public.hr_create_assignment(
  _organization_id uuid,
  _profile_id uuid,
  _start_date date,
  _unit_id uuid DEFAULT NULL,
  _position_id uuid DEFAULT NULL,
  _supervisor_profile_id uuid DEFAULT NULL,
  _assignment_kind text DEFAULT 'principale',
  _workload_percentage numeric DEFAULT NULL,
  _end_date date DEFAULT NULL,
  _decision_reference text DEFAULT NULL,
  _comment text DEFAULT NULL,
  _movement_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _previous record;
  _new_id uuid;
  _is_current boolean := _end_date IS NULL;
BEGIN
  IF NOT public.has_hr_access(auth.uid(), _organization_id) THEN
    RAISE EXCEPTION 'Action refusée : droits RH requis sur cette institution.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _profile_id AND organization_id = _organization_id
  ) THEN
    RAISE EXCEPTION 'Agent introuvable dans cette institution.';
  END IF;

  -- Clôture automatique uniquement pour une nouvelle affectation PRINCIPALE courante
  IF COALESCE(_assignment_kind, 'principale') = 'principale' AND _is_current THEN
    SELECT * INTO _previous
    FROM public.staff_assignments
    WHERE profile_id = _profile_id
      AND assignment_kind = 'principale'
      AND is_current = true
    ORDER BY start_date DESC
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.staff_assignments
      SET is_current = false,
          end_date = GREATEST(_previous.start_date, _start_date - 1),
          updated_at = now()
      WHERE id = _previous.id;
    END IF;
  END IF;

  INSERT INTO public.staff_assignments (
    organization_id, profile_id, unit_id, position_id, supervisor_profile_id,
    assignment_kind, workload_percentage, start_date, end_date, is_current,
    decision_reference, comment, created_by
  ) VALUES (
    _organization_id, _profile_id, _unit_id, _position_id, _supervisor_profile_id,
    COALESCE(_assignment_kind, 'principale'), _workload_percentage, _start_date, _end_date, _is_current,
    _decision_reference, _comment, auth.uid()
  )
  RETURNING id INTO _new_id;

  -- Synchronise la fiche agent seulement pour l'affectation principale courante
  IF COALESCE(_assignment_kind, 'principale') = 'principale' AND _is_current THEN
    UPDATE public.profiles
    SET unit_id = _unit_id, position_id = _position_id
    WHERE id = _profile_id;
  END IF;

  INSERT INTO public.hr_audit_log (
    organization_id, profile_id, actor_user_id, entity_type, entity_id,
    action, old_value, new_value, comment
  ) VALUES (
    _organization_id, _profile_id, auth.uid(), 'staff_assignment', _new_id,
    COALESCE(_movement_type, 'created'),
    CASE WHEN _previous.id IS NULL THEN NULL ELSE jsonb_build_object(
      'assignment_id', _previous.id,
      'unit_id', _previous.unit_id,
      'unit_name', (SELECT name FROM public.organizational_units WHERE id = _previous.unit_id),
      'position_id', _previous.position_id,
      'position_name', (SELECT name FROM public.positions WHERE id = _previous.position_id),
      'start_date', _previous.start_date,
      'end_date', GREATEST(_previous.start_date, _start_date - 1)
    ) END,
    jsonb_build_object(
      'assignment_id', _new_id,
      'assignment_kind', COALESCE(_assignment_kind, 'principale'),
      'unit_id', _unit_id,
      'unit_name', (SELECT name FROM public.organizational_units WHERE id = _unit_id),
      'position_id', _position_id,
      'position_name', (SELECT name FROM public.positions WHERE id = _position_id),
      'workload_percentage', _workload_percentage,
      'start_date', _start_date,
      'end_date', _end_date,
      'decision_reference', _decision_reference
    ),
    _comment
  );

  RETURN _new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.hr_create_assignment(uuid, uuid, date, uuid, uuid, uuid, text, numeric, date, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.hr_create_assignment(uuid, uuid, date, uuid, uuid, uuid, text, numeric, date, text, text, text) TO authenticated;