import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type WorkSiteRow = Database["public"]["Tables"]["work_sites"]["Row"];
export type ProfileWorkSiteRow = Database["public"]["Tables"]["profile_work_sites"]["Row"];

export interface WorkSiteInput {
  id?: string;
  name: string;
  code?: string | null;
  site_type: string;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters: number;
  time_zone?: string | null;
  is_active: boolean;
  observations?: string | null;
}

export const useWorkSites = (organizationId?: string | null, onlyActive = false) =>
  useQuery({
    queryKey: ["work-sites", organizationId, onlyActive],
    enabled: !!organizationId,
    queryFn: async () => {
      let query = supabase
        .from("work_sites")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("name");
      if (onlyActive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as WorkSiteRow[];
    },
  });

export const useSaveWorkSite = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: WorkSiteInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        organization_id: organizationId!,
        name: input.name,
        code: input.code || null,
        site_type: input.site_type,
        address: input.address || null,
        country: input.country || null,
        city: input.city || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        radius_meters: input.radius_meters,
        time_zone: input.time_zone || null,
        is_active: input.is_active,
        observations: input.observations || null,
      };
      if (input.id) {
        const { error } = await supabase.from("work_sites").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("work_sites")
          .insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-sites"] }),
  });
};

export const useDeleteWorkSite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_sites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-sites"] }),
  });
};

/* ------------------ Rattachement des agents aux sites ------------------ */

export const useProfileWorkSites = (profileId?: string | null) =>
  useQuery({
    queryKey: ["profile-work-sites", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_work_sites")
        .select("*, work_sites(*)")
        .eq("profile_id", profileId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data || []) as (ProfileWorkSiteRow & { work_sites: WorkSiteRow | null })[];
    },
  });

export interface ProfileSiteInput {
  organization_id: string;
  profile_id: string;
  site_id: string;
  site_role: string;
  start_date: string;
  end_date?: string | null;
  comment?: string | null;
}

export const useAssignProfileSite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileSiteInput) => {
      const { data: { user } } = await supabase.auth.getUser();

      // un seul site principal courant par agent : l'ancien est clôturé
      if (input.site_role === "principal") {
        await supabase
          .from("profile_work_sites")
          .update({ is_current: false, end_date: input.start_date })
          .eq("profile_id", input.profile_id)
          .eq("site_role", "principal")
          .eq("is_current", true);
      }

      const { error } = await supabase.from("profile_work_sites").insert({
        organization_id: input.organization_id,
        profile_id: input.profile_id,
        site_id: input.site_id,
        site_role: input.site_role,
        start_date: input.start_date,
        end_date: input.end_date || null,
        is_current: !input.end_date,
        comment: input.comment || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile-work-sites"] }),
  });
};

export const useCloseProfileSite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, endDate }: { id: string; endDate: string }) => {
      const { error } = await supabase
        .from("profile_work_sites")
        .update({ is_current: false, end_date: endDate })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile-work-sites"] }),
  });
};
