/**
 * Taxonomie générique des institutions et structures administratives.
 * Extension GRHPro : administration publique + missions diplomatiques et consulaires.
 * Aucune valeur historique n'est retirée — la liste est uniquement étendue.
 */

export type InstitutionType =
  | "ministere"
  | "direction_generale"
  | "organisme_autonome"
  | "organisme_deconcentre"
  | "institution_publique"
  | "ambassade"
  | "consulat_general"
  | "consulat"
  | "mission_permanente"
  | "mission_diplomatique"
  | "autre";

export const INSTITUTION_TYPES: { value: InstitutionType; fr: string; en: string; group: "public" | "diplomatique" | "autre" }[] = [
  { value: "ministere", fr: "Ministère", en: "Ministry", group: "public" },
  { value: "direction_generale", fr: "Direction Générale", en: "General Directorate", group: "public" },
  { value: "organisme_autonome", fr: "Organisme Autonome", en: "Autonomous Organization", group: "public" },
  { value: "organisme_deconcentre", fr: "Administration Déconcentrée", en: "Decentralized Administration", group: "public" },
  { value: "institution_publique", fr: "Institution Publique", en: "Public Institution", group: "public" },
  { value: "ambassade", fr: "Ambassade", en: "Embassy", group: "diplomatique" },
  { value: "consulat_general", fr: "Consulat Général", en: "Consulate General", group: "diplomatique" },
  { value: "consulat", fr: "Consulat", en: "Consulate", group: "diplomatique" },
  { value: "mission_permanente", fr: "Mission Permanente", en: "Permanent Mission", group: "diplomatique" },
  { value: "mission_diplomatique", fr: "Mission Diplomatique", en: "Diplomatic Mission", group: "diplomatique" },
  { value: "autre", fr: "Autre", en: "Other", group: "autre" },
];

export const INSTITUTION_TYPE_VALUES = INSTITUTION_TYPES.map((t) => t.value) as [InstitutionType, ...InstitutionType[]];

export const institutionTypeLabel = (value?: string | null, language: string = "fr") => {
  const found = INSTITUTION_TYPES.find((t) => t.value === value);
  if (!found) return value ?? "";
  return language === "fr" ? found.fr : found.en;
};

export const isDiplomaticInstitution = (value?: string | null) =>
  INSTITUTION_TYPES.find((t) => t.value === value)?.group === "diplomatique";

/* ------------------------------------------------------------------ */

export type StructureType =
  | "direction_generale"
  | "direction_technique"
  | "departement"
  | "service"
  | "section"
  | "cabinet"
  | "bureau"
  | "unite"
  | "autre";

export const STRUCTURE_TYPES: { value: StructureType; fr: string; en: string }[] = [
  { value: "cabinet", fr: "Cabinet", en: "Cabinet" },
  { value: "direction_generale", fr: "Direction Générale", en: "General Directorate" },
  { value: "direction_technique", fr: "Direction Technique", en: "Technical Directorate" },
  { value: "departement", fr: "Département", en: "Department" },
  { value: "service", fr: "Service", en: "Service" },
  { value: "bureau", fr: "Bureau", en: "Office" },
  { value: "section", fr: "Section", en: "Section" },
  { value: "unite", fr: "Unité", en: "Unit" },
  { value: "autre", fr: "Autre", en: "Other" },
];

export const STRUCTURE_TYPE_VALUES = STRUCTURE_TYPES.map((t) => t.value) as [StructureType, ...StructureType[]];

export const structureTypeLabel = (value?: string | null, language: string = "fr") => {
  const found = STRUCTURE_TYPES.find((t) => t.value === value);
  if (!found) return value ?? "";
  return language === "fr" ? found.fr : found.en;
};

/**
 * Libellés adaptables par institution (« Agent » vs « Employé », etc.).
 * Les valeurs par défaut reproduisent exactement le vocabulaire actuel de GRHPro.
 */
export interface InstitutionLabels {
  agent: string;
  agents: string;
  structure: string;
  structures: string;
  institution: string;
}

export const DEFAULT_LABELS: InstitutionLabels = {
  agent: "Employé",
  agents: "Employés",
  structure: "Structure",
  structures: "Structures",
  institution: "Organisation",
};

export const DIPLOMATIC_LABELS: InstitutionLabels = {
  agent: "Agent",
  agents: "Agents",
  structure: "Structure",
  structures: "Structures",
  institution: "Mission",
};
