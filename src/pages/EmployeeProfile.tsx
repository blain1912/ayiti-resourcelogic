import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function EmployeeProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [positions, setPositions] = useState<Array<{ id: string; name: string; salary: number }>>([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setProfile(profileData);

      if (profileData?.organization_id) {
        await Promise.all([
          fetchUnits(profileData.organization_id),
          fetchPositions(profileData.organization_id)
        ]);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async (orgId: string) => {
    const { data } = await supabase
      .from("organizational_units")
      .select("id, name")
      .eq("organization_id", orgId)
      .order("name");
    setUnits(data || []);
  };

  const fetchPositions = async (orgId: string) => {
    const { data } = await supabase
      .from("positions")
      .select("id, name, salary")
      .eq("organization_id", orgId)
      .order("name");
    setPositions(data || []);
  };

  const handleSubmit = async (formData: any) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...formData,
          full_name: `${formData.prenom} ${formData.nom}`,
          profile_completed: true,
        })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Votre fiche a été enregistrée avec succès",
      });

      setShowForm(false);
      fetchProfile();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  const getStatusAlert = () => {
    if (profile?.approval_status === "pending") {
      return (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Inscription en attente</AlertTitle>
          <AlertDescription>
            Votre inscription est en attente d'approbation par le service des ressources humaines.
          </AlertDescription>
        </Alert>
      );
    }

    if (profile?.approval_status === "rejected") {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Inscription refusée</AlertTitle>
          <AlertDescription>
            Votre inscription a été refusée. Veuillez contacter le service RH pour plus d'informations.
          </AlertDescription>
        </Alert>
      );
    }

    if (profile?.approval_status === "approved" && !profile?.profile_completed) {
      return (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Inscription approuvée</AlertTitle>
          <AlertDescription>
            Votre inscription a été approuvée. Vous pouvez maintenant compléter votre fiche d'employé.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">
            Gérez vos informations personnelles et professionnelles
          </p>
        </div>

        {getStatusAlert()}

        {profile?.approval_status === "approved" && !profile?.profile_completed && !showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Complétez votre fiche d'employé</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Votre inscription a été approuvée. Veuillez compléter votre fiche d'employé avec toutes vos informations.
              </p>
              <Button onClick={() => setShowForm(true)}>
                Remplir ma fiche
              </Button>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Fiche d'employé</CardTitle>
            </CardHeader>
            <CardContent>
              <EmployeeForm
                onSubmit={handleSubmit}
                units={units}
                positions={positions}
                defaultValues={profile}
              />
            </CardContent>
          </Card>
        )}

        {profile?.profile_completed && (
          <Card>
            <CardHeader>
              <CardTitle>Informations complètes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Profil complet</AlertTitle>
                  <AlertDescription>
                    Votre fiche d'employé est complète et à jour.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nom complet</p>
                    <p className="text-lg">{profile.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Code budgétaire</p>
                    <p className="text-lg">{profile.code_budgetaire || "Non renseigné"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-lg">{profile.email || "Non renseigné"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                    <p className="text-lg">{profile.tel_1 || "Non renseigné"}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setShowForm(true)}>
                  Modifier mes informations
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
