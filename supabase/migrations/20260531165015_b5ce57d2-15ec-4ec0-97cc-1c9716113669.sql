-- Teacher schedule slots: secretariat academique full access
CREATE POLICY "Secretaire academique can manage teacher slots"
ON public.teacher_schedule_slots
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = teacher_schedule_slots.organization_id
      AND ur.role::text = 'secretaire_academique'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = teacher_schedule_slots.organization_id
      AND ur.role::text = 'secretaire_academique'
  )
);

-- Attendance: secretariat academique can view teachers' attendance
CREATE POLICY "Secretaire academique can view teacher attendance"
ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = attendance.organization_id
      AND ur.role::text = 'secretaire_academique'
  )
  AND EXISTS (
    SELECT 1 FROM public.teacher_schedule_slots tss
    WHERE tss.profile_id = attendance.profile_id
      AND tss.organization_id = attendance.organization_id
      AND tss.is_active = true
  )
);

CREATE POLICY "Secretaire academique can insert teacher attendance"
ON public.attendance
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = attendance.organization_id
      AND ur.role::text = 'secretaire_academique'
  )
  AND EXISTS (
    SELECT 1 FROM public.teacher_schedule_slots tss
    WHERE tss.profile_id = attendance.profile_id
      AND tss.organization_id = attendance.organization_id
      AND tss.is_active = true
  )
);

CREATE POLICY "Secretaire academique can update teacher attendance"
ON public.attendance
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = attendance.organization_id
      AND ur.role::text = 'secretaire_academique'
  )
  AND EXISTS (
    SELECT 1 FROM public.teacher_schedule_slots tss
    WHERE tss.profile_id = attendance.profile_id
      AND tss.organization_id = attendance.organization_id
      AND tss.is_active = true
  )
);