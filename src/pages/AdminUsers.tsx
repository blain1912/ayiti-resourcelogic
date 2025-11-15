import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Shield, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  organization_id: string | null;
  unit_id: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  organization_id: string;
}

interface Organization {
  id: string;
  name: string;
}

interface OrganizationalUnit {
  id: string;
  name: string;
  organization_id: string;
}

const emailSchema = z.string().trim().email({ message: "Email invalide" }).max(255);

const AdminUsers = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [currentUserOrgId, setCurrentUserOrgId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const [inviteForm, setInviteForm] = useState({
    email: "",
    fullName: "",
    role: "user" as "admin" | "user",
    organizationId: "",
    unitId: "",
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin && currentUserOrgId) {
      loadData();
    }
  }, [isAdmin, currentUserOrgId]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.organization_id) {
        toast.error("Vous devez appartenir à une organisation");
        navigate("/");
        return;
      }

      setCurrentUserOrgId(profile.organization_id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", profile.organization_id)
        .eq("role", "admin")
        .single();

      setIsAdmin(!!roles);
      if (!roles) {
        toast.error("Accès refusé. Vous devez être administrateur.");
        navigate("/");
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // Load profiles from current organization
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", currentUserOrgId);

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Load user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("organization_id", currentUserOrgId);

      if (rolesError) throw rolesError;
      setUserRoles(rolesData || []);

      // Load organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from("organizations")
        .select("*");

      if (orgsError) throw orgsError;
      setOrganizations(orgsData || []);

      // Load units for current organization
      const { data: unitsData, error: unitsError } = await supabase
        .from("organizational_units")
        .select("*")
        .eq("organization_id", currentUserOrgId);

      if (unitsError) throw unitsError;
      setUnits(unitsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erreur lors du chargement des données");
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    try {
      emailSchema.parse(inviteForm.email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    try {
      // Create auth user (in a real app, this would be done via an edge function)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteForm.email.trim(),
        password: crypto.randomUUID(), // Generate random password
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: inviteForm.fullName.trim()
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Échec de la création de l'utilisateur");

      // Update profile with organization and unit
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          organization_id: inviteForm.organizationId || null,
          unit_id: inviteForm.unitId || null,
        })
        .eq("user_id", authData.user.id);

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: inviteForm.role,
          organization_id: inviteForm.organizationId,
        });

      if (roleError) throw roleError;

      toast.success("Utilisateur invité avec succès");
      setShowInviteDialog(false);
      setInviteForm({
        email: "",
        fullName: "",
        role: "user",
        organizationId: "",
        unitId: "",
      });
      loadData();
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error(error.message || "Erreur lors de l'invitation");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: "admin" | "user") => {
    try {
      const existingRole = userRoles.find(
        r => r.user_id === userId && r.organization_id === currentUserOrgId
      );

      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("id", existingRole.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: newRole,
            organization_id: currentUserOrgId,
          });

        if (error) throw error;
      }

      toast.success("Rôle mis à jour avec succès");
      loadData();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Erreur lors de la mise à jour du rôle");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir retirer cet utilisateur de l'organisation?")) {
      return;
    }

    try {
      // Remove role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("organization_id", currentUserOrgId);

      if (roleError) throw roleError;

      // Update profile to remove organization
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ organization_id: null, unit_id: null })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      toast.success("Utilisateur retiré avec succès");
      loadData();
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Erreur lors du retrait de l'utilisateur");
    }
  };

  const getUserRole = (userId: string) => {
    const role = userRoles.find(
      r => r.user_id === userId && r.organization_id === currentUserOrgId
    );
    return role?.role || "user";
  };

  const getUnitName = (unitId: string | null) => {
    if (!unitId) return "Aucune";
    const unit = units.find(u => u.id === unitId);
    return unit?.name || "Aucune";
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Gestion des Utilisateurs</h1>
          </div>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Inviter un Utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un Nouvel Utilisateur</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    required
                    maxLength={255}
                  />
                </div>
                <div>
                  <Label htmlFor="fullName">Nom Complet *</Label>
                  <Input
                    id="fullName"
                    value={inviteForm.fullName}
                    onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rôle</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(value: "admin" | "user") =>
                      setInviteForm({ ...inviteForm, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Utilisateur</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="organization">Organisation *</Label>
                  <Select
                    value={inviteForm.organizationId}
                    onValueChange={(value) =>
                      setInviteForm({ ...inviteForm, organizationId: value, unitId: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une organisation" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="unit">Unité Organisationnelle</Label>
                  <Select
                    value={inviteForm.unitId}
                    onValueChange={(value) =>
                      setInviteForm({ ...inviteForm, unitId: value })
                    }
                    disabled={!inviteForm.organizationId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une unité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucune</SelectItem>
                      {units
                        .filter(u => u.organization_id === inviteForm.organizationId)
                        .map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Inviter</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInviteDialog(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    {profile.full_name || "Sans nom"}
                  </TableCell>
                  <TableCell>{getUnitName(profile.unit_id)}</TableCell>
                  <TableCell>
                    <Badge variant={getUserRole(profile.user_id) === "admin" ? "default" : "secondary"}>
                      {getUserRole(profile.user_id) === "admin" ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Administrateur
                        </>
                      ) : (
                        "Utilisateur"
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Select
                        value={getUserRole(profile.user_id)}
                        onValueChange={(value: "admin" | "user") =>
                          handleUpdateRole(profile.user_id, value)
                        }
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Utilisateur</SelectItem>
                          <SelectItem value="admin">Administrateur</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveUser(profile.user_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;