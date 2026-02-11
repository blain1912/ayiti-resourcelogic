
-- ═══════════════════════════════════════════════════════
-- 1. AUTOMATIC REFERENCE NUMBERING
-- ═══════════════════════════════════════════════════════

-- Counter table for sequential numbering per org/category/year
CREATE TABLE public.correspondence_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_prefix text NOT NULL,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, category_prefix, year)
);

ALTER TABLE public.correspondence_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage counters" ON public.correspondence_counters
  FOR ALL USING (has_admin_role(auth.uid(), organization_id))
  WITH CHECK (has_admin_role(auth.uid(), organization_id));

-- Add reference_number column to correspondence_records
ALTER TABLE public.correspondence_records ADD COLUMN IF NOT EXISTS reference_number text;

-- Function to generate reference number: RH/{CAT_PREFIX}/{ORG_CODE}/{YEAR}/{SEQ}
CREATE OR REPLACE FUNCTION public.generate_correspondence_reference(
  _organization_id uuid,
  _category text,
  _document_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year integer := EXTRACT(YEAR FROM CURRENT_DATE);
  _seq integer;
  _cat_prefix text;
  _type_prefix text;
  _org_code text;
  _ref text;
BEGIN
  -- Category prefix mapping
  _cat_prefix := CASE _category
    WHEN 'attestation_travail' THEN 'AT'
    WHEN 'certificat_travail' THEN 'CT'
    WHEN 'lettre_recommandation' THEN 'LR'
    WHEN 'note_service' THEN 'NS'
    WHEN 'decision' THEN 'DEC'
    WHEN 'convocation' THEN 'CNV'
    WHEN 'mise_en_demeure' THEN 'MED'
    WHEN 'avertissement' THEN 'AV'
    WHEN 'felicitations' THEN 'FEL'
    ELSE 'DIV'
  END;

  -- Document type prefix
  _type_prefix := CASE _document_type
    WHEN 'lettre' THEN 'LT'
    WHEN 'decision' THEN 'DC'
    WHEN 'note' THEN 'NT'
    WHEN 'circulaire' THEN 'CR'
    WHEN 'attestation' THEN 'AT'
    WHEN 'certificat' THEN 'CF'
    WHEN 'convocation' THEN 'CV'
    WHEN 'rapport' THEN 'RP'
    ELSE 'XX'
  END;

  -- Get org short code (first 6 chars uppercase)
  SELECT UPPER(LEFT(REPLACE(name, ' ', ''), 6)) INTO _org_code
  FROM organizations WHERE id = _organization_id;

  -- Increment counter atomically
  INSERT INTO correspondence_counters (organization_id, category_prefix, year, last_number)
  VALUES (_organization_id, _cat_prefix, _year, 1)
  ON CONFLICT (organization_id, category_prefix, year)
  DO UPDATE SET last_number = correspondence_counters.last_number + 1, updated_at = now()
  RETURNING last_number INTO _seq;

  -- Format: RH/{CAT}/{ORG}/{YEAR}/{SEQ}
  _ref := 'RH/' || _cat_prefix || '/' || COALESCE(_org_code, 'ORG') || '/' || _year::text || '/' || LPAD(_seq::text, 4, '0');

  RETURN _ref;
END;
$$;

-- Trigger to auto-assign reference number on insert
CREATE OR REPLACE FUNCTION public.auto_assign_reference_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := generate_correspondence_reference(
      NEW.organization_id,
      NEW.category::text,
      COALESCE(NEW.document_type, 'lettre')
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_reference_number
  BEFORE INSERT ON public.correspondence_records
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_reference_number();

-- ═══════════════════════════════════════════════════════
-- 2. IN-APP NOTIFICATIONS
-- ═══════════════════════════════════════════════════════

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ═══════════════════════════════════════════════════════
-- 3. AUDIT TRAIL
-- ═══════════════════════════════════════════════════════

CREATE TABLE public.correspondence_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.correspondence_records(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.correspondence_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.correspondence_audit_log
  FOR SELECT USING (has_admin_role(auth.uid(), organization_id));

CREATE POLICY "System can insert audit logs" ON public.correspondence_audit_log
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_audit_log_record ON public.correspondence_audit_log(record_id);
CREATE INDEX idx_audit_log_org ON public.correspondence_audit_log(organization_id, created_at DESC);

-- Trigger for automatic audit logging on correspondence changes
CREATE OR REPLACE FUNCTION public.log_correspondence_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action text;
  _details jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'created';
    _details := jsonb_build_object('status', NEW.status, 'reference', NEW.reference_number);
    INSERT INTO correspondence_audit_log (record_id, organization_id, action, performed_by, details)
    VALUES (NEW.id, NEW.organization_id, _action, NEW.sent_by, _details);
  ELSIF TG_OP = 'UPDATE' THEN
    _details := '{}'::jsonb;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      _action := 'status_changed';
      _details := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status);
    ELSIF OLD.is_locked IS DISTINCT FROM NEW.is_locked AND NEW.is_locked = true THEN
      _action := 'locked';
      _details := jsonb_build_object('locked_at', now());
    ELSIF OLD.signed_at IS NULL AND NEW.signed_at IS NOT NULL THEN
      _action := 'signed';
      _details := jsonb_build_object('signature_name', NEW.signature_name, 'signed_at', NEW.signed_at);
    ELSE
      _action := 'modified';
      _details := jsonb_build_object('fields_changed', true);
    END IF;
    INSERT INTO correspondence_audit_log (record_id, organization_id, action, performed_by, details)
    VALUES (NEW.id, NEW.organization_id, _action, COALESCE(NEW.validated_by, NEW.sent_by), _details);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_correspondence_audit
  AFTER INSERT OR UPDATE ON public.correspondence_records
  FOR EACH ROW
  EXECUTE FUNCTION public.log_correspondence_change();

-- Trigger for approval audit logging
CREATE OR REPLACE FUNCTION public.log_approval_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO correspondence_audit_log (record_id, organization_id, action, performed_by, details)
    VALUES (
      NEW.record_id,
      NEW.organization_id,
      'approval_' || NEW.status,
      COALESCE(NEW.approver_id, auth.uid()),
      jsonb_build_object('step', NEW.step_label, 'step_order', NEW.step_order, 'comment', NEW.comment)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_approval_audit
  AFTER UPDATE ON public.correspondence_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_approval_change();
