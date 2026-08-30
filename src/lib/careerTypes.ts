/**
 * Référentiels de la Phase 7 — dossier administratif et carrière.
 *
 * Ces listes ne pilotent que la présentation et la saisie : aucune donnée
 * historique n'est supprimée lorsqu'une valeur n'apparaît plus dans un
 * référentiel (les valeurs inconnues sont affichées telles quelles).
 */

import type { OrganizationCapabilities } from "@/lib/organizationCapabilities";

/* ------------------------------------------------------------------ */
/* Statut administratif durable (≠ statut RH du jour `hr_day_status`)  */
/* ------------------------------------------------------------------ */

export type AdministrativeStatus =
  | "actif"
  | "conge"
  | "mission"
  | "suspendu"
  | "detache"
  | "mis_a_disposition"
  | "disponibilite"
  | "retraite"
  | "fin_contrat"
  | "demission"
  | "revoque"
  | "decede"
  | "autre";

export const ADMINISTRATIVE_STATUSES: Array<{
  value: AdministrativeStatus;
  label: string;
  /** true = l'agent est encore dans les effectifs actifs */
  inService: boolean;
}> = [
  { value: "actif", label: "Actif", inService: true },
  { value: "conge", label: "En congé", inService: true },
  { value: "mission", label: "En mission", inService: true },
  { value: "suspendu", label: "Suspendu", inService: false },
  { value: "detache", label: "Détaché", inService: true },
  { value: "mis_a_disposition", label: "Mis à disposition", inService: true },
  { value: "disponibilite", label: "En disponibilité", inService: false },
  { value: "retraite", label: "Retraité", inService: false },
  { value: "fin_contrat", label: "Fin de contrat", inService: false },
  { value: "demission", label: "Démissionnaire", inService: false },
  { value: "revoque", label: "Révoqué", inService: false },
  { value: "decede", label: "Décédé", inService: false },
  { value: "autre", label: "Autre", inService: true },
];

export const administrativeStatusLabel = (value?: string | null) =>
  ADMINISTRATIVE_STATUSES.find((s) => s.value === value)?.label || value || "Non renseigné";

export const isInServiceStatus = (value?: string | null) =>
  ADMINISTRATIVE_STATUSES.find((s) => s.value === value)?.inService ?? true;

/* ------------------------------------------------------------------ */
/* Événements de carrière (stockés dans `staff_movements`)             */
/* ------------------------------------------------------------------ */

export interface CareerEventType {
  value: string;
  label: string;
  /** Crée par défaut une affectation via `hr_create_assignment` */
  createsAssignment: boolean;
  /** Statut administratif proposé par défaut */
  suggestedStatus?: AdministrativeStatus;
  /** Réservé au réseau diplomatique et consulaire */
  diplomaticOnly?: boolean;
}

export const CAREER_EVENT_TYPES: CareerEventType[] = [
  { value: "entree", label: "Entrée dans l'organisation", createsAssignment: true, suggestedStatus: "actif" },
  { value: "nomination", label: "Nomination", createsAssignment: true, suggestedStatus: "actif" },
  { value: "affectation", label: "Affectation", createsAssignment: true },
  { value: "reaffectation", label: "Réaffectation", createsAssignment: true },
  { value: "promotion", label: "Promotion", createsAssignment: true },
  { value: "mutation", label: "Mutation", createsAssignment: true },
  { value: "transfert", label: "Transfert", createsAssignment: true },
  { value: "changement_structure", label: "Changement de structure", createsAssignment: true },
  { value: "changement_categorie", label: "Changement de catégorie", createsAssignment: false },
  { value: "detachement", label: "Détachement", createsAssignment: false, suggestedStatus: "detache" },
  { value: "mise_a_disposition", label: "Mise à disposition", createsAssignment: false, suggestedStatus: "mis_a_disposition" },
  { value: "suspension", label: "Suspension", createsAssignment: false, suggestedStatus: "suspendu" },
  { value: "reintegration", label: "Réintégration", createsAssignment: true, suggestedStatus: "actif" },
  { value: "prise_de_poste", label: "Prise de poste (représentation)", createsAssignment: true, suggestedStatus: "actif", diplomaticOnly: true },
  { value: "changement_fonction", label: "Changement de fonction", createsAssignment: true, diplomaticOnly: true },
  { value: "rappel", label: "Rappel", createsAssignment: false, diplomaticOnly: true },
  { value: "fin_mission_diplomatique", label: "Fin de mission (représentation)", createsAssignment: false, diplomaticOnly: true },
  { value: "fin_affectation", label: "Fin d'affectation", createsAssignment: false },
  { value: "depart", label: "Départ de l'organisation", createsAssignment: false, suggestedStatus: "fin_contrat" },
  { value: "retraite", label: "Départ à la retraite", createsAssignment: false, suggestedStatus: "retraite" },
  { value: "autre", label: "Autre décision administrative", createsAssignment: false },
];

/** Types d'événements proposés selon la famille d'organisation. */
export const careerEventTypesFor = (capabilities: OrganizationCapabilities) =>
  CAREER_EVENT_TYPES.filter(
    (t) => !t.diplomaticOnly || capabilities.supports_diplomatic_assignment,
  );

export const careerEventLabel = (value?: string | null) =>
  CAREER_EVENT_TYPES.find((t) => t.value === value)?.label || value || "Mouvement";

/* ------------------------------------------------------------------ */
/* Dossier documentaire                                                */
/* ------------------------------------------------------------------ */

export type DocumentCategory =
  | "identite"
  | "carriere"
  | "emploi"
  | "formation"
  | "conges"
  | "mission"
  | "autre";

export const DOCUMENT_CATEGORIES: Array<{ value: DocumentCategory; label: string }> = [
  { value: "identite", label: "Identité" },
  { value: "carriere", label: "Carrière" },
  { value: "emploi", label: "Emploi" },
  { value: "formation", label: "Formation" },
  { value: "conges", label: "Congés / absences" },
  { value: "mission", label: "Mission" },
  { value: "autre", label: "Autre" },
];

export const documentCategoryLabel = (value?: string | null) =>
  DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label || value || "Autre";

/** Types de documents, regroupés par catégorie. Les anciens types sont conservés. */
export const DOCUMENT_TYPES: Array<{ value: string; label: string; category: DocumentCategory }> = [
  { value: "piece_identite", label: "CIN / Pièce d'identité", category: "identite" },
  { value: "matricule_fiscale", label: "NIF / Matricule fiscale", category: "identite" },
  { value: "passeport", label: "Passeport", category: "identite" },
  { value: "acte_naissance", label: "Acte de naissance", category: "identite" },
  { value: "photo", label: "Photo", category: "identite" },

  { value: "lettre_nomination", label: "Lettre de nomination", category: "carriere" },
  { value: "decision_affectation", label: "Décision d'affectation", category: "carriere" },
  { value: "decision_promotion", label: "Décision de promotion", category: "carriere" },
  { value: "decision_mutation", label: "Décision de mutation", category: "carriere" },
  { value: "decision_rappel", label: "Décision de rappel", category: "carriere" },
  { value: "lettre_reintegration", label: "Lettre de réintégration", category: "carriere" },

  { value: "contrat", label: "Contrat", category: "emploi" },
  { value: "lettre_engagement", label: "Lettre d'engagement", category: "emploi" },
  { value: "description_poste", label: "Description de poste", category: "emploi" },
  { value: "cv", label: "CV", category: "emploi" },

  { value: "diplome", label: "Diplôme", category: "formation" },
  { value: "certificat", label: "Certificat", category: "formation" },
  { value: "attestation", label: "Attestation", category: "formation" },

  { value: "certificat_medical", label: "Certificat médical", category: "conges" },
  { value: "justificatif_absence", label: "Justificatif d'absence", category: "conges" },
  { value: "decision_conge", label: "Décision de congé", category: "conges" },

  { value: "ordre_mission", label: "Ordre de mission", category: "mission" },
  { value: "rapport_mission", label: "Rapport de mission", category: "mission" },

  { value: "declaration_impot", label: "Déclaration définitive d'impôt", category: "autre" },
  { value: "autre", label: "Autre document administratif", category: "autre" },
];

export const documentTypeLabel = (value?: string | null) =>
  DOCUMENT_TYPES.find((t) => t.value === value)?.label || value || "Document";

export const documentTypeCategory = (value?: string | null): DocumentCategory =>
  DOCUMENT_TYPES.find((t) => t.value === value)?.category ?? "autre";

/* Confidentialité ---------------------------------------------------- */

export type Confidentiality = "standard" | "restreint" | "direction";

export const CONFIDENTIALITY_LEVELS: Array<{
  value: Confidentiality;
  label: string;
  description: string;
}> = [
  { value: "standard", label: "Standard RH", description: "Visible par l'agent et le service RH" },
  { value: "restreint", label: "Restreint RH", description: "Service RH uniquement, pas l'agent" },
  { value: "direction", label: "Direction uniquement", description: "Direction et administrateurs uniquement" },
];

export const confidentialityLabel = (value?: string | null) =>
  CONFIDENTIALITY_LEVELS.find((c) => c.value === value)?.label || value || "Standard RH";

/* Expiration --------------------------------------------------------- */

export type ExpiryState = "none" | "valid" | "expiring" | "expired";

export const EXPIRY_WARNING_DAYS = 60;

export const documentExpiryState = (expiresAt?: string | null, today = new Date()): ExpiryState => {
  if (!expiresAt) return "none";
  const end = new Date(`${expiresAt}T00:00:00`);
  if (Number.isNaN(end.getTime())) return "none";
  const days = Math.floor((end.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= EXPIRY_WARNING_DAYS) return "expiring";
  return "valid";
};

export const expiryStateLabel: Record<ExpiryState, string> = {
  none: "—",
  valid: "Valide",
  expiring: "Expire bientôt",
  expired: "Expiré",
};
