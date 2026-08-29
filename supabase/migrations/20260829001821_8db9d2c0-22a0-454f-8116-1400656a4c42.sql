-- ============ PHASE 3 : informations détaillées de l'organisation ============
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS acronym text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS institutional_email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS head_name text,
  ADD COLUMN IF NOT EXISTS head_title text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS represented_country text,
  ADD COLUMN IF NOT EXISTS host_country text,
  ADD COLUMN IF NOT EXISTS host_city text,
  ADD COLUMN IF NOT EXISTS representation_type text;

-- ============ PHASE 4 : profil agent vs compte utilisateur ============
-- Un agent peut exister dans le registre RH sans compte utilisateur.
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'no_account',
  ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invitation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by uuid;

-- Statuts autorisés (trigger plutôt que CHECK figé)
CREATE OR REPLACE FUNCTION public.validate_account_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.account_status NOT IN ('no_account','invitation_pending','invitation_sent','invitation_expired','active','suspended') THEN
    RAISE EXCEPTION 'Statut de compte invalide: %', NEW.account_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_account_status ON public.profiles;
CREATE TRIGGER trg_validate_account_status
BEFORE INSERT OR UPDATE OF account_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_account_status();

-- Backfill : comptes réels vs comptes techniques importés
UPDATE public.profiles SET account_status = 'active'
WHERE user_id IS NOT NULL AND account_status = 'no_account';

-- ============ Journal d'audit des comptes ============
CREATE TABLE IF NOT EXISTS public.account_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_user_id uuid,
  action text NOT NULL,
  old_value text,
  new_value text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.account_audit_log TO authenticated;
GRANT ALL ON public.account_audit_log TO service_role;

ALTER TABLE public.account_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins and HR can read account audit log"
ON public.account_audit_log FOR SELECT TO authenticated
USING (
  public.has_hr_access(auth.uid(), organization_id)
  OR public.is_super_admin(auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_account_audit_log_org ON public.account_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_audit_log_profile ON public.account_audit_log(profile_id, created_at DESC);