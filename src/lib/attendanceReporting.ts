// Source de vérité unique des catégories de présence utilisées par les
// rapports, tableaux de bord et exports.
// Les valeurs enregistrées par le moteur RH (hr_day_status / attendance-punch)
// sont : present, retard, absent, conge, maladie, mission, permission,
// teletravail, absence_justifiee, absence_non_justifiee.

export type AttendanceCategory =
  | "present"
  | "late"
  | "absent"
  | "leave"
  | "sick"
  | "mission"
  | "authorization"
  | "other";

const CATEGORY_BY_STATUS: Record<string, AttendanceCategory> = {
  // présents
  present: "present",
  presente: "present",
  teletravail: "present",
  // retards (valeur moteur : "retard" ; "late" conservé pour l'historique)
  retard: "late",
  late: "late",
  // absences
  absent: "absent",
  absence_non_justifiee: "absent",
  // congés
  conge: "leave",
  leave: "leave",
  conge_annuel: "leave",
  absence_justifiee: "leave",
  // maladie
  maladie: "sick",
  sick: "sick",
  conge_maladie: "sick",
  // mission
  mission: "mission",
  // autorisations
  permission: "authorization",
  autorisation: "authorization",
  authorization: "authorization",
};

export const attendanceCategory = (status?: string | null): AttendanceCategory =>
  CATEGORY_BY_STATUS[(status || "").toLowerCase()] ?? "other";

export const isPresentCategory = (status?: string | null) => {
  const c = attendanceCategory(status);
  return c === "present" || c === "late";
};

/** Statuts qui ne doivent JAMAIS être comptés comme absence irrégulière */
export const isJustifiedCategory = (status?: string | null) => {
  const c = attendanceCategory(status);
  return c === "leave" || c === "sick" || c === "mission" || c === "authorization";
};

export const CATEGORY_LABELS: Record<AttendanceCategory, string> = {
  present: "Présent",
  late: "Retard",
  absent: "Absent",
  leave: "Congé",
  sick: "Maladie",
  mission: "Mission",
  authorization: "Autorisation",
  other: "Autre",
};

/** Correspondance moteur hr_day_status -> catégorie de rapport */
const CATEGORY_BY_HR_STATUS: Record<string, AttendanceCategory> = {
  present: "present",
  working: "other",
  late: "late",
  absent: "absent",
  leave: "leave",
  mission: "mission",
  authorization: "authorization",
  holiday: "other",
  non_working_day: "other",
  suspended: "other",
  unknown: "other",
};

export const hrStatusCategory = (status?: string | null): AttendanceCategory =>
  CATEGORY_BY_HR_STATUS[(status || "").toLowerCase()] ?? "other";
