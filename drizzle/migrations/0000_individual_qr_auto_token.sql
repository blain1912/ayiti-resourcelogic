CREATE UNIQUE INDEX IF NOT EXISTS attendance_qr_tokens_one_active_individual
  ON public.attendance_qr_tokens (profile_id)
  WHERE scope = 'individual' AND status = 'active';

CREATE OR REPLACE FUNCTION public.ensure_individual_qr_token(_profile_id uuid DEFAULT NULL)
RETURNS TABLE(token_id uuid, token text, created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target uuid := COALESCE(_profile_id, public.current_profile_id(auth.uid()));
  _p record;
  _existing record;
  _new record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;

  SELECT id, organization_id, approval_status, employee_status INTO _p
  FROM profiles WHERE id = _target;
  IF NOT FOUND OR _p.organization_id IS NULL THEN
    RAISE EXCEPTION 'Agent introuvable.';
  END IF;

  IF _target <> public.current_profile_id(auth.uid())
     AND NOT public.has_hr_access(auth.uid(), _p.organization_id) THEN
    RAISE EXCEPTION 'Action refusée.';
  END IF;

  IF _p.approval_status <> 'approved' OR COALESCE(_p.employee_status::text, 'actif') <> 'actif' THEN
    RAISE EXCEPTION 'Agent non éligible (profil non approuvé ou inactif).';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM attendance_settings s
                 WHERE s.organization_id = _p.organization_id AND s.individual_qr_enabled) THEN
    RAISE EXCEPTION 'Le QR individuel n''est pas activé pour cette organisation.';
  END IF;

  SELECT t.id, t.token INTO _existing FROM attendance_qr_tokens t
  WHERE t.profile_id = _target AND t.scope = 'individual' AND t.status = 'active' LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT _existing.id, _existing.token, false; RETURN;
  END IF;

  INSERT INTO attendance_qr_tokens (organization_id, scope, profile_id, created_by, label)
  VALUES (_p.organization_id, 'individual', _target, auth.uid(), 'auto')
  ON CONFLICT DO NOTHING
  RETURNING id, attendance_qr_tokens.token INTO _new;

  IF _new.id IS NULL THEN
    SELECT t.id, t.token INTO _existing FROM attendance_qr_tokens t
    WHERE t.profile_id = _target AND t.scope = 'individual' AND t.status = 'active' LIMIT 1;
    RETURN QUERY SELECT _existing.id, _existing.token, false; RETURN;
  END IF;

  INSERT INTO attendance_audit_log (organization_id, profile_id, actor_user_id, action, method)
  VALUES (_p.organization_id, _target, auth.uid(), 'qr_creation_auto', 'qr_individuel');

  RETURN QUERY SELECT _new.id, _new.token, true;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_individual_qr_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_individual_qr_token(uuid) TO authenticated;