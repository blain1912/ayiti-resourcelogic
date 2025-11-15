import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Network, Plus, Trash2, Edit, ArrowLeft } from "lucide-react";

type UnitType = "direction_generale" | "direction_technique" | "service" | "section" | "departement";

interface OrganizationalUnit {
  id: string;
  name: string;
  type: UnitType;
  parent_id: string | null;
  organization_id: string;
  created_at: string;
}

const AdminUnits = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OrganizationalUnit | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "direction_generale" as UnitType,
    parent_id: null as string | null,
  });

  const unitTypes = {
    direction_generale: "Direction Générale",
    direction_technique: "Direction Technique",
    service: "Service",
    section: "Section",
    departement: "Département",
  };

  useEffect(() => {
    checkAccess();
    loadOrganization();
    loadUnits();
  }, [orgId]);

  const checkAccess = async () => {
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
        .eq("organization_id", orgId)
        .in("role", ["admin", "directeur_general", "directeur_administratif", "directeur_rh"])
        .single();

      if (!roles) {
        toast.error("Accès refusé. Vous devez avoir un rôle de direction ou RH.");
        navigate("/");
      }
    } catch (error) {
      console.error("Error checking access:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .single();

      if (error) throw error;
      setOrgName(data.name);
    } catch (error) {
      console.error("Error loading organization:", error);
    }
  };

  const loadUnits = async () => {
    try {
      const { data, error } = await supabase
        .from("organizational_units")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error("Error loading units:", error);
      toast.error("Erreur lors du chargement des structures");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const unitData = {
        ...formData,
        organization_id: orgId,
        parent_id: formData.parent_id || null,
      };

      if (editingUnit) {
        const { error } = await supabase
          .from("organizational_units")
          .update(unitData)
          .eq("id", editingUnit.id);

        if (error) throw error;
        toast.success("Structure mise à jour avec succès");
      } else {
        const { error } = await supabase
          .from("organizational_units")
          .insert([unitData]);

        if (error) throw error;
        toast.success("Structure créée avec succès");
      }

      setFormData({ name: "", type: "direction_generale", parent_id: null });
      setShowForm(false);
      setEditingUnit(null);
      loadUnits();
    } catch (error) {
      console.error("Error saving unit:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette structure?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("organizational_units")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Structure supprimée avec succès");
      loadUnits();
    } catch (error) {
      console.error("Error deleting unit:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleEdit = (unit: OrganizationalUnit) => {
    setEditingUnit(unit);
    setFormData({ 
      name: unit.name, 
      type: unit.type,
      parent_id: unit.parent_id 
    });
    setShowForm(true);
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return "Aucune";
    const parent = units.find(u => u.id === parentId);
    return parent ? parent.name : "Aucune";
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/organization")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div className="flex items-center gap-3">
              <Network className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Structures Administratives</h1>
                <p className="text-muted-foreground">{orgName}</p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => {
              setShowForm(!showForm);
              setEditingUnit(null);
              setFormData({ name: "", type: "direction_generale", parent_id: null });
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Structure
          </Button>
        </div>

        {showForm && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingUnit ? "Modifier la Structure" : "Nouvelle Structure"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nom de la Structure</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Type de Structure</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: UnitType) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(unitTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="parent">Structure Parente</Label>
                <Select
                  value={formData.parent_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parent_id: value === "none" ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingUnit ? "Mettre à jour" : "Créer"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUnit(null);
                    setFormData({ name: "", type: "direction_generale", parent_id: null });
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="grid gap-4">
          {units.map((unit) => (
            <Card key={unit.id} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{unit.name}</h3>
                  <p className="text-muted-foreground">
                    {unitTypes[unit.type]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Structure parente: {getParentName(unit.parent_id)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(unit)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(unit.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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

export default AdminUnits;