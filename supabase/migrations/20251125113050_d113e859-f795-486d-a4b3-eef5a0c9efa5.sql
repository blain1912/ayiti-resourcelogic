-- Allow anonymous users to view approved organizations for signup
CREATE POLICY "Anonymous users can view approved organizations for signup"
ON public.organizations
FOR SELECT
TO anon
USING (approval_status = 'approved');