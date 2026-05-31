-- Settings table: one row per organization to configure social benefits
CREATE TABLE public.social_benefits_settings (
  organization_id uuid PRIMARY KEY,
  ti_kat_enabled boolean NOT NULL DEFAULT true,
  ti_kat_percentage numeric NOT NULL DEFAULT 0,
  ti_kat_label text NOT NULL DEFAULT 'Ti Kat',
  gratifications jsonb NOT NULL DEFAULT jsonb_build_object(
    'fete_meres',       jsonb_build_object('enabled', true, 'label', 'Fête des Mères',   'mode', 'percentage', 'value', 0),
    'paques',           jsonb_build_object('enabled', true, 'label', 'Pâques',           'mode', 'percentage', 'value', 0),
    'rentree_scolaire', jsonb_build_object('enabled', true, 'label', 'Rentrée scolaire', 'mode', 'percentage', 'value', 0),
    'fin_annee',        jsonb_build_object('enabled', true, 'label', 'Fin d''année',     'mode', 'percentage', 'value', 0)
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_benefits_settings TO authenticated;
GRANT ALL ON public.social_benefits_settings TO service_role;

ALTER TABLE public.social_benefits_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view settings in their org"
  ON public.social_benefits_settings FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage settings in their org"
  ON public.social_benefits_settings FOR ALL
  USING (has_admin_role(auth.uid(), organization_id))
  WITH CHECK (has_admin_role(auth.uid(), organization_id));

CREATE TRIGGER update_social_benefits_settings_updated_at
  BEFORE UPDATE ON public.social_benefits_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payments table: per employee, per benefit, per period
CREATE TABLE public.social_benefits_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  benefit_type text NOT NULL, -- 'ti_kat' | 'fete_meres' | 'paques' | 'rentree_scolaire' | 'fin_annee'
  period text NOT NULL,        -- YYYY-MM for ti_kat, YYYY for gratifications
  base_amount numeric NOT NULL DEFAULT 0,
  percentage numeric,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'non_paye', -- non_paye | paye | en_attente
  payment_date date,
  payment_method text,
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, profile_id, benefit_type, period)
);

CREATE INDEX idx_social_benefits_payments_org_period ON public.social_benefits_payments (organization_id, benefit_type, period);
CREATE INDEX idx_social_benefits_payments_profile ON public.social_benefits_payments (profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_benefits_payments TO authenticated;
GRANT ALL ON public.social_benefits_payments TO service_role;

ALTER TABLE public.social_benefits_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view their own benefit payments"
  ON public.social_benefits_payments FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "HR manage benefit payments in their org"
  ON public.social_benefits_payments FOR ALL
  USING (has_admin_role(auth.uid(), organization_id))
  WITH CHECK (has_admin_role(auth.uid(), organization_id));

CREATE TRIGGER update_social_benefits_payments_updated_at
  BEFORE UPDATE ON public.social_benefits_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();