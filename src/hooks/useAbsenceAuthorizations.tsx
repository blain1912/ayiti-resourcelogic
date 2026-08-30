import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { logHrEvent } from "@/lib/hrAudit";
import { detectHrConflicts, isBlockingConflict, describeConflicts } from "@/hooks/useHrDayStatus";

export type AbsenceAuthorization =
  Database["public"]["Tables"]["absence_authorizations"]["Row"] & {
    employee?: { id: string; full_name: string | null; prenom: string | null; nom: string | null } | null;
  };

export interface AuthorizationFilters {
  scope: "mine" | "organization";
  profileId?: string | null;
  status?: string;
  from?: string;
  to?: string;
}

export const useAbsenceAuthorizations = (
  organizationId?: string | null,
  filters: AuthorizationFilters = { scope: "mine" }
) =>
  useQuery({
    queryKey: ["absence-authorizations", organizationId, filters],
    enabled: !!organizationId && (filters.scope === "organization" || !!filters.profileId),
    queryFn: async () => {
      let query = supabase
        .from("absence_authorizations")
        .select(
          `*, employee:profiles!absence_authorizations_profile_id_fkey(id, full_name, prenom, nom)`
        )
        .eq("organization_id", organizationId!)
        .order("date", { ascending: false });

      if (filters.scope === "mine" && filters.profileId) {
        query = query.eq("profile_id", filters.profileId);
      }
      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.from) query = query.gte("date", filters.from);
      if (filters.to) query = query.lte("date", filters.to);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AbsenceAuthorization[];
    },
  });

export const useCreateAuthorization = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      values: Database["public"]["Tables"]["absence_authorizations"]["Insert"]
    ) => {
      const { data: auth } = await supabase.auth.getUser();

      // Contrôle des chevauchements (congé / mission / autorisation journée complète)
      if (values.profile_id && values.date) {
        const conflicts = await detectHrConflicts(values.profile_id, values.date, values.date);
        if (conflicts.some(isBlockingConflict)) {
          throw new Error(
            `Situation incompatible déjà approuvée : ${describeConflicts(
              conflicts.filter(isBlockingConflict)
            )}`
          );
        }
      }

      const { data: created, error } = await supabase
        .from("absence_authorizations")
        .insert({
          ...values,
          organization_id: organizationId!,
          requested_by: auth?.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      await logHrEvent({
        organization_id: organizationId!,
        profile_id: values.profile_id,
        entity_type: "absence_authorization",
        entity_id: created.id,
        action: "created",
        new_value: values,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["absence-authorizations"] }),
  });
};

export const useReviewAuthorization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      comment,
    }: {
      id: string;
      status: "approved" | "rejected" | "cancelled";
      comment?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: updated, error } = await supabase
        .from("absence_authorizations")
        .update({
          status,
          reviewed_by: auth?.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          review_comment: comment || null,
        })
        .eq("id", id)
        .select("id, organization_id, profile_id, status")
        .maybeSingle();
      if (error) throw error;
      if (!updated) {
        throw new Error(
          "Action refusée : vous ne pouvez pas valider votre propre demande ou une demande hors de votre périmètre."
        );
      }

      await logHrEvent({
        organization_id: updated.organization_id,
        profile_id: updated.profile_id,
        entity_type: "absence_authorization",
        entity_id: id,
        action: status,
        new_value: { status, comment: comment ?? null },
        comment: comment ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absence-authorizations"] });
      qc.invalidateQueries({ queryKey: ["hr-day-status-bulk"] });
      qc.invalidateQueries({ queryKey: ["hr-absence-context"] });
    },
  });
};
