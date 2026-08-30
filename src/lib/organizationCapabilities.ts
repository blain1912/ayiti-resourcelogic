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
  /** Libellé de la date de début de l'affectation en cours */
  entry_date_label: string;
}

const BASE_CAPABILITIES: OrganizationCapabilities = {
  supports_budget_code: true,
  supports_teaching_role: true,
  supports_education_fields: true,
  supports_diplomatic_assignment: false,
  supports_multiple_assignments: true,
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
    entry_date_label: "Date de prise de poste",
  },
};

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
