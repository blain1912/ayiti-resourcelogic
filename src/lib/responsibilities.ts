/**
 * Référentiel générique des fonctions / responsabilités exercées.
 *
 * IMPORTANT :
 * - une responsabilité n'est PAS un poste (ex. « Chef de poste » ne doit jamais
 *   apparaître dans le référentiel des postes) ;
 * - une responsabilité n'est PAS un rôle applicatif : les droits restent gérés
 *   par le système d'autorisation existant (user_roles) ;
 * - la liste est indicative : le champ reste libre, donc extensible sans
 *   modification de code ni migration.
 */

export const COMMON_RESPONSIBILITIES: string[] = [
  "Responsable administratif",
  "Responsable des ressources humaines",
  "Responsable de la comptabilité",
  "Responsable des archives",
  "Responsable du service commercial",
  "Responsable du service culturel",
  "Responsable de la communication",
  "Point focal",
];

/** Responsabilités propres au réseau diplomatique et consulaire. */
export const DIPLOMATIC_RESPONSIBILITIES: string[] = [
  "Chef de poste",
  "Chef de poste adjoint",
  "Responsable des affaires consulaires",
  "Responsable de l'état civil",
  "Responsable des visas",
];

export const getResponsibilitySuggestions = (isDiplomatic: boolean): string[] =>
  isDiplomatic
    ? [...DIPLOMATIC_RESPONSIBILITIES, ...COMMON_RESPONSIBILITIES]
    : COMMON_RESPONSIBILITIES;

/** Responsabilité identifiant le dirigeant d'une représentation. */
export const HEAD_OF_POST_RESPONSIBILITY = "Chef de poste";
