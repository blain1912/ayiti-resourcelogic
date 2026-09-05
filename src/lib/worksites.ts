// Référentiel générique des sites de travail / pointage (Phase 8).
// Valable pour toute organisation : ministère, direction générale, organisme,
// ambassade, consulat, mission. Un SITE est un lieu physique ;
// une STRUCTURE est une unité administrative. Les deux sont distincts.

export const SITE_TYPES = [
  { value: "siege", label: "Siège" },
  { value: "bureau", label: "Bureau" },
  { value: "representation", label: "Représentation" },
  { value: "annexe", label: "Annexe" },
  { value: "temporaire", label: "Site temporaire" },
  { value: "autre", label: "Autre" },
] as const;

export type SiteType = (typeof SITE_TYPES)[number]["value"];

export const siteTypeLabel = (value?: string | null) =>
  SITE_TYPES.find((t) => t.value === value)?.label ?? value ?? "—";

export const SITE_ROLES = [
  { value: "principal", label: "Site principal" },
  { value: "temporaire", label: "Site temporaire" },
  { value: "autorise", label: "Site autorisé" },
] as const;

export type SiteRole = (typeof SITE_ROLES)[number]["value"];

export const siteRoleLabel = (value?: string | null) =>
  SITE_ROLES.find((r) => r.value === value)?.label ?? value ?? "—";

/** Résultat du contrôle de lieu attaché à un pointage */
export const LOCATION_STATUSES = [
  { value: "SUR_SITE", label: "Sur site", tone: "success" },
  { value: "HORS_ZONE", label: "Hors zone", tone: "warning" },
  { value: "LOCALISATION_INDISPONIBLE", label: "Localisation indisponible", tone: "muted" },
  { value: "SITE_NON_CONFIGURE", label: "Site non configuré", tone: "muted" },
  { value: "HORS_SITE_AUTORISE", label: "Hors site autorisé", tone: "info" },
  { value: "EXCEPTION_VALIDEE", label: "Exception validée", tone: "info" },
] as const;

export type LocationStatus = (typeof LOCATION_STATUSES)[number]["value"];

export const locationStatusLabel = (value?: string | null) =>
  LOCATION_STATUSES.find((s) => s.value === value)?.label ?? value ?? "—";

/** Politique de travail hors site, configurable par organisation */
export const OFFSITE_POLICIES = [
  { value: "interdit", label: "Hors site interdit", description: "Le pointage est refusé hors de la zone autorisée." },
  { value: "autorise", label: "Hors site autorisé", description: "Le pointage est accepté et le lieu est simplement enregistré." },
  { value: "justification", label: "Hors site avec justification", description: "Le pointage est accepté mais marqué à vérifier." },
  { value: "approbation", label: "Hors site soumis à approbation", description: "Le pointage est enregistré en attente de validation RH." },
] as const;

export type OffsitePolicy = (typeof OFFSITE_POLICIES)[number]["value"];

export const offsitePolicyLabel = (value?: string | null) =>
  OFFSITE_POLICIES.find((p) => p.value === value)?.label ?? value ?? "—";

export interface WorkSite {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  site_type: string;
  address: string | null;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  time_zone: string | null;
  is_active: boolean;
  observations: string | null;
}

/** Distance en mètres entre deux coordonnées (formule de haversine) */
export const distanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
};

/** Fuseaux horaires les plus utilisés par le réseau (liste non limitative) */
export const COMMON_TIME_ZONES = [
  "America/Port-au-Prince",
  "America/Santo_Domingo",
  "America/New_York",
  "America/Toronto",
  "America/Nassau",
  "America/Havana",
  "America/Panama",
  "America/Sao_Paulo",
  "Europe/Paris",
  "Europe/Brussels",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Berlin",
  "Europe/London",
  "Africa/Dakar",
  "Africa/Abidjan",
  "Africa/Kinshasa",
  "Asia/Tokyo",
  "Asia/Taipei",
  "UTC",
];
