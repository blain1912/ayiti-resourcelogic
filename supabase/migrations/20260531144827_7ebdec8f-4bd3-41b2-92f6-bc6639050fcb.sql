
CREATE OR REPLACE FUNCTION public.notify_late_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_name text;
  v_threshold time;
  v_threshold_str text;
  v_time_str text;
  v_org_name text;
BEGIN
  -- Only act when status is 'retard' AND it's a new record OR status just changed to retard
  IF NEW.status <> 'retard' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'retard' THEN
    -- already notified previously for this record
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_employee_name
  FROM public.profiles WHERE id = NEW.profile_id;

  SELECT late_threshold_time, name
    INTO v_threshold, v_org_name
  FROM public.organizations WHERE id = NEW.organization_id;

  v_threshold_str := COALESCE(to_char(v_threshold, 'HH24:MI'), '08:30');
  v_time_str := COALESCE(to_char(NEW.time, 'HH24:MI'), '--:--');

  INSERT INTO public.notifications (user_id, organization_id, title, message, type, link)
  SELECT
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
    AND ur.role IN ('admin','directeur_general','directeur_administratif','directeur_rh','secretaire','chef_service');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_late_attendance_ins ON public.attendance;
CREATE TRIGGER trg_notify_late_attendance_ins
AFTER INSERT ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.notify_late_attendance();

DROP TRIGGER IF EXISTS trg_notify_late_attendance_upd ON public.attendance;
CREATE TRIGGER trg_notify_late_attendance_upd
AFTER UPDATE OF status ON public.attendance
FOR EACH ROW
WHEN (NEW.status = 'retard' AND OLD.status IS DISTINCT FROM 'retard')
EXECUTE FUNCTION public.notify_late_attendance();
