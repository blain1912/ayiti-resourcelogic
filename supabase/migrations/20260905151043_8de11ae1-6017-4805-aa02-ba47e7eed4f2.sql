-- 1. Responsable (chef de poste) de la représentation : réutilise profiles, pas de nouvelle architecture.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS head_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.organizations.head_profile_id IS
  'Agent (profiles.id) dirigeant la représentation. Doit appartenir à la même organisation. N''est pas un rôle applicatif.';

COMMENT ON COLUMN public.organizations.parent_organization_id IS
  'Représentation/organisation de rattachement institutionnel. Relation de coordination uniquement : n''accorde aucun accès aux données RH (aucune RLS ne s''appuie sur cette colonne).';

-- 2. Cohérence : le responsable doit être un agent de la même organisation.
CREATE OR REPLACE FUNCTION public.validate_organization_head()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.head_profile_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.head_profile_id AND p.organization_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Le responsable doit être un agent de cette organisation.';
  END IF;

  IF NEW.parent_organization_id IS NOT NULL AND NEW.parent_organization_id = NEW.id THEN
    RAISE EXCEPTION 'Une organisation ne peut pas être rattachée à elle-même.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_organization_head ON public.organizations;
CREATE TRIGGER trg_validate_organization_head
  BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.validate_organization_head();

-- 3. Choix d'une représentation de rattachement : identité publique uniquement, aucune donnée RH.
CREATE OR REPLACE FUNCTION public.list_attachable_representations(_organization_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  host_country text,
  host_city text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.type::text, o.host_country, o.host_city
  FROM public.organizations o
  WHERE o.approval_status = 'approved'
    AND o.id <> _organization_id
    AND (
      public.has_admin_role(auth.uid(), _organization_id)
      OR public.is_super_admin(auth.uid())
    )
  ORDER BY o.name
$$;

REVOKE ALL ON FUNCTION public.list_attachable_representations(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.list_attachable_representations(uuid) TO authenticated;