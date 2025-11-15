-- Drop existing restrictive policies for organizations
DROP POLICY IF EXISTS "Admins can insert organizations" ON public.organizations;

-- Create new policy that allows users to create organizations during onboarding
-- (when they don't have an organization yet)
CREATE POLICY "Users can create organizations during onboarding" 
ON public.organizations 
FOR INSERT 
TO authenticated 
WITH CHECK (
  NOT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND organization_id IS NOT NULL
  )
);

-- Drop existing restrictive policy for user_roles
DROP POLICY IF EXISTS "Admins can manage roles in their organization" ON public.user_roles;

-- Allow users to insert their own first role during onboarding
CREATE POLICY "Users can create their own roles during onboarding" 
ON public.user_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Allow admins to manage all roles in their organization
CREATE POLICY "Admins can manage roles in their organization" 
ON public.user_roles 
FOR ALL 
TO authenticated 
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));