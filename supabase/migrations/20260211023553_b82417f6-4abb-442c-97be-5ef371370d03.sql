
-- Table for special schedule periods (e.g. crisis periods)
CREATE TABLE public.special_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for individual employee schedule assignments within a special schedule
CREATE TABLE public.special_schedule_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.special_schedules(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=Sunday, 1=Monday...6=Saturday
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '16:00',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.special_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_schedule_assignments ENABLE ROW LEVEL SECURITY;

-- RLS for special_schedules
CREATE POLICY "HR can manage special schedules in their organization"
ON public.special_schedules
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

CREATE POLICY "Users can view special schedules in their organization"
ON public.special_schedules
FOR SELECT
USING (organization_id IN (
  SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()
));

-- RLS for special_schedule_assignments
CREATE POLICY "HR can manage assignments in their organization"
ON public.special_schedule_assignments
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

CREATE POLICY "Employees can view their own assignments"
ON public.special_schedule_assignments
FOR SELECT
USING (profile_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can view assignments in their organization"
ON public.special_schedule_assignments
FOR SELECT
USING (organization_id IN (
  SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()
));

-- Triggers for updated_at
CREATE TRIGGER update_special_schedules_updated_at
BEFORE UPDATE ON public.special_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_special_schedule_assignments_updated_at
BEFORE UPDATE ON public.special_schedule_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
