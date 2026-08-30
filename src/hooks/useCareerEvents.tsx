import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Carrière de l'agent.
 *
 * Aucun second système de mouvements : les événements de carrière sont stockés
 * dans `staff_movements` et créés par la fonction serveur `hr_record_career_event`,
 * qui réutilise `hr_create_assignment` (affectations Phase 6) et `hr_audit_log`.
 */

export interface CareerEvent {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string | null;
  movement_type: string;
  from_unit: string | null;
  to_unit: string | null;
  from_position: string | null;
  to_position: string | null;
  from_category: string | null;
  to_category: string | null;
  effective_date: string;
  decision_date: string | null;
  decision_reference: string | null;
  notes: string | null;
  assignment_id: string | null;
  previous_assignment_id: string | null;
  document_id: string | null;
  previous_status: string | null;
  new_status: string | null;
  is_cancelled: boolean;
  cancelled_reason: string | null;
  created_at: string;
  created_by: string | null;
}

export const useCareerEvents = (profileId?: string | null) =>
  useQuery({
    queryKey: ["career-events", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_movements")
        .select("*")
        .eq("employee_id", profileId!)
        .order("effective_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CareerEvent[];
    },
  });

export interface CareerEventInput {
  profile_id: string;
  event_type: string;
  effective_date: string;
  unit_id?: string | null;
  position_id?: string | null;
  supervisor_profile_id?: string | null;
  create_assignment?: boolean;
  close_assignment?: boolean;
  decision_date?: string | null;
  assignment_kind?: string;
  new_status?: string | null;
  decision_reference?: string | null;
  document_id?: string | null;
  notes?: string | null;
}

export const useRecordCareerEvent = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CareerEventInput) => {
      const { data, error } = await supabase.rpc("hr_record_career_event", {
        _organization_id: organizationId!,
        _profile_id: input.profile_id,
        _event_type: input.event_type,
        _effective_date: input.effective_date,
        _unit_id: input.unit_id ?? null,
        _position_id: input.position_id ?? null,
        _supervisor_profile_id: input.supervisor_profile_id ?? null,
        _create_assignment: input.create_assignment ?? false,
        _assignment_kind: input.assignment_kind ?? "principale",
        _new_status: input.new_status ?? null,
        _decision_reference: input.decision_reference ?? null,
        _document_id: input.document_id ?? null,
        _notes: input.notes ?? null,
        _decision_date: input.decision_date || null,
        _close_assignment: input.close_assignment ?? false,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["career-events"] });
      qc.invalidateQueries({ queryKey: ["staff-assignments"] });
      qc.invalidateQueries({ queryKey: ["staff-assignments-current"] });
      qc.invalidateQueries({ queryKey: ["employee-dossier"] });
    },
  });
};

/**
 * Annulation logique : une décision historique n'est jamais supprimée
 * physiquement (7AD).
 */
export const useCancelCareerEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("staff_movements")
        .update({ is_cancelled: true, cancelled_reason: reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["career-events"] }),
  });
};
