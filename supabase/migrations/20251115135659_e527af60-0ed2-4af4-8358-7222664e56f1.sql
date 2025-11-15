-- Add approval status to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- Update RLS policies to allow users to view their own pending profile
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own profile when approved
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND approval_status = 'approved');

-- Allow RH admins to view all profiles in their organization
CREATE POLICY "RH can view all profiles in organization"
ON profiles
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'directeur_rh')
  )
);

-- Allow RH admins to update profiles in their organization (for approval)
CREATE POLICY "RH can update profiles in organization"
ON profiles
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'directeur_rh')
  )
);