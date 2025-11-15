import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Shield, CheckCircle } from "lucide-react";
import { z } from "zod";

type OrganizationType = "ministere" | "direction_generale" | "organisme_autonome" | "organisme_deconcentre";
type AppRole = "directeur_general" | "directeur_administratif" | "directeur_rh" | "employe";

const nameSchema = z.string().trim().min(1, "Le nom est requis").max(200, "Le nom doit faire moins de 200 caractères");

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    organizationName: "",
    organizationType: "ministere" as OrganizationType,
    role: "directeur_rh" as AppRole,
  });

  const organizationTypes = {
    ministere: "Ministère",
    direction_generale: "Direction Générale",
    organisme_autonome: "Organisme Autonome",
    organisme_deconcentre: "Organisme Déconcentré",
  };

  const roleLabels = {
    directeur_general: "Directeur Général",
    directeur_administratif: "Directeur Administratif",
    directeur_rh: "Directeur / Responsable RH",
    employe: "Employé",
  };

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      // Check if user already has an organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.organization_id) {
        // User already has an organization, redirect to dashboard
        navigate("/");
      }
    } catch (error) {
      console.error("Error checking user status:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate organization name
      nameSchema.parse(formData.organizationName);

      // Step 1: Create organization
      const newOrgId = crypto.randomUUID();
      const { error: orgError } = await supabase
        .from("organizations")
        .insert({
          id: newOrgId,
          name: formData.organizationName.trim(),
          type: formData.organizationType,
        });

      if (orgError) throw orgError;

      // Step 2: Update user profile with organization
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ organization_id: newOrgId })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Step 3: Assign role to user
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: formData.role,
          organization_id: newOrgId,
        });

      if (roleError) throw roleError;

      setStep(3);
      toast.success("Configuration terminée avec succès!");

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      console.error("Error during onboarding:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erreur lors de la configuration");
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Configuration Terminée!</CardTitle>
            <CardDescription>
              Votre organisation a été créée avec succès. Vous allez être redirigé vers le tableau de bord.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">Bienvenue!</CardTitle>
          </div>
          <CardDescription>
            Configurons votre organisation pour commencer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="organizationName">Nom de votre Organisation *</Label>
                  <Input
                    id="organizationName"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    placeholder="Ex: Ministère de la Santé"
                    required
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label htmlFor="organizationType">Type d'Organisation *</Label>
                  <Select
                    value={formData.organizationType}
                    onValueChange={(value: OrganizationType) =>
                      setFormData({ ...formData, organizationType: value })
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
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full"
                  disabled={!formData.organizationName.trim()}
                >
                  Continuer
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Organisation</h3>
                  <p className="text-sm text-muted-foreground">
                    {formData.organizationName} - {organizationTypes[formData.organizationType]}
                  </p>
                </div>

                <div>
                  <Label htmlFor="role" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Votre Rôle dans l'Organisation *
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: AppRole) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    Le Directeur/Responsable RH a accès à la gestion des employés et des congés
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? "Configuration..." : "Terminer"}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;