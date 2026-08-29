import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AssignmentRow = Database["public"]["Tables"]["staff_assignments"]["Row"];
type AssignmentInsert = Database["public"]["Tables"]["staff_assignments"]["Insert"];

export type StaffAssignment = AssignmentRow & {
  unit?: { id: string; name: string } | null;
  position?: { id: string; name: string | null } | null;
  supervisor?: { id: string; full_name: string | null; prenom: string | null; nom: string | null } | null;
  employee?: { id: string; full_name: string | null; prenom: string | null; nom: string | null } | null;
};

const SELECT = `*,
  unit:organizational_units!staff_assignments_unit_id_fkey(id, name),
  position:positions!staff_assignments_position_id_fkey(id, name),
  supervisor:profiles!staff_assignments_supervisor_profile_id_fkey(id, full_name, prenom, nom),
  employee:profiles!staff_assignments_profile_id_fkey(id, full_name, prenom, nom)`;

/** Historique complet des affectations d'un agent (jamais écrasé). */
export const useStaffAssignments = (profileId?: string | null) =>
  useQuery({
    queryKey: ["staff-assignments", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_assignments")
        .select(SELECT)
        .eq("profile_id", profileId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as StaffAssignment[];
    },
  });

/** Affectations courantes de toute l'organisation. */
export const useCurrentAssignments = (organizationId?: string | null) =>
  useQuery({
    queryKey: ["staff-assignments-current", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_assignments")
        .select(SELECT)
        .eq("organization_id", organizationId!)
        .eq("is_current", true)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as StaffAssignment[];
    },
  });

/**
 * Crée une nouvelle affectation. L'affectation principale précédente est
 * clôturée (date de fin + is_current = false) au lieu d'être écrasée.
 */
export const useCreateAssignment = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignment,
      closePrevious = true,
      movement,
    }: {
      assignment: Partial<AssignmentRow> & { profile_id: string; start_date: string };
      closePrevious?: boolean;
      movement?: { movement_type: string; comment?: string | null };
    }) => {
      const { data: auth } = await supabase.auth.getUser();

      let previousId: string | null = null;
      if (closePrevious && (assignment.assignment_kind ?? "principale") === "principale") {
        const { data: previous } = await supabase
          .from("staff_assignments")
          .select("id")
          .eq("profile_id", assignment.profile_id)
          .eq("assignment_kind", "principale")
          .eq("is_current", true)
          .order("start_date", { ascending: false })
          .limit(1);

        if (previous && previous.length > 0) {
          previousId = previous[0].id;
          const endDate = new Date(`${assignment.start_date}T00:00:00`);
          endDate.setDate(endDate.getDate() - 1);
          await supabase
            .from("staff_assignments")
            .update({ is_current: false, end_date: endDate.toISOString().slice(0, 10) })
            .eq("id", previousId);
        }
      }

      const { data: created, error } = await supabase
        .from("staff_assignments")
        .insert({
          ...(assignment as AssignmentInsert),
          organization_id: organizationId!,
          created_by: auth?.user?.id ?? null,
          is_current: assignment.end_date ? false : true,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Synchronise la fiche agent pour l'affectation principale courante
      if ((assignment.assignment_kind ?? "principale") === "principale" && !assignment.end_date) {
        await supabase
          .from("profiles")
          .update({ unit_id: assignment.unit_id ?? null, position_id: assignment.position_id ?? null })
          .eq("id", assignment.profile_id);
      }

      await supabase.from("hr_audit_log").insert({
        organization_id: organizationId!,
        profile_id: assignment.profile_id,
        actor_user_id: auth?.user?.id ?? null,
        entity_type: "staff_assignment",
        entity_id: created.id,
        action: "created",
        new_value: assignment as never,
        comment: movement?.comment ?? null,
      });

      return created.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-assignments"] });
      qc.invalidateQueries({ queryKey: ["staff-assignments-current"] });
    },
  });
};

export const useCloseAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, end_date }: { id: string; end_date: string }) => {
      const { error } = await supabase
        .from("staff_assignments")
        .update({ end_date, is_current: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-assignments"] });
      qc.invalidateQueries({ queryKey: ["staff-assignments-current"] });
    },
  });
};
