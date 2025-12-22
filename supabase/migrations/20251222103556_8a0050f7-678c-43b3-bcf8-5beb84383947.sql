-- Add badge template field to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS badge_template TEXT DEFAULT 'classic';

-- Create badge_templates table for custom templates
CREATE TABLE IF NOT EXISTS public.badge_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.badge_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for badge_templates
CREATE POLICY "Users can view templates in their organization"
ON public.badge_templates
FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage templates in their organization"
ON public.badge_templates
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));