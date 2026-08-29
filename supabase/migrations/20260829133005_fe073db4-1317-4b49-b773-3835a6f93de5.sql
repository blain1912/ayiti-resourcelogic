-- Helper: organization membership
CREATE OR REPLACE FUNCTION public.user_in_organization(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.organization_id = _organization_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.organization_id = _organization_id
  )
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 1. Attendance settings
CREATE TABLE public.attendance_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  manual_enabled boolean NOT NULL DEFAULT true,
  central_qr_enabled boolean NOT NULL DEFAULT false,
  individual_qr_enabled boolean NOT NULL DEFAULT false,
  telework_enabled boolean NOT NULL DEFAULT false,
  anti_double_seconds integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_settings TO authenticated;
GRANT ALL ON public.attendance_settings TO service_role;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read attendance settings" ON public.attendance_settings
  FOR SELECT TO authenticated USING (public.user_in_organization(auth.uid(), organization_id));
CREATE POLICY "admins manage attendance settings" ON public.attendance_settings
  FOR ALL TO authenticated
  USING (public.has_admin_role(auth.uid(), organization_id))
  WITH CHECK (public.has_admin_role(auth.uid(), organization_id));
CREATE TRIGGER trg_attendance_settings_updated_at BEFORE UPDATE ON public.attendance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Work schedules (organization / unit / profile scope)
CREATE TABLE public.work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'organization',
  unit_id uuid REFERENCES public.organizational_units(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Horaire standard',
  work_days smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::smallint[],
  arrival_time time NOT NULL DEFAULT '08:00',
  departure_time time NOT NULL DEFAULT '16:00',
  break_start time,
  break_end time,
  tolerance_minutes integer NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_schedules_scope_check CHECK (scope IN ('organization','unit','profile')),
  CONSTRAINT work_schedules_scope_target_check CHECK (
    (scope = 'organization' AND unit_id IS NULL AND profile_id IS NULL) OR
    (scope = 'unit' AND unit_id IS NOT NULL AND profile_id IS NULL) OR
    (scope = 'profile' AND profile_id IS NOT NULL AND unit_id IS NULL)
  )
);
CREATE UNIQUE INDEX work_schedules_org_unique ON public.work_schedules(organization_id) WHERE scope = 'organization';
CREATE UNIQUE INDEX work_schedules_unit_unique ON public.work_schedules(unit_id) WHERE scope = 'unit';
CREATE UNIQUE INDEX work_schedules_profile_unique ON public.work_schedules(profile_id) WHERE scope = 'profile';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_schedules TO authenticated;
GRANT ALL ON public.work_schedules TO service_role;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read work schedules" ON public.work_schedules
  FOR SELECT TO authenticated USING (public.user_in_organization(auth.uid(), organization_id));
CREATE POLICY "hr manage work schedules" ON public.work_schedules
  FOR ALL TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id))
  WITH CHECK (public.has_hr_access(auth.uid(), organization_id));
CREATE TRIGGER trg_work_schedules_updated_at BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Non-working days calendar
CREATE TABLE public.attendance_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date date NOT NULL,
  label text NOT NULL,
  type text NOT NULL DEFAULT 'ferie',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_holidays_type_check CHECK (type IN ('ferie','fermeture','institutionnel','evenement','autre')),
  CONSTRAINT attendance_holidays_unique UNIQUE (organization_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_holidays TO authenticated;
GRANT ALL ON public.attendance_holidays TO service_role;
ALTER TABLE public.attendance_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read holidays" ON public.attendance_holidays
  FOR SELECT TO authenticated USING (public.user_in_organization(auth.uid(), organization_id));
CREATE POLICY "hr manage holidays" ON public.attendance_holidays
  FOR ALL TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id))
  WITH CHECK (public.has_hr_access(auth.uid(), organization_id));
CREATE TRIGGER trg_attendance_holidays_updated_at BEFORE UPDATE ON public.attendance_holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Secure QR tokens (central + individual)
CREATE TABLE public.attendance_qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope text NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  label text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_qr_tokens_scope_check CHECK (scope IN ('central','individual')),
  CONSTRAINT attendance_qr_tokens_status_check CHECK (status IN ('active','revoked')),
  CONSTRAINT attendance_qr_tokens_target_check CHECK (
    (scope = 'central' AND profile_id IS NULL) OR (scope = 'individual' AND profile_id IS NOT NULL)
  )
);
CREATE INDEX attendance_qr_tokens_org_idx ON public.attendance_qr_tokens(organization_id, scope, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_qr_tokens TO authenticated;
GRANT ALL ON public.attendance_qr_tokens TO service_role;
ALTER TABLE public.attendance_qr_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr read qr tokens" ON public.attendance_qr_tokens
  FOR SELECT TO authenticated USING (public.has_hr_access(auth.uid(), organization_id));
CREATE POLICY "own individual qr token" ON public.attendance_qr_tokens
  FOR SELECT TO authenticated
  USING (scope = 'individual' AND profile_id = public.current_profile_id(auth.uid()));
CREATE POLICY "hr manage qr tokens" ON public.attendance_qr_tokens
  FOR ALL TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id))
  WITH CHECK (public.has_hr_access(auth.uid(), organization_id));
CREATE TRIGGER trg_attendance_qr_tokens_updated_at BEFORE UPDATE ON public.attendance_qr_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Detailed punches
CREATE TABLE public.attendance_punches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  punch_time time NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::time,
  punched_at timestamptz NOT NULL DEFAULT now(),
  punch_type text NOT NULL DEFAULT 'arrivee',
  method text NOT NULL DEFAULT 'manuel',
  expected_time time,
  tolerance_minutes integer,
  late_minutes integer NOT NULL DEFAULT 0,
  token_id uuid REFERENCES public.attendance_qr_tokens(id) ON DELETE SET NULL,
  recorded_by uuid,
  notes text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_punches_type_check CHECK (punch_type IN ('arrivee','depart','pause','reprise','sortie_temporaire','retour')),
  CONSTRAINT attendance_punches_method_check CHECK (method IN ('manuel','qr_central','qr_individuel','correction','import'))
);
CREATE INDEX attendance_punches_lookup_idx ON public.attendance_punches(organization_id, date, profile_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_punches TO authenticated;
GRANT ALL ON public.attendance_punches TO service_role;
ALTER TABLE public.attendance_punches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr read punches" ON public.attendance_punches
  FOR SELECT TO authenticated USING (public.has_hr_access(auth.uid(), organization_id));
CREATE POLICY "own punches read" ON public.attendance_punches
  FOR SELECT TO authenticated USING (profile_id = public.current_profile_id(auth.uid()));
CREATE POLICY "own punch insert" ON public.attendance_punches
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = public.current_profile_id(auth.uid())
    AND public.user_in_organization(auth.uid(), organization_id)
  );
CREATE POLICY "hr manage punches" ON public.attendance_punches
  FOR ALL TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id))
  WITH CHECK (public.has_hr_access(auth.uid(), organization_id));
CREATE TRIGGER trg_attendance_punches_updated_at BEFORE UPDATE ON public.attendance_punches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Correction requests
CREATE TABLE public.attendance_correction_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by uuid,
  date date NOT NULL,
  punch_type text NOT NULL DEFAULT 'arrivee',
  proposed_time time,
  reason text NOT NULL,
  justification text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_correction_status_check CHECK (status IN ('pending','approved','rejected')),
  CONSTRAINT attendance_correction_type_check CHECK (punch_type IN ('arrivee','depart','pause','reprise','sortie_temporaire','retour'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_correction_requests TO authenticated;
GRANT ALL ON public.attendance_correction_requests TO service_role;
ALTER TABLE public.attendance_correction_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own correction requests read" ON public.attendance_correction_requests
  FOR SELECT TO authenticated USING (profile_id = public.current_profile_id(auth.uid()));
CREATE POLICY "own correction requests insert" ON public.attendance_correction_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = public.current_profile_id(auth.uid())
    AND public.user_in_organization(auth.uid(), organization_id)
    AND status = 'pending'
  );
CREATE POLICY "hr manage correction requests" ON public.attendance_correction_requests
  FOR ALL TO authenticated
  USING (public.has_hr_access(auth.uid(), organization_id))
  WITH CHECK (public.has_hr_access(auth.uid(), organization_id));
CREATE TRIGGER trg_attendance_correction_updated_at BEFORE UPDATE ON public.attendance_correction_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Attendance audit log
CREATE TABLE public.attendance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_user_id uuid,
  action text NOT NULL,
  method text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attendance_audit_log_org_idx ON public.attendance_audit_log(organization_id, created_at DESC);
GRANT SELECT, INSERT ON public.attendance_audit_log TO authenticated;
GRANT ALL ON public.attendance_audit_log TO service_role;
ALTER TABLE public.attendance_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr read attendance audit" ON public.attendance_audit_log
  FOR SELECT TO authenticated USING (public.has_hr_access(auth.uid(), organization_id));
CREATE POLICY "members insert attendance audit" ON public.attendance_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.user_in_organization(auth.uid(), organization_id));

-- 8. Enrich existing attendance table (non destructive)
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'manuel',
  ADD COLUMN IF NOT EXISTS check_in_time time,
  ADD COLUMN IF NOT EXISTS check_out_time time,
  ADD COLUMN IF NOT EXISTS expected_time time,
  ADD COLUMN IF NOT EXISTS tolerance_minutes integer,
  ADD COLUMN IF NOT EXISTS late_minutes integer NOT NULL DEFAULT 0;