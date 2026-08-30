import { useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import {
  DEFAULT_CAPABILITIES,
  getOrganizationCapabilities,
  type OrganizationCapabilities,
} from "@/lib/organizationCapabilities";

/**
 * Capacités d'affichage de l'organisation courante.
 * Réagit immédiatement au type actuel de l'organisation (y compris pour les
 * comptes créés avant l'ajout des types diplomatiques).
 */
export const useOrganizationCapabilities = (): {
  capabilities: OrganizationCapabilities;
  loading: boolean;
} => {
  const { organization, loading } = useOrganization();

  const capabilities = useMemo(() => {
    if (!organization) return DEFAULT_CAPABILITIES;
    const overrides = (organization as any)?.form_capabilities as
      | Partial<OrganizationCapabilities>
      | null
      | undefined;
    return getOrganizationCapabilities(organization.type, overrides);
  }, [organization]);

  return { capabilities, loading };
};
