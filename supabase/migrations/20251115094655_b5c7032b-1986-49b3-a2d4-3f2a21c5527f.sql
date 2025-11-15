-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for organization types
CREATE TYPE public.organization_type AS ENUM ('ministere', 'direction_generale', 'organisme_autonome', 'organisme_deconcentre');

-- Create enum for unit types
CREATE TYPE public.unit_type AS ENUM ('direction_generale', 'direction_technique', 'service', 'section', 'departement');

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type public.organization_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organizational units table
CREATE TABLE public.organizational_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.organizational_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.unit_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Add organization_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
ADD COLUMN unit_id UUID REFERENCES public.organizational_units(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizational_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role, _organization_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND organization_id = _organization_id
  )
$$;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
USING (
  id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can insert organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update their organization"
ON public.organizations
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin', id)
);

CREATE POLICY "Admins can delete their organization"
ON public.organizations
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin', id)
);

-- RLS Policies for organizational_units
CREATE POLICY "Users can view units in their organization"
ON public.organizational_units
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can insert units in their organization"
ON public.organizational_units
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin', organization_id)
);

CREATE POLICY "Admins can update units in their organization"
ON public.organizational_units
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin', organization_id)
);

CREATE POLICY "Admins can delete units in their organization"
ON public.organizational_units
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin', organization_id)
);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles in their organization"
ON public.user_roles
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin', organization_id)
);

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizational_units_updated_at
BEFORE UPDATE ON public.organizational_units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();