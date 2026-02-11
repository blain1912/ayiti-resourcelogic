
-- Create enum for correspondence categories
CREATE TYPE public.correspondence_category AS ENUM (
  'attestation_travail',
  'certificat_travail', 
  'lettre_recommandation',
  'note_service',
  'decision',
  'convocation',
  'mise_en_demeure',
  'avertissement',
  'felicitations',
  'autre'
);

-- Create correspondence templates table
CREATE TABLE public.correspondence_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category correspondence_category NOT NULL DEFAULT 'autre',
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create correspondence records (sent correspondence)
CREATE TABLE public.correspondence_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.correspondence_templates(id),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  category correspondence_category NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  sent_by UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.correspondence_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correspondence_records ENABLE ROW LEVEL SECURITY;

-- RLS for correspondence_templates
CREATE POLICY "Users can view templates in their organization"
ON public.correspondence_templates FOR SELECT
USING (organization_id IN (
  SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "HR can manage templates in their organization"
ON public.correspondence_templates FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

-- RLS for correspondence_records
CREATE POLICY "HR can manage records in their organization"
ON public.correspondence_records FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

CREATE POLICY "Employees can view their own correspondence"
ON public.correspondence_records FOR SELECT
USING (recipient_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

-- Triggers for updated_at
CREATE TRIGGER update_correspondence_templates_updated_at
BEFORE UPDATE ON public.correspondence_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_correspondence_records_updated_at
BEFORE UPDATE ON public.correspondence_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
