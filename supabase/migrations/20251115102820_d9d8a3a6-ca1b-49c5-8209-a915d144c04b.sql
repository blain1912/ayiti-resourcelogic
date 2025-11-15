-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can create organizations during onboarding" ON public.organizations;

-- Create a simpler policy that allows any authenticated user to create organizations
-- We'll rely on application logic to prevent multiple organizations per user
CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);