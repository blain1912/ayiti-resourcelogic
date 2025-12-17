-- Create enum for greeting card occasion types
CREATE TYPE public.greeting_card_occasion AS ENUM (
  'anniversaire',
  'deces_parent',
  'nouvel_an',
  'fete_meres',
  'fete_peres',
  'paques',
  'saint_valentin',
  'fete_drapeau',
  'prompt_retablissement',
  'accouchement',
  'mariage'
);

-- Create enum for greeting card request status
CREATE TYPE public.greeting_card_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'sent'
);

-- Table for greeting card templates
CREATE TABLE public.greeting_card_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  occasion greeting_card_occasion NOT NULL,
  title TEXT NOT NULL,
  message_template TEXT NOT NULL,
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#000000',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for greeting card requests (from employees)
CREATE TABLE public.greeting_card_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occasion greeting_card_occasion NOT NULL,
  status greeting_card_status NOT NULL DEFAULT 'pending',
  custom_message TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for sent greeting cards
CREATE TABLE public.greeting_cards_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occasion greeting_card_occasion NOT NULL,
  template_id UUID REFERENCES public.greeting_card_templates(id),
  request_id UUID REFERENCES public.greeting_card_requests(id),
  sent_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  custom_message TEXT,
  sent_via TEXT[] NOT NULL DEFAULT ARRAY['email'],
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.greeting_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.greeting_card_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.greeting_cards_sent ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Users can view templates in their organization"
ON public.greeting_card_templates
FOR SELECT
USING (
  organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR (organization_id IS NULL AND is_default = true)
);

CREATE POLICY "HR can manage templates in their organization"
ON public.greeting_card_templates
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

-- RLS Policies for requests
CREATE POLICY "Employees can create requests in their organization"
ON public.greeting_card_requests
FOR INSERT
WITH CHECK (
  requester_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Employees can view their own requests"
ON public.greeting_card_requests
FOR SELECT
USING (
  requester_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "HR can manage requests in their organization"
ON public.greeting_card_requests
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'directeur_rh', 'directeur_administratif')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'directeur_rh', 'directeur_administratif')
  )
);

-- RLS Policies for sent cards
CREATE POLICY "Recipients can view their own cards"
ON public.greeting_cards_sent
FOR SELECT
USING (
  recipient_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "HR can manage sent cards in their organization"
ON public.greeting_cards_sent
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'directeur_rh', 'directeur_administratif')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'directeur_rh', 'directeur_administratif')
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_greeting_card_templates_updated_at
BEFORE UPDATE ON public.greeting_card_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_greeting_card_requests_updated_at
BEFORE UPDATE ON public.greeting_card_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();