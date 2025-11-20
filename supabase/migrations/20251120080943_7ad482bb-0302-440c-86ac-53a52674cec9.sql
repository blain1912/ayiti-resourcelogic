-- Add approval_status to organizations table
ALTER TABLE public.organizations 
ADD COLUMN approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Update existing organizations to approved status
UPDATE public.organizations 
SET approval_status = 'approved' 
WHERE approval_status IS NULL;

-- Make approval_status NOT NULL after setting defaults
ALTER TABLE public.organizations 
ALTER COLUMN approval_status SET NOT NULL;

-- Update RLS policies to only allow approved organizations to be used
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
CREATE POLICY "Users can view their organization" 
ON public.organizations 
FOR SELECT 
USING (
  id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  ) 
  AND approval_status = 'approved'
);

-- Super admins can view all organizations including pending ones
DROP POLICY IF EXISTS "Super admins can view all organizations" ON public.organizations;
CREATE POLICY "Super admins can view all organizations" 
ON public.organizations 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) 
  OR (
    id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE user_id = auth.uid()
    ) 
    AND approval_status = 'approved'
  )
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_organizations_approval_status ON public.organizations(approval_status);