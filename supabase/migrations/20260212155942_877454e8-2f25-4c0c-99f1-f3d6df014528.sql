-- Allow employees to insert their own attendance (for central QR code scanning)
CREATE POLICY "Employees can insert their own attendance"
ON public.attendance
FOR INSERT
WITH CHECK (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  AND organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);
