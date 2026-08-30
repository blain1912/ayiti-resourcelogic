import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HrDayStatus } from "@/lib/hr";

/**
 * Moteur RH central (côté serveur).
 *
 * Toutes les surfaces (Présences, tableaux de bord, rapports) doivent utiliser
 * ces hooks plutôt que de recalculer leurs propres règles : la fonction SQL
 * `hr_day_status` applique l'ordre de priorité officiel
 * suspension > jour non travaillé > férié > congé > mission > autorisation > pointage.
 */

export type HrDayStatusMap = Record<string, HrDayStatus>;

/** Statut RH du jour pour tous les agents d'une institution (un seul appel serveur). */
export const useOrgHrDayStatuses = (organizationId?: string | null, date?: string) => {
  const day = date ?? new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["hr-day-status-bulk", organizationId, day],
    enabled: !!organizationId,
    queryFn: async (): Promise<HrDayStatusMap> => {
      const { data, error } = await supabase.rpc("hr_day_status_bulk", {
        _organization_id: organizationId!,
        _date: day,
      });
      if (error) throw error;
      const map: HrDayStatusMap = {};
      for (const row of (data || []) as { profile_id: string; status: unknown }[]) {
        map[row.profile_id] = row.status as HrDayStatus;
      }
      return map;
    },
  });
};

/** Statut RH d'un agent pour une date donnée. */
export const useHrDayStatus = (profileId?: string | null, date?: string) => {
  const day = date ?? new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["hr-day-status", profileId, day],
    enabled: !!profileId,
    queryFn: async (): Promise<HrDayStatus | null> => {
      const { data, error } = await supabase.rpc("hr_day_status", {
        _profile_id: profileId!,
        _date: day,
      });
      if (error) throw error;
      return (data as unknown as HrDayStatus) ?? null;
    },
  });
};

export interface HrConflict {
  kind: "leave" | "mission" | "authorization" | string;
  id: string;
  start_date: string;
  end_date: string;
  status: string;
}

/**
 * Détection serveur des chevauchements (congé / mission / autorisation).
 * Renvoie la liste brute : l'appelant décide de bloquer ou d'avertir.
 */
export const detectHrConflicts = async (
  profileId: string,
  start: string,
  end: string,
  excludeId?: string | null
): Promise<HrConflict[]> => {
  const { data, error } = await supabase.rpc("hr_detect_conflicts", {
    _profile_id: profileId,
    _start: start,
    _end: end,
    _exclude_id: excludeId ?? null,
  });
  if (error) throw error;
  return (data as unknown as HrConflict[]) || [];
};

const KIND_LABELS: Record<string, string> = {
  leave: "congé",
  mission: "mission",
  authorization: "autorisation journée complète",
};

/** Un conflit est bloquant lorsque la situation opposée est déjà approuvée. */
export const isBlockingConflict = (c: HrConflict) =>
  ["approved", "in_progress"].includes(c.status);

export const describeConflicts = (conflicts: HrConflict[]) =>
  conflicts
    .map(
      (c) =>
        `${KIND_LABELS[c.kind] ?? c.kind} (${c.status}) du ${c.start_date} au ${c.end_date}`
    )
    .join(" ; ");
