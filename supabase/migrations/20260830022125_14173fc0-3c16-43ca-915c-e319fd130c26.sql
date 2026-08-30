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
  _previous_id uuid;
  _previous_unit uuid;
  _previous_position uuid;
  _previous_start date;
  _previous_end date;
  _new_id uuid;
  _kind text := COALESCE(_assignment_kind, 'principale');
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
  IF _kind = 'principale' AND _is_current THEN
    SELECT id, unit_id, position_id, start_date
      INTO _previous_id, _previous_unit, _previous_position, _previous_start
    FROM public.staff_assignments
    WHERE profile_id = _profile_id
      AND assignment_kind = 'principale'
      AND is_current = true
    ORDER BY start_date DESC
    LIMIT 1;

    IF _previous_id IS NOT NULL THEN
      _previous_end := GREATEST(_previous_start, _start_date - 1);
      UPDATE public.staff_assignments
      SET is_current = false, end_date = _previous_end, updated_at = now()
      WHERE id = _previous_id;
    END IF;
  END IF;

  INSERT INTO public.staff_assignments (
    organization_id, profile_id, unit_id, position_id, supervisor_profile_id,
    assignment_kind, workload_percentage, start_date, end_date, is_current,
    decision_reference, comment, created_by
  ) VALUES (
    _organization_id, _profile_id, _unit_id, _position_id, _supervisor_profile_id,
    _kind, _workload_percentage, _start_date, _end_date, _is_current,
    _decision_reference, _comment, auth.uid()
  )
  RETURNING id INTO _new_id;

  IF _kind = 'principale' AND _is_current THEN
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
    CASE WHEN _previous_id IS NULL THEN NULL ELSE jsonb_build_object(
      'assignment_id', _previous_id,
      'unit_id', _previous_unit,
      'unit_name', (SELECT name FROM public.organizational_units WHERE id = _previous_unit),
      'position_id', _previous_position,
      'position_name', (SELECT name FROM public.positions WHERE id = _previous_position),
      'start_date', _previous_start,
      'end_date', _previous_end
    ) END,
    jsonb_build_object(
      'assignment_id', _new_id,
      'assignment_kind', _kind,
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