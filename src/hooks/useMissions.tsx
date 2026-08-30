import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { logHrEvent } from "@/lib/hrAudit";
import { detectHrConflicts, isBlockingConflict, describeConflicts } from "@/hooks/useHrDayStatus";

type MissionRow = Database["public"]["Tables"]["missions"]["Row"];
type MissionInsert = Database["public"]["Tables"]["missions"]["Insert"];

export interface MissionParticipant {
  id: string;
  profile_id: string;
  role_in_mission: string | null;
  profile?: {
    id: string;
    full_name: string | null;
    prenom: string | null;
    nom: string | null;
  } | null;
}

export type Mission = MissionRow & {
  participants?: MissionParticipant[];
  lead?: { id: string; full_name: string | null; prenom: string | null; nom: string | null } | null;
  unit?: { id: string; name: string } | null;
};

export const useMissions = (organizationId?: string | null, profileId?: string | null) =>
  useQuery({
    queryKey: ["missions", organizationId, profileId ?? "all"],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missions")
        .select(
          `*,
           lead:profiles!missions_lead_profile_id_fkey(id, full_name, prenom, nom),
           unit:organizational_units!missions_unit_id_fkey(id, name),
           participants:mission_participants(
             id, profile_id, role_in_mission,
             profile:profiles!mission_participants_profile_id_fkey(id, full_name, prenom, nom)
           )`
        )
        .eq("organization_id", organizationId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      const missions = (data || []) as unknown as Mission[];
      if (!profileId) return missions;
      return missions.filter((m) => m.participants?.some((p) => p.profile_id === profileId));
    },
  });

export const useSaveMission = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mission,
      participantIds,
    }: {
      mission: Partial<MissionRow> & { subject: string; start_date: string; end_date: string };
      participantIds: string[];
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      let missionId = mission.id;

      // Contrôle serveur des chevauchements pour chaque participant
      const blocking: string[] = [];
      for (const profileId of participantIds) {
        const conflicts = (
          await detectHrConflicts(profileId, mission.start_date, mission.end_date, missionId ?? null)
        ).filter(isBlockingConflict);
        if (conflicts.length > 0) blocking.push(describeConflicts(conflicts));
      }
      if (blocking.length > 0) {
        throw new Error(`Conflit détecté : ${blocking.join(" | ")}`);
      }


      if (missionId) {
        const { error } = await supabase
          .from("missions")
          .update(mission as MissionInsert)
          .eq("id", missionId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("missions")
          .insert({
            ...(mission as MissionInsert),
            organization_id: organizationId!,
            created_by: auth?.user?.id ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        missionId = data.id;
      }

      // Synchronise la liste des participants
      const { error: delError } = await supabase
        .from("mission_participants")
        .delete()
        .eq("mission_id", missionId!);
      if (delError) throw delError;

      if (participantIds.length > 0) {
        const { error: insError } = await supabase.from("mission_participants").insert(
          participantIds.map((profile_id) => ({
            mission_id: missionId!,
            profile_id,
            organization_id: organizationId!,
          }))
        );
        if (insError) throw insError;
      }

      await logHrEvent({
        organization_id: organizationId!,
        entity_type: "mission",
        entity_id: missionId!,
        action: mission.id ? "modified" : "created",
        new_value: { ...mission, participants: participantIds },
      });

      return missionId!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions"] });
      qc.invalidateQueries({ queryKey: ["hr-day-status-bulk"] });
      qc.invalidateQueries({ queryKey: ["hr-absence-context"] });
    },
  });
};

export const useUpdateMissionStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: updated, error } = await supabase
        .from("missions")
        .update({ status })
        .eq("id", id)
        .select("id, organization_id, status")
        .maybeSingle();
      if (error) throw error;
      if (!updated) throw new Error("Action refusée : mission hors de votre périmètre.");

      await logHrEvent({
        organization_id: updated.organization_id,
        entity_type: "mission",
        entity_id: id,
        action: status,
        new_value: { status },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missions"] });
      qc.invalidateQueries({ queryKey: ["hr-day-status-bulk"] });
      qc.invalidateQueries({ queryKey: ["hr-absence-context"] });
    },

  });
};

export const useDeleteMission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("missions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["missions"] }),
  });
};
