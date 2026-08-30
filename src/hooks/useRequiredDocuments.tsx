import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Référentiel configurable des pièces attendues au dossier, par organisation.
 * Aucune liste universelle n'est imposée : si l'organisation n'a rien défini,
 * la complétude n'est pas calculée.
 */
export interface RequiredDocument {
  id: string;
  organization_id: string;
  label: string;
  category: string;
  document_type: string | null;
  is_mandatory: boolean;
  applies_to_category: string | null;
  requires_expiry: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const useRequiredDocuments = (organizationId?: string | null) =>
  useQuery({
    queryKey: ["required-documents", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_required_documents")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("display_order")
        .order("label");
      if (error) throw error;
      return (data || []) as unknown as RequiredDocument[];
    },
  });

export const useSaveRequiredDocument = (organizationId?: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<RequiredDocument> & { label: string }) => {
      const payload = {
        organization_id: organizationId!,
        label: input.label,
        category: input.category ?? "autre",
        document_type: input.document_type ?? null,
        is_mandatory: input.is_mandatory ?? true,
        applies_to_category: input.applies_to_category ?? null,
        requires_expiry: input.requires_expiry ?? false,
        is_active: input.is_active ?? true,
        display_order: input.display_order ?? 0,
      };
      if (input.id) {
        const { error } = await supabase
          .from("organization_required_documents")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("organization_required_documents")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["required-documents"] }),
  });
};

export const useDeleteRequiredDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Désactivation logique par défaut : le référentiel garde sa trace.
      const { error } = await supabase
        .from("organization_required_documents")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["required-documents"] }),
  });
};
