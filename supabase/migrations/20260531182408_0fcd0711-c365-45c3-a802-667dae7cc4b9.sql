
CREATE TABLE public.payroll_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  emargement_document_id UUID REFERENCES public.emargement_documents(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  period TEXT NOT NULL,
  no_cheque TEXT,
  code_employe TEXT,
  nif TEXT,
  nom_complet TEXT NOT NULL,
  poste TEXT,
  montant_brut NUMERIC(14,2) NOT NULL DEFAULT 0,
  isr NUMERIC(14,2) NOT NULL DEFAULT 0,
  cas_fdu NUMERIC(14,2) NOT NULL DEFAULT 0,
  pension NUMERIC(14,2) NOT NULL DEFAULT 0,
  cfgdct NUMERIC(14,2) NOT NULL DEFAULT 0,
  aval NUMERIC(14,2) NOT NULL DEFAULT 0,
  remboursement NUMERIC(14,2) NOT NULL DEFAULT 0,
  autres_retenues NUMERIC(14,2) NOT NULL DEFAULT 0,
  montant_net NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'non_paye',
  payment_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  confirmed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_payments_org_period ON public.payroll_payments(organization_id, period);
CREATE INDEX idx_payroll_payments_emargement ON public.payroll_payments(emargement_document_id);
CREATE INDEX idx_payroll_payments_profile ON public.payroll_payments(profile_id);
CREATE INDEX idx_payroll_payments_nif ON public.payroll_payments(nif);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_payments TO authenticated;
GRANT ALL ON public.payroll_payments TO service_role;

ALTER TABLE public.payroll_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can manage payroll payments"
ON public.payroll_payments
FOR ALL
USING (has_admin_role(auth.uid(), organization_id))
WITH CHECK (has_admin_role(auth.uid(), organization_id));

CREATE POLICY "Employees can view their own payroll payments"
ON public.payroll_payments
FOR SELECT
USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_payroll_payments_updated_at
BEFORE UPDATE ON public.payroll_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
