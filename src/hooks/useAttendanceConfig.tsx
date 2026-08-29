import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { AttendanceScheduleScope } from "@/lib/attendance";

export type AttendanceSettings = Database["public"]["Tables"]["attendance_settings"]["Row"];
export type WorkSchedule = Database["public"]["Tables"]["work_schedules"]["Row"];
export type AttendanceHoliday = Database["public"]["Tables"]["attendance_holidays"]["Row"];
export type AttendanceQrToken = Database["public"]["Tables"]["attendance_qr_tokens"]["Row"];
export type AttendancePunch = Database["public"]["Tables"]["attendance_punches"]["Row"];
export type AttendanceCorrection =
  Database["public"]["Tables"]["attendance_correction_requests"]["Row"];

export const DEFAULT_ATTENDANCE_SETTINGS = {
  manual_enabled: true,
  central_qr_enabled: false,
  individual_qr_enabled: false,
  telework_enabled: false,
  anti_double_seconds: 60,
};

/* ------------------------------- Paramètres ------------------------------- */

export const useAttendanceSettings = (organizationId?: string | null) =>
  useQuery({
    queryKey: ["attendance-settings", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_settings")
        .select("*")
        .eq("organization_id", organizationId!)
        .maybeSingle();
      if (error) throw error;
      return data as AttendanceSettings | null;
    },
  });

export const useSaveAttendanceSettings = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<AttendanceSettings>) => {
      const { error } = await supabase
        .from("attendance_settings")
        .upsert(
          { organization_id: organizationId!, ...DEFAULT_ATTENDANCE_SETTINGS, ...values },
          { onConflict: "organization_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance-settings", organizationId] }),
  });
};

/* --------------------------------- Horaires -------------------------------- */

export const useWorkSchedules = (organizationId?: string | null) =>
  useQuery({
    queryKey: ["work-schedules", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_schedules")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("scope", { ascending: true });
      if (error) throw error;
      return (data || []) as WorkSchedule[];
    },
  });

export interface WorkScheduleInput {
  id?: string;
  scope: AttendanceScheduleScope;
  unit_id?: string | null;
  profile_id?: string | null;
  name: string;
  work_days: number[];
  arrival_time: string;
  departure_time: string;
  break_start?: string | null;
  break_end?: string | null;
  tolerance_minutes: number;
  is_active?: boolean;
}

export const useSaveWorkSchedule = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: WorkScheduleInput) => {
      const payload = {
        organization_id: organizationId!,
        scope: input.scope,
        unit_id: input.scope === "unit" ? input.unit_id ?? null : null,
        profile_id: input.scope === "profile" ? input.profile_id ?? null : null,
        name: input.name,
        work_days: input.work_days,
        arrival_time: input.arrival_time,
        departure_time: input.departure_time,
        break_start: input.break_start || null,
        break_end: input.break_end || null,
        tolerance_minutes: input.tolerance_minutes,
        is_active: input.is_active ?? true,
      };
      if (input.id) {
        const { error } = await supabase.from("work_schedules").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("work_schedules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-schedules", organizationId] }),
  });
};

export const useDeleteWorkSchedule = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-schedules", organizationId] }),
  });
};

/* ------------------------- Journées non travaillées ------------------------ */

export const useAttendanceHolidays = (organizationId?: string | null) =>
  useQuery({
    queryKey: ["attendance-holidays", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_holidays")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data || []) as AttendanceHoliday[];
    },
  });

export const useSaveHoliday = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; label: string; type: string; notes?: string }) => {
      const { error } = await supabase.from("attendance_holidays").upsert(
        {
          organization_id: organizationId!,
          date: input.date,
          label: input.label,
          type: input.type,
          notes: input.notes || null,
        },
        { onConflict: "organization_id,date" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance-holidays", organizationId] }),
  });
};

export const useDeleteHoliday = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attendance_holidays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance-holidays", organizationId] }),
  });
};

/* --------------------------------- Jetons QR ------------------------------- */

export const useAttendanceQrTokens = (
  organizationId?: string | null,
  scope?: "central" | "individual"
) =>
  useQuery({
    queryKey: ["attendance-qr-tokens", organizationId, scope],
    enabled: !!organizationId,
    queryFn: async () => {
      let query = supabase
        .from("attendance_qr_tokens")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (scope) query = query.eq("scope", scope);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AttendanceQrToken[];
    },
  });

/** Révoque les jetons actifs du périmètre puis en génère un nouveau. */
export const useRegenerateQrToken = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { scope: "central" | "individual"; profileId?: string | null }) => {
      let revoke = supabase
        .from("attendance_qr_tokens")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("organization_id", organizationId!)
        .eq("scope", input.scope)
        .eq("status", "active");
      revoke =
        input.scope === "individual"
          ? revoke.eq("profile_id", input.profileId!)
          : revoke.is("profile_id", null);
      const { error: revokeError } = await revoke;
      if (revokeError) throw revokeError;

      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("attendance_qr_tokens")
        .insert({
          organization_id: organizationId!,
          scope: input.scope,
          profile_id: input.scope === "individual" ? input.profileId! : null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("attendance_audit_log").insert({
        organization_id: organizationId!,
        profile_id: input.scope === "individual" ? input.profileId! : null,
        actor_user_id: user?.id ?? null,
        action: "qr_regeneration",
        method: input.scope === "central" ? "qr_central" : "qr_individuel",
      });

      return data as AttendanceQrToken;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance-qr-tokens"] }),
  });
};

export const useRevokeQrToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from("attendance_qr_tokens")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", tokenId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance-qr-tokens"] }),
  });
};
