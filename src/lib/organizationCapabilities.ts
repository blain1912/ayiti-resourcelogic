/**
 * Capacités de formulaire par famille d'organisation.
 *
 * Objectif : centraliser les règles d'affichage de la fiche agent au lieu
 * de multiplier les conditions `if (type === "consulat")` dans les composants.
 *
 * IMPORTANT : ces capacités ne pilotent QUE l'affichage. Aucune colonne
 * n'est supprimée en base et aucune valeur existante n'est effacée lorsqu'une
 * capacité est désactivée.
 */

import { INSTITUTION_TYPES } from "@/lib/institutionTypes";

export type OrganizationFamily = "public" | "diplomatique" | "enseignement" | "autre";

export interface OrganizationCapabilities {
  /** Code budgétaire affiché dans la fiche agent */
  supports_budget_code: boolean;
  /** Cas particulier « Aussi professeur (cumul de poste) » */
  supports_teaching_role: boolean;
  /** Champs académiques (niveau d'étude, diplômes…) dans la section Formation */
  supports_education_fields: boolean;
  /** Informations propres au réseau diplomatique et consulaire */
  supports_diplomatic_assignment: boolean;
  /** Cumul de postes / affectations multiples (concept RH générique) */
  supports_multiple_assignments: boolean;
  /** Champ calculé « Nombre d'années de service » dans le formulaire */
  supports_years_of_service: boolean;
  /** Adresse haïtienne (rue, ville, département, code postal) */
  supports_home_address: boolean;
  /** Adresse dans le pays de mission (représentations à l'étranger) */
  supports_mission_address: boolean;
  /** Référentiel RH générique « Type d'employé » (permanent, contractuel…) */
  supports_employment_type: boolean;
  /** Référentiel « Statut administratif » de l'agent (diplomate de carrière…) */
  supports_staff_status: boolean;
  /** Champ libre « Fonction / responsabilité » exercée dans la structure */
  supports_function_title: boolean;
  /** Libellé de la date de début de l'affectation en cours */
  entry_date_label: string;
}

const BASE_CAPABILITIES: OrganizationCapabilities = {
  supports_budget_code: true,
  supports_teaching_role: true,
  supports_education_fields: true,
  supports_diplomatic_assignment: false,
  supports_multiple_assignments: true,
  supports_years_of_service: true,
  supports_home_address: true,
  supports_mission_address: false,
  supports_employment_type: true,
  supports_staff_status: false,
  supports_function_title: false,
  entry_date_label: "Date d'entrée en fonction",
};

const FAMILY_CAPABILITIES: Record<OrganizationFamily, Partial<OrganizationCapabilities>> = {
  public: {},
  autre: {},
  enseignement: {
    supports_teaching_role: true,
    supports_education_fields: true,
  },
  diplomatique: {
    supports_budget_code: false,
    supports_teaching_role: false,
    supports_diplomatic_assignment: true,
    // Les champs académiques restent disponibles, mais dans la section Formation.
    supports_education_fields: true,
    supports_years_of_service: false,
    supports_home_address: false,
    supports_mission_address: true,
    supports_employment_type: false,
    supports_staff_status: true,
    supports_function_title: true,
    entry_date_label: "Date de prise de poste",
  },
};

/** Référentiel « Statut administratif » (familles diplomatique/consulaire). */
export const STAFF_STATUSES: Array<{ value: string; label: string }> = [
  { value: "diplomate_carriere", label: "Diplomate de carrière" },
  { value: "agent_consulaire_carriere", label: "Agent consulaire de carrière" },
  { value: "personnel_nomme", label: "Personnel nommé / désigné" },
  { value: "personnel_administratif_permanent", label: "Personnel administratif permanent" },
  { value: "personnel_contractuel", label: "Personnel contractuel" },
  { value: "personnel_local", label: "Personnel local" },
  { value: "personnel_temporaire", label: "Personnel temporaire" },
  { value: "stagiaire", label: "Stagiaire" },
  { value: "autre", label: "Autre" },
];

export const staffStatusLabel = (value?: string | null) =>
  STAFF_STATUSES.find((s) => s.value === value)?.label || value || "Non renseigné";


export const organizationFamily = (type?: string | null): OrganizationFamily => {
  const group = INSTITUTION_TYPES.find((t) => t.value === type)?.group;
  if (group === "diplomatique") return "diplomatique";
  if (group === "public") return "public";
  return "autre";
};

/**
 * Résout les capacités d'une organisation.
 * `overrides` permet de réactiver ponctuellement une capacité (configuration
 * future par organisation) sans toucher au code des formulaires.
 */
export const getOrganizationCapabilities = (
  type?: string | null,
  overrides?: Partial<OrganizationCapabilities> | null,
): OrganizationCapabilities => ({
  ...BASE_CAPABILITIES,
  ...FAMILY_CAPABILITIES[organizationFamily(type)],
  ...(overrides ?? {}),
});

export const DEFAULT_CAPABILITIES = BASE_CAPABILITIES;
