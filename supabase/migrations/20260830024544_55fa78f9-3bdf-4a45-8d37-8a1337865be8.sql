ALTER TABLE public.employee_documents
  DROP CONSTRAINT IF EXISTS employee_documents_document_type_check;

ALTER TABLE public.employee_documents
  ADD CONSTRAINT employee_documents_document_type_check CHECK (
    document_type = ANY (ARRAY[
      'cv','diplome','certificat','piece_identite','lettre_nomination',
      'matricule_fiscale','declaration_impot','autre',
      'passeport','acte_naissance','photo',
      'decision_affectation','decision_promotion','decision_mutation',
      'decision_rappel','lettre_reintegration',
      'contrat','lettre_engagement','description_poste',
      'attestation','certificat_medical','justificatif_absence','decision_conge',
      'ordre_mission','rapport_mission'
    ])
  );

ALTER TABLE public.staff_movements
  ADD COLUMN IF NOT EXISTS decision_date date;

DROP FUNCTION IF EXISTS public.hr_record_career_event(uuid, uuid, text, date, uuid, uuid, uuid, boolean, text, text, text, uuid, text);

CREATE OR REPLACE FUNCTION public.hr_record_career_event(
  _organization_id uuid,
  _profile_id uuid,
  _event_type text,
  _effective_date date,
  _unit_id uuid DEFAULT NULL::uuid,
  _position_id uuid DEFAULT NULL::uuid,
  _supervisor_profile_id uuid DEFAULT NULL::uuid,
  _create_assignment boolean DEFAULT false,
  _assignment_kind text DEFAULT 'principale'::text,
  _new_status text DEFAULT NULL::text,
  _decision_reference text DEFAULT NULL::text,
  _document_id uuid DEFAULT NULL::uuid,
  _notes text DEFAULT NULL::text,
  _decision_date date DEFAULT NULL::date,
  _close_assignment boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _profile record;
  _from_unit text;
  _from_position text;
  _to_unit text;
  _to_position text;
  _assignment_id uuid;
  _closed_assignment_id uuid;
  _movement_id uuid;
  _previous_status text;
BEGIN
  IF NOT public.has_hr_access(auth.uid(), _organization_id) THEN
    RAISE EXCEPTION 'Action refusée : droits RH requis sur cette institution.';
  END IF;

  IF _event_type IS NULL OR btrim(_event_type) = '' THEN
    RAISE EXCEPTION 'Type d''événement de carrière requis.';
  END IF;

  SELECT id, organization_id, full_name, unit_id, position_id, employee_category, administrative_status
    INTO _profile
  FROM public.profiles
  WHERE id = _profile_id AND organization_id = _organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent introuvable dans cette institution.';
  END IF;

  IF _document_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.employee_documents
    WHERE id = _document_id
      AND organization_id = _organization_id
      AND profile_id = _profile_id
  ) THEN
    RAISE EXCEPTION 'Document justificatif invalide pour cet agent.';
  END IF;

  _previous_status := _profile.administrative_status;
  SELECT name INTO _from_unit FROM public.organizational_units WHERE id = _profile.unit_id;
  SELECT name INTO _from_position FROM public.positions WHERE id = _profile.position_id;

  IF _create_assignment THEN
    _assignment_id := public.hr_create_assignment(
      _organization_id := _organization_id,
      _profile_id := _profile_id,
      _start_date := _effective_date,
      _unit_id := _unit_id,
      _position_id := _position_id,
      _supervisor_profile_id := _supervisor_profile_id,
      _assignment_kind := COALESCE(_assignment_kind, 'principale'),
      _decision_reference := _decision_reference,
      _comment := _notes,
      _movement_type := _event_type
    );
  ELSIF _close_assignment THEN
    -- Clôture de l'affectation principale en cours (rappel, fin de mission,
    -- départ, retraite). L'agent et son historique sont conservés.
    SELECT id INTO _closed_assignment_id
    FROM public.staff_assignments
    WHERE profile_id = _profile_id
      AND assignment_kind = 'principale'
      AND is_current = true
    ORDER BY start_date DESC
    LIMIT 1;

    IF _closed_assignment_id IS NOT NULL THEN
      UPDATE public.staff_assignments
      SET is_current = false,
          end_date = GREATEST(start_date, _effective_date),
          decision_reference = COALESCE(decision_reference, _decision_reference),
          updated_at = now()
      WHERE id = _closed_assignment_id;
    END IF;
  END IF;

  SELECT name INTO _to_unit FROM public.organizational_units
    WHERE id = COALESCE(_unit_id, _profile.unit_id);
  SELECT name INTO _to_position FROM public.positions
    WHERE id = COALESCE(_position_id, _profile.position_id);

  IF _new_status IS NOT NULL AND _new_status <> _previous_status THEN
    UPDATE public.profiles
    SET administrative_status = _new_status,
        administrative_status_since = _effective_date,
        updated_at = now()
    WHERE id = _profile_id;
  END IF;

  INSERT INTO public.staff_movements (
    organization_id, employee_id, employee_name, movement_type,
    from_unit, to_unit, from_position, to_position,
    effective_date, decision_date, decision_reference, notes, created_by,
    assignment_id, previous_assignment_id, document_id, previous_status, new_status
  ) VALUES (
    _organization_id, _profile_id, _profile.full_name, _event_type,
    _from_unit, _to_unit, _from_position, _to_position,
    _effective_date, _decision_date, _decision_reference, _notes, auth.uid(),
    _assignment_id, _closed_assignment_id, _document_id, _previous_status,
    COALESCE(_new_status, _previous_status)
  )
  RETURNING id INTO _movement_id;

  INSERT INTO public.hr_audit_log (
    organization_id, profile_id, actor_user_id, entity_type, entity_id,
    action, old_value, new_value, comment
  ) VALUES (
    _organization_id, _profile_id, auth.uid(), 'career_event', _movement_id,
    _event_type,
    jsonb_build_object(
      'unit', _from_unit, 'position', _from_position, 'status', _previous_status,
      'assignment_id', _closed_assignment_id
    ),
    jsonb_build_object(
      'unit', _to_unit, 'position', _to_position,
      'status', COALESCE(_new_status, _previous_status),
      'effective_date', _effective_date,
      'decision_date', _decision_date,
      'decision_reference', _decision_reference,
      'assignment_id', _assignment_id,
      'closed_assignment_id', _closed_assignment_id,
      'document_id', _document_id
    ),
    _notes
  );

  RETURN _movement_id;
END;
$function$;