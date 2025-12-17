-- Create enum for evaluation ratings
CREATE TYPE evaluation_rating AS ENUM ('1', '2', '3', '4', '5');

-- Create enum for evaluation status
CREATE TYPE evaluation_status AS ENUM ('draft', 'submitted', 'reviewed', 'completed');

-- Create evaluation criteria table
CREATE TABLE public.evaluation_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evaluations table
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluation_year INTEGER NOT NULL,
  evaluation_date DATE,
  status evaluation_status NOT NULL DEFAULT 'draft',
  job_description TEXT,
  evaluator_comments TEXT,
  employee_comments TEXT,
  global_rating evaluation_rating,
  supervisor_id UUID REFERENCES public.profiles(id),
  supervisor_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, employee_id, evaluation_year)
);

-- Create evaluation scores table
CREATE TABLE public.evaluation_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE,
  score evaluation_rating,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evaluation_id, criteria_id)
);

-- Enable RLS
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for evaluation_criteria
CREATE POLICY "Users can view criteria in their organization"
ON public.evaluation_criteria FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage criteria"
ON public.evaluation_criteria FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

CREATE POLICY "Super admins can manage template criteria"
ON public.evaluation_criteria FOR ALL
USING (is_super_admin(auth.uid()) AND organization_id IS NULL)
WITH CHECK (is_super_admin(auth.uid()) AND organization_id IS NULL);

-- RLS Policies for evaluations
CREATE POLICY "Employees can view their own evaluations"
ON public.evaluations FOR SELECT
USING (employee_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "HR can view evaluations in their organization"
ON public.evaluations FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'directeur_rh', 'directeur_administratif', 'directeur_general')
));

CREATE POLICY "HR can manage evaluations in their organization"
ON public.evaluations FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

CREATE POLICY "Evaluators can manage their evaluations"
ON public.evaluations FOR ALL
USING (evaluator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
WITH CHECK (evaluator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- RLS Policies for evaluation_scores
CREATE POLICY "Users can view scores of their evaluations"
ON public.evaluation_scores FOR SELECT
USING (evaluation_id IN (
  SELECT id FROM evaluations 
  WHERE employee_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
));

CREATE POLICY "HR can view all scores in their organization"
ON public.evaluation_scores FOR SELECT
USING (evaluation_id IN (
  SELECT e.id FROM evaluations e
  JOIN user_roles ur ON ur.organization_id = e.organization_id
  WHERE ur.user_id = auth.uid() 
  AND ur.role IN ('admin', 'directeur_rh', 'directeur_administratif', 'directeur_general')
));

CREATE POLICY "HR can manage scores in their organization"
ON public.evaluation_scores FOR ALL
USING (evaluation_id IN (
  SELECT e.id FROM evaluations e
  WHERE has_admin_role(auth.uid(), e.organization_id)
))
WITH CHECK (evaluation_id IN (
  SELECT e.id FROM evaluations e
  WHERE has_admin_role(auth.uid(), e.organization_id)
));

CREATE POLICY "Evaluators can manage scores of their evaluations"
ON public.evaluation_scores FOR ALL
USING (evaluation_id IN (
  SELECT id FROM evaluations 
  WHERE evaluator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
))
WITH CHECK (evaluation_id IN (
  SELECT id FROM evaluations 
  WHERE evaluator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
));

-- Create triggers for updated_at
CREATE TRIGGER update_evaluation_criteria_updated_at
BEFORE UPDATE ON public.evaluation_criteria
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluation_scores_updated_at
BEFORE UPDATE ON public.evaluation_scores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();