import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserCog, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  user_id: string;
  role?: AppRole;
  role_id?: string;
}

interface OrgOption {
  id: string;
  name: string;
}

const RoleManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const roleLabels: Record<AppRole, string> = {
    admin: "Administrateur",
    directeur_general: "Directeur Général",
    directeur_administratif: "Directeur Administratif",
    directeur_rh: "Directeur RH",
    secretaire: "Secrétaire",
    approbateur_conges: "Approbateur Congés",
    employe: "Employé",
    user: "Utilisateur",
  };


  const roleColors: Record<AppRole, string> = {
    admin: "bg-red-500",
    directeur_general: "bg-purple-500",
    directeur_administratif: "bg-blue-500",
    directeur_rh: "bg-green-500",
    secretaire: "bg-teal-500",
    approbateur_conges: "bg-amber-500",
    employe: "bg-gray-500",
    user: "bg-slate-500",
  };

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  const checkAdminAndLoadUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get user's profile and organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.organization_id) {
        navigate("/");
        return;
      }

      setOrganizationId(profile.organization_id);

      // Check if user has admin role
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", profile.organization_id)
        .maybeSingle();

      const adminRoles = ['admin', 'directeur_general', 'directeur_administratif', 'directeur_rh', 'secretaire'];
      if (!userRole || !adminRoles.includes(userRole.role)) {
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadUsers(profile.organization_id);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (orgId: string) => {
    try {
      // Get all profiles in the organization
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, user_id")
        .eq("organization_id", orgId)
        .eq("approval_status", "approved");

      if (profilesError) throw profilesError;

      // Get roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role")
        .eq("organization_id", orgId);

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role,
          role_id: userRole?.id,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole, currentRoleId?: string) => {
    if (!organizationId) return;

    setUpdating(userId);
    try {
      if (currentRoleId) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("id", currentRoleId);

        if (error) throw error;
      } else {
        // Create new role
        const { error } = await supabase
          .from("user_roles")
          .insert([{
            user_id: userId,
            role: newRole,
            organization_id: organizationId,
          }]);

        if (error) throw error;
      }

      toast({
        title: "Rôle mis à jour",
        description: "Le rôle de l'utilisateur a été modifié avec succès",
      });

      await loadUsers(organizationId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Gestion des Rôles</h1>
            <p className="text-muted-foreground mt-2">
              Gérez les rôles et permissions des utilisateurs de votre organisation
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Utilisateurs et Rôles
            </CardTitle>
            <CardDescription>
              Attribuez ou modifiez les rôles des utilisateurs. Les changements sont appliqués immédiatement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle Actuel</TableHead>
                  <TableHead>Modifier le Rôle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "Sans nom"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.role ? (
                        <Badge className={`${roleColors[user.role]} text-white`}>
                          {roleLabels[user.role]}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Aucun rôle</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role || "employe"}
                        onValueChange={(value) => handleRoleChange(user.user_id, value as AppRole, user.role_id)}
                        disabled={updating === user.user_id}
                      >
                        <SelectTrigger className="w-[240px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="user">Utilisateur</SelectItem>
                          <SelectItem value="employe">Employé</SelectItem>
                          <SelectItem value="secretaire">Secrétaire</SelectItem>
                          <SelectItem value="approbateur_conges">Approbateur Congés</SelectItem>
                          <SelectItem value="directeur_rh">Directeur RH</SelectItem>
                          <SelectItem value="directeur_administratif">Directeur Administratif</SelectItem>
                          <SelectItem value="directeur_general">Directeur Général</SelectItem>
                          <SelectItem value="admin">Administrateur</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {users.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucun utilisateur trouvé dans votre organisation</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description des Rôles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge className={`${roleColors.admin} text-white`}>Administrateur</Badge>
              <span className="text-sm">Accès complet à toutes les fonctionnalités, gestion des abonnements</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${roleColors.directeur_general} text-white`}>Directeur Général</Badge>
              <span className="text-sm">Accès administratif complet, approbations, rapports</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${roleColors.directeur_administratif} text-white`}>Directeur Administratif</Badge>
              <span className="text-sm">Gestion administrative, accès aux données de l'organisation</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${roleColors.directeur_rh} text-white`}>Directeur RH</Badge>
              <span className="text-sm">Gestion RH, présence, approbations, badges employés</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${roleColors.secretaire} text-white`}>Secrétaire</Badge>
              <span className="text-sm">Gestion des fiches employés, pointage de présence, génération QR code, impression fiche vierge</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${roleColors.approbateur_conges} text-white`}>Approbateur Congés</Badge>
              <span className="text-sm">Peut approuver ou rejeter les demandes de congés uniquement</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${roleColors.employe} text-white`}>Employé</Badge>
              <span className="text-sm">Accès de base : profil, demandes de congés, documents</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${roleColors.user} text-white`}>Utilisateur</Badge>
              <span className="text-sm">Accès minimal, consultation uniquement</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleManagement;
