
-- Late attendance notification preferences per organization
CREATE TABLE public.late_notification_settings (
  organization_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  enabled_roles text[] NOT NULL DEFAULT ARRAY['admin','directeur_general','directeur_administratif','directeur_rh','secretaire','chef_service']::text[],
  extra_recipient_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.late_notification_settings TO authenticated;
GRANT ALL ON public.late_notification_settings TO service_role;

ALTER TABLE public.late_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view late notification settings"
  ON public.late_notification_settings FOR SELECT
  USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Admins can manage late notification settings"
  ON public.late_notification_settings FOR ALL
  USING (has_admin_role(auth.uid(), organization_id))
  WITH CHECK (has_admin_role(auth.uid(), organization_id));

CREATE TRIGGER trg_late_notification_settings_updated_at
  BEFORE UPDATE ON public.late_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update the notify_late_attendance function to honor settings
CREATE OR REPLACE FUNCTION public.notify_late_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_employee_name text;
  v_threshold time;
  v_threshold_str text;
  v_time_str text;
  v_settings public.late_notification_settings%ROWTYPE;
  v_roles text[];
  v_extras uuid[];
  v_enabled boolean;
BEGIN
  IF NEW.status <> 'retard' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'retard' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_settings
  FROM public.late_notification_settings
  WHERE organization_id = NEW.organization_id;

  IF FOUND THEN
    v_enabled := v_settings.enabled;
    v_roles := v_settings.enabled_roles;
    v_extras := v_settings.extra_recipient_ids;
  ELSE
    v_enabled := true;
    v_roles := ARRAY['admin','directeur_general','directeur_administratif','directeur_rh','secretaire','chef_service']::text[];
    v_extras := ARRAY[]::uuid[];
  END IF;

  IF NOT v_enabled THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_employee_name
  FROM public.profiles WHERE id = NEW.profile_id;

  SELECT late_threshold_time INTO v_threshold
  FROM public.organizations WHERE id = NEW.organization_id;

  v_threshold_str := COALESCE(to_char(v_threshold, 'HH24:MI'), '08:30');
  v_time_str := COALESCE(to_char(NEW.time, 'HH24:MI'), '--:--');

  -- Notify by role
  IF array_length(v_roles, 1) > 0 THEN
    INSERT INTO public.notifications (user_id, organization_id, title, message, type, link)
    SELECT DISTINCT
      ur.user_id,
      NEW.organization_id,
      'Retard enregistré',
      COALESCE(v_employee_name, 'Un employé')
        || ' a pointé à ' || v_time_str
        || ' (heure limite ' || v_threshold_str || ') le '
        || to_char(NEW.date, 'DD/MM/YYYY') || '.',
      'warning',
      '/attendance'
    FROM public.user_roles ur
    WHERE ur.organization_id = NEW.organization_id
      AND ur.role::text = ANY(v_roles);
  END IF;

  -- Notify extra specific recipients (profile_ids)
  IF array_length(v_extras, 1) > 0 THEN
    INSERT INTO public.notifications (user_id, organization_id, title, message, type, link)
    SELECT DISTINCT
      p.user_id,
      NEW.organization_id,
      'Retard enregistré',
      COALESCE(v_employee_name, 'Un employé')
        || ' a pointé à ' || v_time_str
        || ' (heure limite ' || v_threshold_str || ') le '
        || to_char(NEW.date, 'DD/MM/YYYY') || '.',
      'warning',
      '/attendance'
    FROM public.profiles p
    WHERE p.id = ANY(v_extras)
      AND p.organization_id = NEW.organization_id
      AND p.user_id IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$function$;
