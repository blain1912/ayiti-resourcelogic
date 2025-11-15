-- Add professor grade enum
CREATE TYPE professor_grade AS ENUM (
  'assistant',
  'adjoint', 
  'associe',
  'titulaire',
  'emerite'
);

-- Create professor grades table
CREATE TABLE IF NOT EXISTS professor_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grade professor_grade NOT NULL,
  salary NUMERIC NOT NULL CHECK (salary > 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, grade)
);

-- Enable RLS
ALTER TABLE professor_grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for professor_grades
CREATE POLICY "Users can view grades in their organization"
ON professor_grades
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage grades in their organization"
ON professor_grades
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

-- Add professor_grade to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS professor_grade professor_grade;

-- Update employment_type enum to include professor
ALTER TYPE employment_type ADD VALUE IF NOT EXISTS 'professeur';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_professor_grades_org ON professor_grades(organization_id);

-- Trigger for updated_at
CREATE TRIGGER update_professor_grades_updated_at
BEFORE UPDATE ON professor_grades
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();