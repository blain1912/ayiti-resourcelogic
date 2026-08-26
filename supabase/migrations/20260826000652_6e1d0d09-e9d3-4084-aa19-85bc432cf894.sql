-- 1. Extend institution types (additive only)
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'institution_publique';
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'ambassade';
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'consulat_general';
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'consulat';
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'mission_permanente';
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'mission_diplomatique';
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'autre';

-- 2. Extend unit types (additive only)
ALTER TYPE public.unit_type ADD VALUE IF NOT EXISTS 'cabinet';
ALTER TYPE public.unit_type ADD VALUE IF NOT EXISTS 'bureau';
ALTER TYPE public.unit_type ADD VALUE IF NOT EXISTS 'unite';
ALTER TYPE public.unit_type ADD VALUE IF NOT EXISTS 'autre';

-- 3. Organizational units: new optional fields
ALTER TABLE public.organizational_units ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.organizational_units ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.organizational_units ADD COLUMN IF NOT EXISTS manager_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.organizational_units ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.organizational_units ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- 4. Positions: new optional fields
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.organizational_units(id) ON DELETE SET NULL;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS reports_to_position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS responsibilities text;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS is_vacant boolean NOT NULL DEFAULT false;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'actif';
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.positions ALTER COLUMN category_id DROP NOT NULL;

-- 5. Diplomatic network: optional central authority link
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 6. Customizable institution labels
CREATE TABLE IF NOT EXISTS public.institution_labels (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  labels jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_labels TO authenticated;
GRANT ALL ON public.institution_labels TO service_role;

ALTER TABLE public.institution_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their institution labels"
ON public.institution_labels FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.organization_id = institution_labels.organization_id
  )
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage their institution labels"
ON public.institution_labels FOR ALL TO authenticated
USING (public.has_admin_role(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.has_admin_role(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_institution_labels_updated_at
BEFORE UPDATE ON public.institution_labels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_org_units_display_order ON public.organizational_units(organization_id, display_order);
CREATE INDEX IF NOT EXISTS idx_positions_unit ON public.positions(unit_id);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON public.organizations(parent_organization_id);