-- Create attendance table for employee presence tracking
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'conge', 'maladie', 'retard', 'permission')),
  notes TEXT,
  marked_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "RH can view attendance in their organization"
  ON public.attendance
  FOR SELECT
  USING (
    organization_id IN (
      SELECT user_roles.organization_id
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'directeur_rh', 'directeur_administratif')
    )
  );

CREATE POLICY "RH can insert attendance in their organization"
  ON public.attendance
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT user_roles.organization_id
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'directeur_rh', 'directeur_administratif')
    )
  );

CREATE POLICY "RH can update attendance in their organization"
  ON public.attendance
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT user_roles.organization_id
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'directeur_rh', 'directeur_administratif')
    )
  );

CREATE POLICY "RH can delete attendance in their organization"
  ON public.attendance
  FOR DELETE
  USING (
    organization_id IN (
      SELECT user_roles.organization_id
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'directeur_rh', 'directeur_administratif')
    )
  );

CREATE POLICY "Employees can view their own attendance"
  ON public.attendance
  FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create index for performance
CREATE INDEX idx_attendance_profile_date ON public.attendance(profile_id, date);
CREATE INDEX idx_attendance_organization_date ON public.attendance(organization_id, date);

-- Add trigger for updated_at
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();