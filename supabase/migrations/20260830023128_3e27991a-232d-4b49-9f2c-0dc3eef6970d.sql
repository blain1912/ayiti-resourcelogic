-- ============================================================
-- PHASE 7 : dossier administratif, carrière et documents RH
-- ============================================================

-- 1. PROFILES : date d'entrée organisation + statut administratif durable
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_entree_organisation date,
  ADD COLUMN IF NOT EXISTS administrative_status text NOT NULL DEFAULT 'actif',
  ADD COLUMN IF NOT EXISTS administrative_status_since date,
  ADD COLUMN IF NOT EXISTS administrative_status_comment text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_administrative_status_chk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_administrative_status_chk
      CHECK (administrative_status IN (
        'actif','conge','mission','suspendu','detache','mis_a_disposition',
        'disponibilite','retraite','fin_contrat','demission','revoque','decede','autre'
      ));
  END IF;
END $$;

-- Reprise non destructive : l'ancienne date d'entrée en fonction devient la date d'entrée
-- dans l'organisation. Le champ historique est conservé tel quel.
UPDATE public.profiles
SET date_entree_organisation = date_entree_fonction
WHERE date_entree_organisation IS NULL
  AND date_entree_fonction IS NOT NULL;

-- 2. EMPLOYEE_DOCUMENTS : métadonnées documentaires
ALTER TABLE public.employee_documents
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'autre',
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS document_date date,
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS issuer text,
  ADD COLUMN IF NOT EXISTS comment text,
  ADD COLUMN IF NOT EXISTS confidentiality text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_documents_confidentiality_chk'
  ) THEN
    ALTER TABLE public.employee_documents
      ADD CONSTRAINT employee_documents_confidentiality_chk
      CHECK (confidentiality IN ('standard','restreint','direction'));
  END IF;
END $$;

-- Catégorisation rétroactive à partir des types déjà utilisés
UPDATE public.employee_documents
SET category = CASE document_type
    WHEN 'piece_identite' THEN 'identite'
    WHEN 'matricule_fiscale' THEN 'identite'
    WHEN 'diplome' THEN 'formation'
    WHEN 'certificat' THEN 'formation'
    WHEN 'lettre_nomination' THEN 'carriere'
    WHEN 'cv' THEN 'emploi'
    ELSE 'autre'
  END
WHERE category = 'autre';

UPDATE public.employee_documents
SET title = COALESCE(title, file_name)
WHERE title IS NULL;

CREATE INDEX IF NOT EXISTS employee_documents_profile_cat_idx
  ON public.employee_documents (profile_id, category);
CREATE INDEX IF NOT EXISTS employee_documents_expires_idx
  ON public.employee_documents (organization_id, expires_at)
  WHERE expires_at IS NOT NULL;

-- RLS documents : la confidentialité est appliquée côté serveur
DROP POLICY IF EXISTS "Employees can view their own documents" ON public.employee_documents;
CREATE POLICY "Agents view own standard documents"
ON public.employee_documents
FOR SELECT
TO authenticated
USING (
  profile_id = public.current_profile_id(auth.uid())
  AND confidentiality = 'standard'
  AND is_archived = false
);

DROP POLICY IF EXISTS "Employees can delete their own documents" ON public.employee_documents;
CREATE POLICY "Agents delete documents they uploaded"
ON public.employee_documents
FOR DELETE
TO authenticated
USING (
  profile_id = public.current_profile_id(auth.uid())
  AND uploaded_by = auth.uid()
  AND confidentiality = 'standard'
);

DROP POLICY IF EXISTS "HR staff view non direction documents" ON public.employee_documents;
CREATE POLICY "HR staff view non direction documents"
ON public.employee_documents
FOR SELECT
TO authenticated
USING (
  public.has_hr_access(auth.uid(), organization_id)
  AND confidentiality IN ('standard','restreint')
);

-- 3. RÉFÉRENTIEL DES DOCUMENTS REQUIS PAR ORGANISATION
CREATE TABLE IF NOT EXISTS public.organization_required_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'autre',
  document_type text,
  is_mandatory boolean NOT NULL DEFAULT true,
  applies_to_category text,
  requires_expiry boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_required_documents TO authenticated;
GRANT ALL ON public.organization_required_documents TO service_role;

ALTER TABLE public.organization_required_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read required documents"
ON public.organization_required_documents
FOR SELECT
TO authenticated
USING (public.user_in_organization(auth.uid(), organization_id));

CREATE POLICY "Admins manage required documents"
ON public.organization_required_documents
FOR ALL
TO authenticated
USING (public.has_admin_role(auth.uid(), organization_id))
WITH CHECK (public.has_admin_role(auth.uid(), organization_id));

DROP TRIGGER IF EXISTS trg_required_documents_updated_at ON public.organization_required_documents;
CREATE TRIGGER trg_required_documents_updated_at
BEFORE UPDATE ON public.organization_required_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. STAFF_MOVEMENTS : enrichissement (pas de second système de mouvements)
ALTER TABLE public.staff_movements
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.employee_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS previous_status text,
  ADD COLUMN IF NOT EXISTS new_status text,
  ADD COLUMN IF NOT EXISTS is_cancelled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_reason text;

CREATE INDEX IF NOT EXISTS staff_movements_profile_date_idx
  ON public.staff_movements (employee_id, effective_date DESC);

-- 5. ÉVÉNEMENT DE CARRIÈRE UNIFIÉ (réutilise hr_create_assignment et hr_audit_log)
CREATE OR REPLACE FUNCTION public.hr_record_career_event(
  _organization_id uuid,
  _profile_id uuid,
  _event_type text,
  _effective_date date,
  _unit_id uuid DEFAULT NULL,
  _position_id uuid DEFAULT NULL,
  _supervisor_profile_id uuid DEFAULT NULL,
  _create_assignment boolean DEFAULT false,
  _assignment_kind text DEFAULT 'principale',
  _new_status text DEFAULT NULL,
  _decision_reference text DEFAULT NULL,
  _document_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _profile record;
  _from_unit text;
  _from_position text;
  _to_unit text;
  _to_position text;
  _assignment_id uuid;
  _movement_id uuid;
  _previous_status text;
BEGIN
  IF NOT public.has_hr_access(auth.uid(), _organization_id) THEN
    RAISE EXCEPTION 'Action refusée : droits RH requis sur cette institution.';
  END IF;

  IF _event_type IS NULL OR btrim(_event_type) = '' THEN
    RAISE EXCEPTION 'Type d''événement de carrière requis.';
  END IF;

  SELECT id, organization_id, full_name, unit_id, position_id, employee_category, administrative_status
    INTO _profile
  FROM public.profiles
  WHERE id = _profile_id AND organization_id = _organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent introuvable dans cette institution.';
  END IF;

  IF _document_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.employee_documents
    WHERE id = _document_id
      AND organization_id = _organization_id
      AND profile_id = _profile_id
  ) THEN
    RAISE EXCEPTION 'Document justificatif invalide pour cet agent.';
  END IF;

  _previous_status := _profile.administrative_status;
  SELECT name INTO _from_unit FROM public.organizational_units WHERE id = _profile.unit_id;
  SELECT name INTO _from_position FROM public.positions WHERE id = _profile.position_id;

  IF _create_assignment THEN
    _assignment_id := public.hr_create_assignment(
      _organization_id := _organization_id,
      _profile_id := _profile_id,
      _start_date := _effective_date,
      _unit_id := _unit_id,
      _position_id := _position_id,
      _supervisor_profile_id := _supervisor_profile_id,
      _assignment_kind := COALESCE(_assignment_kind, 'principale'),
      _decision_reference := _decision_reference,
      _comment := _notes,
      _movement_type := _event_type
    );
  END IF;

  SELECT name INTO _to_unit FROM public.organizational_units
    WHERE id = COALESCE(_unit_id, _profile.unit_id);
  SELECT name INTO _to_position FROM public.positions
    WHERE id = COALESCE(_position_id, _profile.position_id);

  IF _new_status IS NOT NULL AND _new_status <> _previous_status THEN
    UPDATE public.profiles
    SET administrative_status = _new_status,
        administrative_status_since = _effective_date,
        updated_at = now()
    WHERE id = _profile_id;
  END IF;

  INSERT INTO public.staff_movements (
    organization_id, employee_id, employee_name, movement_type,
    from_unit, to_unit, from_position, to_position,
    effective_date, decision_reference, notes, created_by,
    assignment_id, document_id, previous_status, new_status
  ) VALUES (
    _organization_id, _profile_id, _profile.full_name, _event_type,
    _from_unit, _to_unit, _from_position, _to_position,
    _effective_date, _decision_reference, _notes, auth.uid(),
    _assignment_id, _document_id, _previous_status, COALESCE(_new_status, _previous_status)
  )
  RETURNING id INTO _movement_id;

  INSERT INTO public.hr_audit_log (
    organization_id, profile_id, actor_user_id, entity_type, entity_id,
    action, old_value, new_value, comment
  ) VALUES (
    _organization_id, _profile_id, auth.uid(), 'career_event', _movement_id,
    _event_type,
    jsonb_build_object(
      'unit', _from_unit, 'position', _from_position, 'status', _previous_status
    ),
    jsonb_build_object(
      'unit', _to_unit, 'position', _to_position,
      'status', COALESCE(_new_status, _previous_status),
      'effective_date', _effective_date,
      'decision_reference', _decision_reference,
      'assignment_id', _assignment_id,
      'document_id', _document_id
    ),
    _notes
  );

  RETURN _movement_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.hr_record_career_event(uuid,uuid,text,date,uuid,uuid,uuid,boolean,text,text,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_record_career_event(uuid,uuid,text,date,uuid,uuid,uuid,boolean,text,text,text,uuid,text) TO authenticated;