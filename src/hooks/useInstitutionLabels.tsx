import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_LABELS,
  DIPLOMATIC_LABELS,
  InstitutionLabels,
  isDiplomaticInstitution,
} from "@/lib/institutionTypes";

/**
 * Retourne les libellés à utiliser pour une institution donnée.
 * Sans personnalisation, on retombe exactement sur le vocabulaire actuel de GRHPro,
 * de sorte que les écrans existants restent inchangés.
 */
export const useInstitutionLabels = (organizationId?: string | null) => {
  const [labels, setLabels] = useState<InstitutionLabels>(DEFAULT_LABELS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [{ data: org }, { data: custom }] = await Promise.all([
          supabase.from("organizations").select("type").eq("id", organizationId).maybeSingle(),
          (supabase as any)
            .from("institution_labels")
            .select("labels")
            .eq("organization_id", organizationId)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const base = isDiplomaticInstitution(org?.type) ? DIPLOMATIC_LABELS : DEFAULT_LABELS;
        setLabels({ ...base, ...((custom?.labels as Partial<InstitutionLabels>) || {}) });
      } catch {
        if (!cancelled) setLabels(DEFAULT_LABELS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return { labels, loading };
};
