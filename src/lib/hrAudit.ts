import { supabase } from "@/integrations/supabase/client";

/**
 * Journal RH commun (table `hr_audit_log`) : congés, autorisations, missions,
 * affectations. On réutilise cette table unique plutôt que de multiplier les
 * journaux par module.
 */
export const logHrEvent = async (event: {
  organization_id: string;
  profile_id?: string | null;
  entity_type:
    | "leave_request"
    | "absence_authorization"
    | "mission"
    | "staff_assignment"
    | "career_event"
    | "employee_document"
    | "profile";
  entity_id?: string | null;
  action: string;
  old_value?: unknown;
  new_value?: unknown;
  comment?: string | null;
}) => {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("hr_audit_log").insert({
      organization_id: event.organization_id,
      profile_id: event.profile_id ?? null,
      actor_user_id: auth?.user?.id ?? null,
      entity_type: event.entity_type,
      entity_id: event.entity_id ?? null,
      action: event.action,
      old_value: (event.old_value ?? null) as never,
      new_value: (event.new_value ?? null) as never,
      comment: event.comment ?? null,
    });
  } catch (error) {
    // L'audit ne doit jamais bloquer l'action métier, mais reste tracé en console.
    console.error("hr_audit_log", error);
  }
};
