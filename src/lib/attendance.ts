// Référentiel partagé du module Présences (Phase 5)
// Générique : ministères, directions générales, organismes, ambassades, consulats, missions.

export type PunchType =
  | "arrivee"
  | "depart"
  | "pause"
  | "reprise"
  | "sortie_temporaire"
  | "retour";

export type PunchMethod =
  | "manuel"
  | "qr_central"
  | "qr_individuel"
  | "correction"
  | "import";

export type AttendanceScheduleScope = "organization" | "unit" | "profile";

export const PUNCH_TYPE_LABELS: Record<PunchType, string> = {
  arrivee: "Arrivée",
  depart: "Départ",
  pause: "Pause",
  reprise: "Reprise",
  sortie_temporaire: "Sortie temporaire",
  retour: "Retour",
};

export const PUNCH_METHOD_LABELS: Record<PunchMethod, string> = {
  manuel: "Saisie manuelle",
  qr_central: "QR central",
  qr_individuel: "QR individuel",
  correction: "Correction administrative",
  import: "Import",
};

/** Statuts de présence journaliers (compatibles avec l'existant : present, absent, retard, conge, maladie, permission) */
export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Présent" },
  { value: "retard", label: "Retard" },
  { value: "absent", label: "Absent" },
  { value: "absence_justifiee", label: "Absence justifiée" },
  { value: "absence_non_justifiee", label: "Absence non justifiée" },
  { value: "conge", label: "Congé" },
  { value: "maladie", label: "Maladie" },
  { value: "mission", label: "Mission" },
  { value: "permission", label: "Autorisation / Permission" },
  { value: "teletravail", label: "Télétravail" },
  { value: "autre", label: "Autre" },
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]["value"];

export const attendanceStatusLabel = (status: string) =>
  ATTENDANCE_STATUSES.find((s) => s.value === status)?.label ?? status;

/** Statuts considérés comme une justification (aucune absence injustifiée générée) */
export const JUSTIFIED_STATUSES = [
  "conge",
  "maladie",
  "mission",
  "permission",
  "absence_justifiee",
  "teletravail",
];

export const PRESENT_STATUSES = ["present", "retard", "teletravail"];

export const WEEK_DAYS = [
  { value: 1, label: "Lundi", short: "Lun" },
  { value: 2, label: "Mardi", short: "Mar" },
  { value: 3, label: "Mercredi", short: "Mer" },
  { value: 4, label: "Jeudi", short: "Jeu" },
  { value: 5, label: "Vendredi", short: "Ven" },
  { value: 6, label: "Samedi", short: "Sam" },
  { value: 7, label: "Dimanche", short: "Dim" },
];

export interface WorkScheduleLike {
  scope: AttendanceScheduleScope;
  unit_id: string | null;
  profile_id: string | null;
  work_days: number[];
  arrival_time: string;
  departure_time: string;
  break_start: string | null;
  break_end: string | null;
  tolerance_minutes: number;
  is_active: boolean;
}

/** Héritage : horaire individuel > horaire structure > horaire organisation */
export const resolveSchedule = <T extends WorkScheduleLike>(
  schedules: T[],
  profileId: string | null,
  unitId: string | null
): T | null => {
  const active = schedules.filter((s) => s.is_active);
  return (
    active.find((s) => s.scope === "profile" && s.profile_id === profileId) ||
    active.find((s) => s.scope === "unit" && unitId && s.unit_id === unitId) ||
    active.find((s) => s.scope === "organization") ||
    null
  );
};

export const timeToMinutes = (time: string | null | undefined): number | null => {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

/** Retard = minutes au-delà de (heure prévue + tolérance) */
export const computeLateMinutes = (
  actualTime: string,
  expectedTime: string | null,
  toleranceMinutes: number
): number => {
  const actual = timeToMinutes(actualTime);
  const expected = timeToMinutes(expectedTime);
  if (actual === null || expected === null) return 0;
  const diff = actual - (expected + (toleranceMinutes || 0));
  return diff > 0 ? diff : 0;
};

/** ISO week day (1 = lundi ... 7 = dimanche) */
export const isoWeekDay = (date: Date) => (date.getDay() === 0 ? 7 : date.getDay());

export const isWorkingDay = (date: Date, schedule: WorkScheduleLike | null) => {
  const days = schedule?.work_days?.length ? schedule.work_days : [1, 2, 3, 4, 5];
  return days.includes(isoWeekDay(date));
};

export const formatMinutes = (minutes: number) => {
  if (!minutes) return "0 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m.toString().padStart(2, "0")}` : `${m} min`;
};

/** Valeur encodée dans les QR sécurisés (jamais de données personnelles) */
export const buildSecureQrValue = (token: string) => `GRHPRO-ATT:${token}`;

export const parseSecureQrToken = (raw: string): string | null => {
  const value = raw.trim();
  const match = value.match(/^GRHPRO-ATT:([A-Za-z0-9_-]{16,})$/);
  if (match) return match[1];
  try {
    const url = new URL(value);
    const token = url.searchParams.get("t") || url.searchParams.get("token");
    if (token && /^[A-Za-z0-9_-]{16,}$/.test(token)) return token;
  } catch {
    // pas une URL
  }
  return null;
};
