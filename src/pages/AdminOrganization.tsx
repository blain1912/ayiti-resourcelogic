import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Edit, Globe, Download, Upload } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { OnboardingKitButton } from "@/components/OnboardingKitButton";

type OrganizationType = "ministere" | "direction_generale" | "organisme_autonome" | "organisme_deconcentre";

interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  custom_domain: string | null;
  created_at: string;
}

const AdminOrganization = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "ministere" as OrganizationType,
    custom_domain: "",
  });

  const organizationTypes = {
    ministere: "Ministère",
    direction_generale: "Direction Générale",
    organisme_autonome: "Organisme Autonome",
    organisme_deconcentre: "Organisme Déconcentré",
  };

  useEffect(() => {
    checkAdminStatus();
    loadOrganizations();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "directeur_general", "directeur_administratif", "directeur_rh"])
        .single();

      setIsAdmin(!!roles);
      if (!roles) {
        toast.error("Accès refusé. Vous devez avoir un rôle de direction ou RH.");
        navigate("/");
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error("Error loading organizations:", error);
      toast.error("Erreur lors du chargement des organisations");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingOrg) {
        const { error } = await supabase
          .from("organizations")
          .update(formData)
          .eq("id", editingOrg.id);

        if (error) throw error;
        toast.success("Organisation mise à jour avec succès");
      } else {
        const { error } = await supabase
          .from("organizations")
          .insert([formData]);

        if (error) throw error;
        toast.success("Organisation créée avec succès");
      }

      setFormData({ name: "", type: "ministere", custom_domain: "" });
      setShowForm(false);
      setEditingOrg(null);
      loadOrganizations();
    } catch (error) {
      console.error("Error saving organization:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette organisation?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Organisation supprimée avec succès");
      loadOrganizations();
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({ name: org.name, type: org.type, custom_domain: org.custom_domain || "" });
    setShowForm(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Gestion des Organisations</h1>
          </div>
          <Button
            onClick={() => {
              setShowForm(!showForm);
              setEditingOrg(null);
              setFormData({ name: "", type: "ministere", custom_domain: "" });
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Organisation
          </Button>
        </div>

        {showForm && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingOrg ? "Modifier l'Organisation" : "Nouvelle Organisation"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nom de l'Organisation</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Type d'Organisation</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: OrganizationType) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(organizationTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
              </div>
              <div>
                <Label htmlFor="custom_domain">Domaine Personnalisé</Label>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="custom_domain"
                    value={formData.custom_domain}
                    onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
                    placeholder="exemple.com ou sous-domaine.exemple.com"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Les employés pourront s'inscrire via ce domaine personnalisé
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingOrg ? "Mettre à jour" : "Créer"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingOrg(null);
                    setFormData({ name: "", type: "ministere", custom_domain: "" });
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="grid gap-4">
          {organizations.map((org) => (
            <Card key={org.id} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{org.name}</h3>
                  <p className="text-muted-foreground">
                    {organizationTypes[org.type]}
                  </p>
                  {org.custom_domain && (
                    <p className="text-sm text-primary flex items-center gap-1 mt-1">
                      <Globe className="h-3 w-3" />
                      {org.custom_domain}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(org)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(org.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <OnboardingKitButton organization={org} size="sm" label="Kit" />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/onboarding-import?org=${org.id}`)}
                  >
                    <Upload className="h-4 w-4 mr-1" /> Importer
                  </Button>
                  <Button
                    onClick={() => navigate(`/admin/organization/${org.id}/units`)}
                  >
                    Gérer les Structures
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminOrganization;