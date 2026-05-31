import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherSlot {
  id: string;
  organization_id: string;
  profile_id: string;
  day_of_week: number;
  start_time: string; // HH:MM:SS
  end_time: string;
  subject: string | null;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
}

export const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const todayIso = () => new Date().toISOString().slice(0, 10);

export const slotDurationHours = (s: { start_time: string; end_time: string }) => {
  const [sh, sm] = s.start_time.split(":").map(Number);
  const [eh, em] = s.end_time.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
};

/** All active slots for an organization (current period). */
export const useOrgTeacherSlots = (organizationId?: string | null) => {
  return useQuery({
    queryKey: ["teacher-slots", "org", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const today = todayIso();
      const { data, error } = await supabase
        .from("teacher_schedule_slots")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("is_active", true)
        .lte("valid_from", today)
        .or(`valid_to.is.null,valid_to.gte.${today}`);
      if (error) throw error;
      return (data || []) as TeacherSlot[];
    },
  });
};

/** Slots for a single profile. */
export const useProfileTeacherSlots = (profileId?: string | null) => {
  return useQuery({
    queryKey: ["teacher-slots", "profile", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_schedule_slots")
        .select("*")
        .eq("profile_id", profileId!)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data || []) as TeacherSlot[];
    },
  });
};
