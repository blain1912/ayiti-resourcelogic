
-- Fix overly permissive INSERT policies

-- Notifications: only allow inserts where user_id matches or admin
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (has_admin_role(auth.uid(), organization_id) OR user_id = auth.uid());

-- Audit log: only admins can insert (triggers use SECURITY DEFINER so bypass RLS)
DROP POLICY "System can insert audit logs" ON public.correspondence_audit_log;
CREATE POLICY "Admins can insert audit logs" ON public.correspondence_audit_log
  FOR INSERT WITH CHECK (has_admin_role(auth.uid(), organization_id));
