CREATE TABLE public.teacher_schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject text,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_tss_org_profile ON public.teacher_schedule_slots(organization_id, profile_id);
CREATE INDEX idx_tss_org_day ON public.teacher_schedule_slots(organization_id, day_of_week) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_schedule_slots TO authenticated;
GRANT ALL ON public.teacher_schedule_slots TO service_role;

ALTER TABLE public.teacher_schedule_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can manage teacher slots"
ON public.teacher_schedule_slots
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

CREATE POLICY "Teachers can view their own slots"
ON public.teacher_schedule_slots
FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "HR staff can view slots"
ON public.teacher_schedule_slots
FOR SELECT
USING (has_hr_access(auth.uid(), organization_id));

CREATE TRIGGER trg_tss_updated_at
BEFORE UPDATE ON public.teacher_schedule_slots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();