/**
 * Référentiel partagé Phase 6 : congés, autorisations, missions, affectations.
 * Ce module centralise les libellés, statuts et règles métier communes afin
 * que les pages Congés, Autorisations, Missions, Affectations et Présences
 * parlent le même langage.
 */

/* ------------------------------- Congés ---------------------------------- */

export const LEAVE_REQUEST_STATUSES = [
  { value: "draft", label: "Brouillon", variant: "outline" as const },
  { value: "pending", label: "Soumise", variant: "secondary" as const },
  { value: "in_review", label: "En validation", variant: "secondary" as const },
  { value: "approved", label: "Approuvée", variant: "default" as const },
  { value: "rejected", label: "Refusée", variant: "destructive" as const },
  { value: "cancelled", label: "Annulée", variant: "outline" as const },
];

export const leaveStatusLabel = (status: string) =>
  LEAVE_REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status;

export const leaveStatusVariant = (status: string) =>
  LEAVE_REQUEST_STATUSES.find((s) => s.value === status)?.variant ?? ("outline" as const);

/* --------------------------- Autorisations ------------------------------- */

export const AUTHORIZATION_TYPES = [
  { value: "debut_journee", label: "Retard autorisé (début de journée)", partial: true },
  { value: "fin_journee", label: "Départ anticipé (fin de journée)", partial: true },
  { value: "sortie_temporaire", label: "Sortie temporaire", partial: true },
  { value: "journee_complete", label: "Journée complète", partial: false },
];

export const authorizationTypeLabel = (value: string) =>
  AUTHORIZATION_TYPES.find((t) => t.value === value)?.label ?? value;

export const isFullDayAuthorization = (value: string) =>
  AUTHORIZATION_TYPES.find((t) => t.value === value)?.partial === false;

export const AUTHORIZATION_STATUSES = [
  { value: "requested", label: "En attente", variant: "secondary" as const },
  { value: "approved", label: "Approuvée", variant: "default" as const },
  { value: "rejected", label: "Refusée", variant: "destructive" as const },
  { value: "cancelled", label: "Annulée", variant: "outline" as const },
];

export const authorizationStatusLabel = (status: string) =>
  AUTHORIZATION_STATUSES.find((s) => s.value === status)?.label ?? status;

export const authorizationStatusVariant = (status: string) =>
  AUTHORIZATION_STATUSES.find((s) => s.value === status)?.variant ?? ("outline" as const);

/* ------------------------------- Missions -------------------------------- */

export const MISSION_STATUSES = [
  { value: "draft", label: "Brouillon", variant: "outline" as const },
  { value: "planned", label: "Planifiée", variant: "secondary" as const },
  { value: "approved", label: "Approuvée", variant: "default" as const },
  { value: "in_progress", label: "En cours", variant: "default" as const },
  { value: "completed", label: "Terminée", variant: "secondary" as const },
  { value: "cancelled", label: "Annulée", variant: "outline" as const },
];

export const missionStatusLabel = (status: string) =>
  MISSION_STATUSES.find((s) => s.value === status)?.label ?? status;

export const missionStatusVariant = (status: string) =>
  MISSION_STATUSES.find((s) => s.value === status)?.variant ?? ("outline" as const);

/** Une mission est comptabilisée dans le moteur de présence à partir de ces statuts. */
export const MISSION_ACTIVE_STATUSES = ["approved", "in_progress"];

/* ----------------------------- Affectations ------------------------------ */

export const ASSIGNMENT_KINDS = [
  { value: "principale", label: "Affectation principale" },
  { value: "secondaire", label: "Affectation secondaire (cumul)" },
  { value: "temporaire", label: "Affectation temporaire" },
  { value: "interim", label: "Intérim" },
  { value: "mise_a_disposition", label: "Mise à disposition" },
];

export const assignmentKindLabel = (value: string) =>
  ASSIGNMENT_KINDS.find((k) => k.value === value)?.label ?? value;

/* --------------------------- Statut RH du jour ---------------------------- */

export type HrDayStatusCode =
  | "unknown"
  | "suspended"
  | "non_working_day"
  | "holiday"
  | "leave"
  | "mission"
  | "authorization"
  | "present"
  | "late"
  | "absent"
  | "working";

export interface HrDayStatus {
  status: HrDayStatusCode | string;
  source: string;
  detail?: string | null;
  reference_id?: string | null;
  authorization_id?: string | null;
  expected_arrival?: string | null;
  expected_departure?: string | null;
  tolerance_minutes?: number | null;
  recorded_status?: string | null;
}

export const HR_DAY_STATUS_LABELS: Record<string, string> = {
  unknown: "Indéterminé",
  suspended: "Compte suspendu",
  non_working_day: "Jour non travaillé",
  holiday: "Jour férié",
  leave: "En congé",
  mission: "En mission",
  authorization: "Absence autorisée",
  present: "Présent",
  late: "Retard",
  absent: "Absent",
  working: "Attendu au travail",
};

export const hrDayStatusLabel = (status: string) =>
  HR_DAY_STATUS_LABELS[status] ?? status;

/**
 * Ordre de priorité appliqué côté serveur par la fonction `hr_day_status`.
 * Reproduit ici uniquement à titre documentaire et pour l'affichage.
 */
export const HR_STATUS_PRIORITY: HrDayStatusCode[] = [
  "suspended",
  "non_working_day",
  "holiday",
  "leave",
  "mission",
  "authorization",
  "late",
  "present",
  "working",
];

/* --------------------------------- Dates --------------------------------- */

export const formatFrDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
};

export const formatFrShortDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

/** Nombre de jours ouvrés (lundi-vendredi), demi-journées incluses. */
export const countWorkingDays = (
  start: string,
  end: string,
  options?: { halfDayStart?: boolean; halfDayEnd?: boolean }
) => {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  if (endDate < startDate) return 0;

  let total = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) total += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  if (options?.halfDayStart && total > 0) total -= 0.5;
  if (options?.halfDayEnd && total > 0) total -= 0.5;
  return Math.max(total, 0);
};

export const datesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart <= bEnd && bStart <= aEnd;
