-- =========================================================
-- PHASE 8 — BLOC A/C : sécurisation du pointage, sites, documents
-- Migration strictement additive.
-- =========================================================

-- 1) Neutralisation des écritures client directes (contournement serveur)
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "own punch insert" ON public.attendance_punches;

-- 2) Horodatage serveur
ALTER TABLE public.attendance_punches
  ADD COLUMN IF NOT EXISTS server_recorded_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS device_reported_at timestamptz,
  ADD COLUMN IF NOT EXISTS device_drift_seconds integer;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS time_zone text;

-- 3) Référentiel des sites de travail / pointage
CREATE TABLE IF NOT EXISTS public.work_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  site_type text NOT NULL DEFAULT 'bureau',
  address text,
  country text,
  city text,
  latitude numeric,
  longitude numeric,
  radius_meters integer NOT NULL DEFAULT 150,
  time_zone text,
  is_active boolean NOT NULL DEFAULT true,
  observations text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_sites TO authenticated;
GRANT ALL ON public.work_sites TO service_role;
ALTER TABLE public.work_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read work sites" ON public.work_sites
  FOR SELECT TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));

CREATE POLICY "admins manage work sites" ON public.work_sites
  FOR ALL TO authenticated
  USING (public.has_admin_role(auth.uid(), organization_id))
  WITH CHECK (public.has_admin_role(auth.uid(), organization_id));

CREATE TRIGGER trg_work_sites_updated_at
  BEFORE UPDATE ON public.work_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_work_sites_org ON public.work_sites(organization_id);

-- 4) Rattachement agent <-> site (complète staff_assignments, ne le remplace pas)
CREATE TABLE IF NOT EXISTS public.profile_work_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.work_sites(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.staff_assignments(id) ON DELETE SET NULL,
  site_role text NOT NULL DEFAULT 'principal',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_current boolean NOT NULL DEFAULT true,
  comment text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_work_sites TO authenticated;
GRANT ALL ON public.profile_work_sites TO service_role;
ALTER TABLE public.profile_work_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own site links read" ON public.profile_work_sites
  FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id(auth.uid()));

CREATE POLICY "hr read site links" ON public.profile_work_sites
  FOR SELECT TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id));

CREATE POLICY "hr manage site links" ON public.profile_work_sites
  FOR ALL TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id))
  WITH CHECK (public.has_hr_access(auth.uid(), organization_id));

CREATE TRIGGER trg_profile_work_sites_updated_at
  BEFORE UPDATE ON public.profile_work_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_pws_profile ON public.profile_work_sites(profile_id, is_current);

-- 5) Rattachement des affectations, QR et pointages à un site
ALTER TABLE public.staff_assignments
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.work_sites(id) ON DELETE SET NULL;

ALTER TABLE public.attendance_qr_tokens
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.work_sites(id) ON DELETE SET NULL;

ALTER TABLE public.attendance_punches
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.work_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_status text,
  ADD COLUMN IF NOT EXISTS distance_meters numeric,
  ADD COLUMN IF NOT EXISTS location_accuracy_meters numeric,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

-- 6) Réglages de présence : géolocalisation et politique hors site
ALTER TABLE public.attendance_settings
  ADD COLUMN IF NOT EXISTS geo_control_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offsite_policy text NOT NULL DEFAULT 'autorise',
  ADD COLUMN IF NOT EXISTS store_coordinates boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_retention_days integer NOT NULL DEFAULT 90;

-- 7) Coffre documentaire : alignement du stockage sur les 3 niveaux
CREATE OR REPLACE FUNCTION public.can_read_employee_document_path(_path text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_documents d
    WHERE (d.file_url = _path OR d.file_url LIKE '%' || _path)
      AND (
        -- direction : accès complet
        public.has_admin_role(_user_id, d.organization_id)
        -- personnel RH élargi : standard + restreint
        OR (public.has_hr_access(_user_id, d.organization_id)
            AND COALESCE(d.confidentiality, 'standard') IN ('standard', 'restreint'))
        -- agent : ses propres pièces standard
        OR (d.profile_id = public.current_profile_id(_user_id)
            AND COALESCE(d.confidentiality, 'standard') = 'standard')
      )
  )
  -- pièces hors référentiel documentaire (autres usages du bucket) : ancien contrôle
  OR (
    NOT EXISTS (
      SELECT 1 FROM public.employee_documents d2
      WHERE d2.file_url = _path OR d2.file_url LIKE '%' || _path
    )
    AND public.storage_path_in_user_org(_path, _user_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = ANY (ARRAY['admin','directeur_rh','directeur_administratif','directeur_general']::app_role[])
    )
  )
$$;

DROP POLICY IF EXISTS "HR can view organization documents" ON storage.objects;
CREATE POLICY "HR can view organization documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND public.can_read_employee_document_path(name, auth.uid())
  );

-- un agent ne peut pas déposer une pièce classée au-dessus de son niveau
DROP POLICY IF EXISTS "Employees and HR can insert documents" ON public.employee_documents;
CREATE POLICY "Employees and HR can insert documents" ON public.employee_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_admin_role(auth.uid(), organization_id)
    OR (
      profile_id = public.current_profile_id(auth.uid())
      AND public.user_in_organization(auth.uid(), organization_id)
      AND COALESCE(confidentiality, 'standard') = 'standard'
    )
    OR (
      public.has_hr_access(auth.uid(), organization_id)
      AND COALESCE(confidentiality, 'standard') IN ('standard', 'restreint')
    )
  );

-- 8) Moteur central : prise en compte des horaires spéciaux et enseignants
CREATE OR REPLACE FUNCTION public.hr_applicable_schedule(_profile_id uuid, _date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile record;
  _dow integer;
  _sa record;
  _teacher record;
  _ws record;
BEGIN
  SELECT id, organization_id, unit_id INTO _profile FROM profiles WHERE id = _profile_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('source', 'defaut', 'arrival_time', '08:00', 'departure_time', '16:00',
      'tolerance_minutes', 15, 'work_days', ARRAY[1,2,3,4,5]);
  END IF;

  _dow := CASE WHEN EXTRACT(DOW FROM _date) = 0 THEN 7 ELSE EXTRACT(DOW FROM _date)::int END;

  -- a) horaire exceptionnel individuel (période de validité)
  SELECT ssa.*, ss.name AS schedule_name INTO _sa
  FROM special_schedule_assignments ssa
  JOIN special_schedules ss ON ss.id = ssa.schedule_id
  WHERE ssa.profile_id = _profile_id
    AND ss.is_active
    AND _date BETWEEN ss.start_date AND COALESCE(ss.end_date, _date)
  ORDER BY ss.start_date DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'source', 'horaire_special',
      'label', _sa.schedule_name,
      'arrival_time', _sa.start_time,
      'departure_time', _sa.end_time,
      'tolerance_minutes', 15,
      'work_days', COALESCE(_sa.work_days, ARRAY[1,2,3,4,5])
    );
  END IF;

  -- b) horaire d'enseignant (créneaux de cours du jour)
  IF EXISTS (
    SELECT 1 FROM teacher_schedule_slots t
    WHERE t.profile_id = _profile_id AND t.is_active
      AND _date BETWEEN COALESCE(t.valid_from, _date) AND COALESCE(t.valid_to, _date)
  ) THEN
    SELECT MIN(t.start_time) AS first_start, MAX(t.end_time) AS last_end, COUNT(*) AS nb
      INTO _teacher
    FROM teacher_schedule_slots t
    WHERE t.profile_id = _profile_id AND t.is_active
      AND t.day_of_week = _dow
      AND _date BETWEEN COALESCE(t.valid_from, _date) AND COALESCE(t.valid_to, _date);

    IF _teacher.nb > 0 THEN
      RETURN jsonb_build_object(
        'source', 'horaire_enseignant',
        'arrival_time', _teacher.first_start,
        'departure_time', _teacher.last_end,
        'tolerance_minutes', 15,
        'work_days', ARRAY[_dow]
      );
    END IF;

    RETURN jsonb_build_object(
      'source', 'horaire_enseignant',
      'arrival_time', NULL,
      'departure_time', NULL,
      'tolerance_minutes', 15,
      'work_days', ARRAY[]::int[]
    );
  END IF;

  -- c) horaire individuel / structure / organisation
  SELECT * INTO _ws
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

  IF FOUND THEN
    RETURN jsonb_build_object(
      'source', 'horaire_' || _ws.scope,
      'label', _ws.name,
      'arrival_time', _ws.arrival_time,
      'departure_time', _ws.departure_time,
      'tolerance_minutes', COALESCE(_ws.tolerance_minutes, 15),
      'work_days', COALESCE(_ws.work_days, ARRAY[1,2,3,4,5])
    );
  END IF;

  RETURN jsonb_build_object('source', 'defaut', 'arrival_time', '08:00', 'departure_time', '16:00',
    'tolerance_minutes', 15, 'work_days', ARRAY[1,2,3,4,5]);
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_day_status(_profile_id uuid, _date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile record;
  _sched jsonb;
  _dow integer;
  _holiday record;
  _leave record;
  _mission record;
  _auth record;
  _attendance record;
  _expected_arrival time;
  _expected_departure time;
  _tolerance integer;
  _work_days int[];
BEGIN
  SELECT id, organization_id, unit_id, employee_status
    INTO _profile
  FROM profiles WHERE id = _profile_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'unknown', 'source', 'profile_introuvable');
  END IF;

  _sched := public.hr_applicable_schedule(_profile_id, _date);
  _expected_arrival := NULLIF(_sched->>'arrival_time', '')::time;
  _expected_departure := NULLIF(_sched->>'departure_time', '')::time;
  _tolerance := COALESCE((_sched->>'tolerance_minutes')::int, 15);
  _work_days := COALESCE(
    (SELECT array_agg(value::int) FROM jsonb_array_elements_text(_sched->'work_days')),
    ARRAY[]::int[]
  );
  _dow := CASE WHEN EXTRACT(DOW FROM _date) = 0 THEN 7 ELSE EXTRACT(DOW FROM _date)::int END;

  -- 1. suspension administrative
  IF _profile.employee_status IN ('renvoye', 'decede') THEN
    RETURN jsonb_build_object('status', 'suspended', 'source', 'statut_agent',
      'detail', _profile.employee_status);
  END IF;

  -- 2. jour non travaillé / férié
  IF NOT (_dow = ANY (_work_days)) THEN
    RETURN jsonb_build_object('status', 'non_working_day', 'source', _sched->>'source',
      'schedule', _sched);
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
      'leave_type', _leave.leave_type::text,
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

    IF _auth.authorization_type = 'debut_journee' AND _auth.end_time IS NOT NULL THEN
      _expected_arrival := GREATEST(COALESCE(_expected_arrival, _auth.end_time), _auth.end_time);
    ELSIF _auth.authorization_type = 'fin_journee' AND _auth.start_time IS NOT NULL THEN
      _expected_departure := LEAST(COALESCE(_expected_departure, _auth.start_time), _auth.start_time);
    END IF;
  END IF;

  -- 6. pointage effectif
  SELECT * INTO _attendance FROM attendance
  WHERE profile_id = _profile_id AND date = _date LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', CASE
        WHEN _attendance.status IN ('conge','maladie','mission','permission','absent',
                                    'absence_justifiee','absence_non_justifiee','teletravail')
          THEN CASE _attendance.status
                 WHEN 'conge' THEN 'leave'
                 WHEN 'maladie' THEN 'leave'
                 WHEN 'mission' THEN 'mission'
                 WHEN 'permission' THEN 'authorization'
                 WHEN 'teletravail' THEN 'present'
                 ELSE 'absent' END
        WHEN _attendance.check_in_time IS NULL AND _attendance.time IS NULL THEN _attendance.status
        WHEN _expected_arrival IS NOT NULL
             AND COALESCE(_attendance.check_in_time, _attendance.time)
                 > (_expected_arrival + make_interval(mins => _tolerance)) THEN 'late'
        ELSE 'present' END,
      'source', 'pointage',
      'schedule_source', _sched->>'source',
      'expected_arrival', _expected_arrival,
      'expected_departure', _expected_departure,
      'tolerance_minutes', _tolerance,
      'authorization_id', _auth.id,
      'recorded_status', _attendance.status
    );
  END IF;

  -- 7. attendu au travail, pas encore pointé
  RETURN jsonb_build_object('status', 'working', 'source', _sched->>'source',
    'schedule_source', _sched->>'source',
    'expected_arrival', _expected_arrival,
    'expected_departure', _expected_departure,
    'tolerance_minutes', _tolerance,
    'authorization_id', _auth.id);
END;
$$;
