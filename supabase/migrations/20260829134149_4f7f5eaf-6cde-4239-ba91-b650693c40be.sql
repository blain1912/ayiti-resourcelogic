-- =========================================================
-- PHASE 6 : Congés, autorisations, missions, affectations
-- =========================================================

-- ---------- 6A : référentiel des types de congé ----------
CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  description text,
  is_paid boolean NOT NULL DEFAULT true,
  requires_justification boolean NOT NULL DEFAULT false,
  max_duration_days numeric,
  annual_entitlement_days numeric,
  applicable_sexe text,
  accrual_mode text NOT NULL DEFAULT 'annual',
  allows_carry_over boolean NOT NULL DEFAULT false,
  carry_over_expires_months integer,
  legacy_enum text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_types TO authenticated;
GRANT ALL ON public.leave_types TO service_role;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_types_select_org" ON public.leave_types FOR SELECT TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));
CREATE POLICY "leave_types_manage_hr" ON public.leave_types FOR ALL TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id))
  WITH CHECK (public.has_hr_access(auth.uid(), organization_id));

CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON public.leave_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- valeurs initiales génériques (administrables ensuite)
INSERT INTO public.leave_types (organization_id, code, label, is_paid, requires_justification, annual_entitlement_days, applicable_sexe, legacy_enum, display_order)
SELECT o.id, v.code, v.label, v.is_paid, v.requires_justification, v.entitlement, v.sexe, v.legacy_enum, v.ord
FROM public.organizations o
CROSS JOIN (VALUES
  ('CA',  'Congé annuel',       true,  false, 20::numeric, NULL::text, 'conge_annuel', 1),
  ('CM',  'Congé maladie',      true,  true,  15::numeric, NULL, 'conge_maladie', 2),
  ('CMAT','Congé maternité',    true,  true,  90::numeric, 'F', 'conge_maternite', 3),
  ('CPAT','Congé paternité',    true,  true,  5::numeric,  'M', 'conge_paternite', 4),
  ('CE',  'Congé exceptionnel', true,  true,  NULL::numeric, NULL, 'conge_exceptionnel', 5),
  ('CSS', 'Congé sans solde',   false, true,  NULL::numeric, NULL, 'conge_sans_solde', 6),
  ('CAD', 'Congé administratif',true,  false, NULL::numeric, NULL, NULL, 7),
  ('AUT', 'Autre',              true,  false, NULL::numeric, NULL, NULL, 8)
) AS v(code, label, is_paid, requires_justification, entitlement, sexe, legacy_enum, ord)
ON CONFLICT (organization_id, code) DO NOTHING;

-- ---------- 6C : enrichissement des demandes de congé ----------
ALTER TYPE public.leave_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.leave_status ADD VALUE IF NOT EXISTS 'in_review';

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS leave_type_id uuid REFERENCES public.leave_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS half_day_start boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS half_day_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS days_count numeric,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS comment text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_step integer NOT NULL DEFAULT 1;

ALTER TABLE public.leave_balances
  ADD COLUMN IF NOT EXISTS leave_type_id uuid REFERENCES public.leave_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reserved_days numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carried_over_days numeric NOT NULL DEFAULT 0;

-- ---------- 6D : historique du circuit de validation ----------
CREATE TABLE public.leave_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  leave_request_id uuid NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 1,
  step_label text NOT NULL,
  step_role text,
  approver_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approver_user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  comment text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_approvals TO authenticated;
GRANT ALL ON public.leave_approvals TO service_role;
ALTER TABLE public.leave_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_approvals_select" ON public.leave_approvals FOR SELECT TO authenticated
  USING (
    public.can_approve_leaves(auth.uid(), organization_id)
    OR public.has_hr_access(auth.uid(), organization_id)
    OR EXISTS (
      SELECT 1 FROM public.leave_requests lr
      WHERE lr.id = leave_approvals.leave_request_id
        AND lr.employee_id = public.current_profile_id(auth.uid())
    )
  );
CREATE POLICY "leave_approvals_manage" ON public.leave_approvals FOR ALL TO authenticated
  USING (public.can_approve_leaves(auth.uid(), organization_id) OR public.has_hr_access(auth.uid(), organization_id))
  WITH CHECK (public.can_approve_leaves(auth.uid(), organization_id) OR public.has_hr_access(auth.uid(), organization_id));

CREATE TRIGGER update_leave_approvals_updated_at BEFORE UPDATE ON public.leave_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 6F : autorisations d'absence ----------
CREATE TABLE public.absence_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time,
  end_time time,
  authorization_type text NOT NULL DEFAULT 'sortie_temporaire',
  reason text NOT NULL,
  comment text,
  attachment_url text,
  status text NOT NULL DEFAULT 'requested',
  requested_by uuid,
  approver_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_absence_auth_profile_date ON public.absence_authorizations (profile_id, date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absence_authorizations TO authenticated;
GRANT ALL ON public.absence_authorizations TO service_role;
ALTER TABLE public.absence_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "absence_auth_select" ON public.absence_authorizations FOR SELECT TO authenticated
  USING (
    profile_id = public.current_profile_id(auth.uid())
    OR public.has_hr_access(auth.uid(), organization_id)
    OR public.can_approve_leaves(auth.uid(), organization_id)
  );
CREATE POLICY "absence_auth_insert_self" ON public.absence_authorizations FOR INSERT TO authenticated
  WITH CHECK (
    public.user_in_organization(auth.uid(), organization_id)
    AND (
      profile_id = public.current_profile_id(auth.uid())
      OR public.has_hr_access(auth.uid(), organization_id)
    )
  );
CREATE POLICY "absence_auth_update_own_pending" ON public.absence_authorizations FOR UPDATE TO authenticated
  USING (profile_id = public.current_profile_id(auth.uid()) AND status IN ('requested','draft'))
  WITH CHECK (profile_id = public.current_profile_id(auth.uid()) AND status IN ('requested','cancelled'));
CREATE POLICY "absence_auth_manage_hr" ON public.absence_authorizations FOR ALL TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id) OR public.can_approve_leaves(auth.uid(), organization_id))
  WITH CHECK (public.has_hr_access(auth.uid(), organization_id) OR public.can_approve_leaves(auth.uid(), organization_id));

CREATE TRIGGER update_absence_authorizations_updated_at BEFORE UPDATE ON public.absence_authorizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 6H : missions ----------
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reference text,
  subject text NOT NULL,
  unit_id uuid REFERENCES public.organizational_units(id) ON DELETE SET NULL,
  destination text,
  country text,
  city text,
  place text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  lead_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  authorized_by uuid,
  observations text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mission_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_in_mission text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mission_id, profile_id)
);
CREATE INDEX idx_mission_participants_profile ON public.mission_participants (profile_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_participants TO authenticated;
GRANT ALL ON public.mission_participants TO service_role;
ALTER TABLE public.mission_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "missions_select_org" ON public.missions FOR SELECT TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));
CREATE POLICY "missions_manage_hr" ON public.missions FOR ALL TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id))
  WITH CHECK (public.has_hr_access(auth.uid(), organization_id));

CREATE POLICY "mission_participants_select_org" ON public.mission_participants FOR SELECT TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));
CREATE POLICY "mission_participants_manage_hr" ON public.mission_participants FOR ALL TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id))
  WITH CHECK (public.has_hr_access(auth.uid(), organization_id));

CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 6L / 6M / 6N : historique des affectations ----------
CREATE TABLE public.staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.organizational_units(id) ON DELETE SET NULL,
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  supervisor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignment_kind text NOT NULL DEFAULT 'principale',
  workload_percentage numeric,
  start_date date NOT NULL,
  end_date date,
  is_current boolean NOT NULL DEFAULT true,
  decision_reference text,
  comment text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_assignments_profile ON public.staff_assignments (profile_id, start_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_assignments TO authenticated;
GRANT ALL ON public.staff_assignments TO service_role;
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_assignments_select" ON public.staff_assignments FOR SELECT TO authenticated
  USING (
    profile_id = public.current_profile_id(auth.uid())
    OR public.user_in_organization(auth.uid(), organization_id)
  );
CREATE POLICY "staff_assignments_manage_hr" ON public.staff_assignments FOR ALL TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id))
  WITH CHECK (public.has_hr_access(auth.uid(), organization_id));

CREATE TRIGGER update_staff_assignments_updated_at BEFORE UPDATE ON public.staff_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.staff_movements
  ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.staff_assignments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS previous_assignment_id uuid REFERENCES public.staff_assignments(id) ON DELETE SET NULL;

-- affectation courante initiale à partir des fiches agents existantes
INSERT INTO public.staff_assignments (organization_id, profile_id, unit_id, position_id, assignment_kind, start_date, is_current, comment)
SELECT p.organization_id, p.id, p.unit_id, p.position_id, 'principale',
       COALESCE(p.date_entree_fonction, p.created_at::date), true, 'Affectation initialisée depuis la fiche agent'
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
  AND (p.unit_id IS NOT NULL OR p.position_id IS NOT NULL);

-- ---------- 6X : journal RH ----------
CREATE TABLE public.hr_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_user_id uuid,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hr_audit_entity ON public.hr_audit_log (organization_id, entity_type, entity_id);
GRANT SELECT, INSERT ON public.hr_audit_log TO authenticated;
GRANT ALL ON public.hr_audit_log TO service_role;
ALTER TABLE public.hr_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_audit_select_hr" ON public.hr_audit_log FOR SELECT TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id) OR profile_id = public.current_profile_id(auth.uid()));
CREATE POLICY "hr_audit_insert_org" ON public.hr_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.user_in_organization(auth.uid(), organization_id));

-- =========================================================
-- 6V / 6W : moteur central de statut RH
-- Priorité : suspension > jour non travaillé/férié > congé approuvé >
-- mission approuvée/en cours > autorisation journée complète >
-- pointage (présent/retard) > autorisation partielle > attendu
-- =========================================================
CREATE OR REPLACE FUNCTION public.hr_day_status(_profile_id uuid, _date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile record;
  _schedule record;
  _dow integer;
  _holiday record;
  _leave record;
  _mission record;
  _auth record;
  _attendance record;
  _expected_arrival time;
  _expected_departure time;
  _tolerance integer;
BEGIN
  SELECT id, organization_id, unit_id, employee_status
    INTO _profile
  FROM profiles WHERE id = _profile_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'unknown', 'source', 'profile_introuvable');
  END IF;

  SELECT * INTO _schedule
  FROM work_schedules ws
  WHERE ws.organization_id = _profile.organization_id
    AND ws.is_active
    AND (
      (ws.scope = 'profile' AND ws.profile_id = _profile_id)
      OR (ws.scope = 'unit' AND ws.unit_id = _profile.unit_id)
      OR ws.scope = 'organization'
    )
  ORDER BY CASE ws.scope WHEN 'profile' THEN 1 WHEN 'unit' THEN 2 ELSE 3 END
  LIMIT 1;

  _expected_arrival := COALESCE(_schedule.arrival_time, '08:00'::time);
  _expected_departure := COALESCE(_schedule.departure_time, '16:00'::time);
  _tolerance := COALESCE(_schedule.tolerance_minutes, 15);
  _dow := CASE WHEN EXTRACT(DOW FROM _date) = 0 THEN 7 ELSE EXTRACT(DOW FROM _date)::int END;

  -- 1. suspension administrative
  IF _profile.employee_status IN ('renvoye', 'decede') THEN
    RETURN jsonb_build_object('status', 'suspended', 'source', 'statut_agent',
      'detail', _profile.employee_status);
  END IF;

  -- 2. jour non travaillé / férié
  IF NOT (_dow = ANY (COALESCE(_schedule.work_days, ARRAY[1,2,3,4,5]))) THEN
    RETURN jsonb_build_object('status', 'non_working_day', 'source', 'horaire');
  END IF;

  SELECT * INTO _holiday FROM attendance_holidays
  WHERE organization_id = _profile.organization_id AND date = _date LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('status', 'holiday', 'source', 'calendrier',
      'detail', _holiday.label);
  END IF;

  -- 3. congé approuvé
  SELECT lr.*, lt.label AS type_label INTO _leave
  FROM leave_requests lr
  LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
  WHERE lr.employee_id = _profile_id
    AND lr.status::text = 'approved'
    AND _date BETWEEN lr.start_date AND lr.end_date
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('status', 'leave', 'source', 'conge',
      'detail', COALESCE(_leave.type_label, _leave.leave_type::text),
      'reference_id', _leave.id);
  END IF;

  -- 4. mission
  SELECT m.* INTO _mission
  FROM missions m
  JOIN mission_participants mp ON mp.mission_id = m.id
  WHERE mp.profile_id = _profile_id
    AND m.status IN ('approved', 'in_progress')
    AND _date BETWEEN m.start_date AND m.end_date
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('status', 'mission', 'source', 'mission',
      'detail', _mission.subject, 'reference_id', _mission.id);
  END IF;

  -- 5. autorisation approuvée
  SELECT * INTO _auth FROM absence_authorizations
  WHERE profile_id = _profile_id AND date = _date AND status = 'approved'
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    IF _auth.authorization_type = 'journee_complete'
       OR (_auth.start_time IS NULL AND _auth.end_time IS NULL) THEN
      RETURN jsonb_build_object('status', 'authorization', 'source', 'autorisation',
        'detail', _auth.reason, 'reference_id', _auth.id);
    END IF;

    -- autorisation partielle : ajuste l'heure attendue (6G)
    IF _auth.authorization_type = 'debut_journee' AND _auth.end_time IS NOT NULL THEN
      _expected_arrival := GREATEST(_expected_arrival, _auth.end_time);
    ELSIF _auth.authorization_type = 'fin_journee' AND _auth.start_time IS NOT NULL THEN
      _expected_departure := LEAST(_expected_departure, _auth.start_time);
    END IF;
  END IF;

  -- 6. pointage effectif
  SELECT * INTO _attendance FROM attendance
  WHERE profile_id = _profile_id AND date = _date LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', CASE
        WHEN _attendance.check_in_time IS NULL AND _attendance.time IS NULL THEN _attendance.status
        WHEN COALESCE(_attendance.check_in_time, _attendance.time)
             > (_expected_arrival + make_interval(mins => _tolerance)) THEN 'late'
        ELSE 'present' END,
      'source', 'pointage',
      'expected_arrival', _expected_arrival,
      'expected_departure', _expected_departure,
      'tolerance_minutes', _tolerance,
      'authorization_id', _auth.id,
      'recorded_status', _attendance.status
    );
  END IF;

  -- 7. attendu au travail, pas encore pointé
  RETURN jsonb_build_object('status', 'working', 'source', 'horaire',
    'expected_arrival', _expected_arrival,
    'expected_departure', _expected_departure,
    'tolerance_minutes', _tolerance,
    'authorization_id', _auth.id);
END;
$$;

REVOKE ALL ON FUNCTION public.hr_day_status(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_day_status(uuid, date) TO authenticated, service_role;

-- 6U : détection des chevauchements
CREATE OR REPLACE FUNCTION public.hr_detect_conflicts(_profile_id uuid, _start date, _end date, _exclude_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) FROM (
    SELECT 'leave' AS kind, lr.id, lr.start_date, lr.end_date, lr.status::text
    FROM leave_requests lr
    WHERE lr.employee_id = _profile_id
      AND lr.status::text IN ('approved', 'pending', 'in_review')
      AND (_exclude_id IS NULL OR lr.id <> _exclude_id)
      AND daterange(lr.start_date, lr.end_date, '[]') && daterange(_start, _end, '[]')
    UNION ALL
    SELECT 'mission', m.id, m.start_date, m.end_date, m.status
    FROM missions m
    JOIN mission_participants mp ON mp.mission_id = m.id
    WHERE mp.profile_id = _profile_id
      AND m.status IN ('planned', 'approved', 'in_progress')
      AND (_exclude_id IS NULL OR m.id <> _exclude_id)
      AND daterange(m.start_date, m.end_date, '[]') && daterange(_start, _end, '[]')
    UNION ALL
    SELECT 'authorization', a.id, a.date, a.date, a.status
    FROM absence_authorizations a
    WHERE a.profile_id = _profile_id
      AND a.status = 'approved'
      AND a.authorization_type = 'journee_complete'
      AND (_exclude_id IS NULL OR a.id <> _exclude_id)
      AND a.date BETWEEN _start AND _end
  ) c;
$$;

REVOKE ALL ON FUNCTION public.hr_detect_conflicts(uuid, date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_detect_conflicts(uuid, date, date, uuid) TO authenticated, service_role;