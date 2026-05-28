GRANT SELECT ON public.organizations TO anon;
GRANT SELECT ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

DROP POLICY IF EXISTS "Anonymous users can view approved organizations for signup" ON public.organizations;

CREATE POLICY "Anonymous users can view approved organizations for signup"
ON public.organizations
FOR SELECT
TO anon
USING (approval_status = 'approved');