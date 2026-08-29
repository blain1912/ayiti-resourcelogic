import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HrCurrentProfile {
  id: string;
  organization_id: string | null;
  unit_id: string | null;
  position_id: string | null;
  full_name: string | null;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  sexe: string | null;
  roles: string[];
  isHr: boolean;
  canApprove: boolean;
}

/** Profil de l'agent connecté + rôles, utilisé par tous les modules RH (Phase 6). */
export const useHrProfile = () =>
  useQuery({
    queryKey: ["hr-current-profile"],
    queryFn: async (): Promise<HrCurrentProfile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, organization_id, unit_id, position_id, full_name, prenom, nom, email, sexe")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!profile) return null;

      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = (roleRows || []).map((r) => r.role as string);
      const hrRoles = ["admin", "directeur_general", "directeur_administratif", "directeur_rh", "secretaire"];
      const approverRoles = [...hrRoles, "approbateur_conges", "chef_service"];

      return {
        ...profile,
        roles,
        isHr: roles.some((r) => hrRoles.includes(r)),
        canApprove: roles.some((r) => approverRoles.includes(r)),
      };
    },
  });

export const hrProfileName = (p?: {
  full_name?: string | null;
  prenom?: string | null;
  nom?: string | null;
} | null) => {
  if (!p) return "—";
  if (p.prenom && p.nom) return `${p.prenom} ${p.nom}`;
  return p.full_name || "—";
};
