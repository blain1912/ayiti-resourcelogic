-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro', 'enterprise');

-- Add subscription and domain fields to organizations
ALTER TABLE public.organizations
ADD COLUMN subscription_tier public.subscription_tier NOT NULL DEFAULT 'free',
ADD COLUMN custom_domain text,
ADD COLUMN max_users integer NOT NULL DEFAULT 5,
ADD COLUMN max_units integer NOT NULL DEFAULT 3,
ADD COLUMN subscription_started_at timestamp with time zone DEFAULT now(),
ADD COLUMN subscription_expires_at timestamp with time zone;

-- Create index for custom domain lookup
CREATE UNIQUE INDEX organizations_custom_domain_idx ON public.organizations(custom_domain) WHERE custom_domain IS NOT NULL;

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION public.check_user_limit(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*)
    FROM profiles
    WHERE organization_id = _organization_id
  ) < (
    SELECT max_users
    FROM organizations
    WHERE id = _organization_id
  )
$$;

-- Function to check unit limit
CREATE OR REPLACE FUNCTION public.check_unit_limit(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*)
    FROM organizational_units
    WHERE organization_id = _organization_id
  ) < (
    SELECT max_units
    FROM organizations
    WHERE id = _organization_id
  )
$$;

-- Update profiles insert policy to check user limits
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (organization_id IS NULL OR public.check_user_limit(organization_id))
);

-- Update organizational_units insert policy to check unit limits
DROP POLICY IF EXISTS "Admins can insert units in their organization" ON public.organizational_units;
CREATE POLICY "Admins can insert units in their organization"
ON public.organizational_units
FOR INSERT
WITH CHECK (
  has_admin_role(auth.uid(), organization_id) AND
  public.check_unit_limit(organization_id)
);