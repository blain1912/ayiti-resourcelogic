
-- Create enum for recruitment type
CREATE TYPE public.recruitment_type AS ENUM ('internal', 'external');

-- Create enum for job posting status
CREATE TYPE public.job_posting_status AS ENUM ('draft', 'open', 'closed', 'filled');

-- Create enum for application status
CREATE TYPE public.application_status AS ENUM ('pending', 'reviewing', 'shortlisted', 'interview', 'offered', 'accepted', 'rejected');

-- Create job_postings table
CREATE TABLE public.job_postings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.organizational_units(id) ON DELETE SET NULL,
    position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT,
    recruitment_type recruitment_type NOT NULL DEFAULT 'external',
    status job_posting_status NOT NULL DEFAULT 'draft',
    salary_min NUMERIC,
    salary_max NUMERIC,
    number_of_positions INTEGER NOT NULL DEFAULT 1,
    deadline DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_applications table
CREATE TABLE public.job_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_posting_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    -- For internal applications
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- For external applications
    applicant_name TEXT,
    applicant_email TEXT,
    applicant_phone TEXT,
    applicant_cv_url TEXT,
    cover_letter TEXT,
    status application_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_postings
CREATE POLICY "Users can view job postings in their organization"
ON public.job_postings
FOR SELECT
USING (organization_id IN (
    SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "HR can manage job postings in their organization"
ON public.job_postings
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

-- RLS policies for job_applications
CREATE POLICY "Users can view their own applications"
ON public.job_applications
FOR SELECT
USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "HR can view all applications in their organization"
ON public.job_applications
FOR SELECT
USING (organization_id IN (
    SELECT user_roles.organization_id FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'directeur_rh', 'directeur_administratif')
));

CREATE POLICY "HR can manage applications in their organization"
ON public.job_applications
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

CREATE POLICY "Employees can apply internally"
ON public.job_applications
FOR INSERT
WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
);

-- Triggers for updated_at
CREATE TRIGGER update_job_postings_updated_at
BEFORE UPDATE ON public.job_postings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
BEFORE UPDATE ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
