import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Documents du dossier agent. Le filtrage par confidentialité est appliqué
 * côté serveur (RLS) : ce hook ne fait que lire ce que la base accepte de
 * retourner à l'utilisateur courant.
 */
export interface EmployeeDocumentRow {
  id: string;
  profile_id: string;
  organization_id: string;
  document_type: string;
  category: string;
  title: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  reference_number: string | null;
  document_date: string | null;
  effective_date: string | null;
  expires_at: string | null;
  issuer: string | null;
  comment: string | null;
  confidentiality: string;
  is_archived: boolean;
  uploaded_by: string;
  created_at: string;
}

export const useEmployeeDocuments = (profileId?: string | null) =>
  useQuery({
    queryKey: ["employee-documents", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("profile_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EmployeeDocumentRow[];
    },
  });
