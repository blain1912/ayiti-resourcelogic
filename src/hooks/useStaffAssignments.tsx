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
 * Crée une nouvelle affectation via la fonction serveur atomique
 * `hr_create_assignment` : la clôture de l'affectation principale précédente,
 * la création de la nouvelle et l'écriture du journal RH se font en une seule
 * transaction côté serveur. Les affectations temporaires / secondaires / en
 * cumul ne clôturent jamais l'affectation principale.
 */
export const useCreateAssignment = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignment,
      movement,
    }: {
      assignment: Partial<AssignmentRow> & { profile_id: string; start_date: string };
      closePrevious?: boolean;
      movement?: { movement_type: string; comment?: string | null };
    }) => {
      const { data, error } = await supabase.rpc("hr_create_assignment", {
        _organization_id: organizationId!,
        _profile_id: assignment.profile_id,
        _start_date: assignment.start_date,
        _unit_id: assignment.unit_id ?? null,
        _position_id: assignment.position_id ?? null,
        _supervisor_profile_id: assignment.supervisor_profile_id ?? null,
        _assignment_kind: assignment.assignment_kind ?? "principale",
        _workload_percentage: assignment.workload_percentage ?? null,
        _end_date: assignment.end_date ?? null,
        _decision_reference: assignment.decision_reference ?? null,
        _comment: movement?.comment ?? assignment.comment ?? null,
        _movement_type: movement?.movement_type ?? null,
      });
      if (error) throw error;
      return data as string;
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
