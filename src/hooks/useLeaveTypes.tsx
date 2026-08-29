import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LeaveType = Database["public"]["Tables"]["leave_types"]["Row"];
export type LeaveTypeInsert = Database["public"]["Tables"]["leave_types"]["Insert"];

export const useLeaveTypes = (organizationId?: string | null, includeInactive = false) =>
  useQuery({
    queryKey: ["leave-types", organizationId, includeInactive],
    enabled: !!organizationId,
    queryFn: async () => {
      let query = supabase
        .from("leave_types")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("display_order", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LeaveType[];
    },
  });

export const useSaveLeaveType = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<LeaveType> & { code: string; label: string }) => {
      const payload = { ...values, organization_id: organizationId! } as LeaveTypeInsert;
      const { error } = values.id
        ? await supabase.from("leave_types").update(payload).eq("id", values.id)
        : await supabase.from("leave_types").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave-types", organizationId] }),
  });
};

export const useToggleLeaveType = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("leave_types").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave-types", organizationId] }),
  });
};
