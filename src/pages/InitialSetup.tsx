import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";

const InitialSetup = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Vérifier si l'utilisateur existe
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("email", email)
        .single();

      if (!profile) {
        throw new Error("Aucun utilisateur trouvé avec cet email");
      }

      // Vérifier si un super admin existe déjà
      const { data: existingSuperAdmin } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role", "admin")
        .maybeSingle();

      if (existingSuperAdmin) {
        throw new Error("Un super administrateur existe déjà");
      }

      // Créer le rôle de super admin (sans organization_id)
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{
          user_id: profile.user_id,
          role: "admin",
          organization_id: "00000000-0000-0000-0000-000000000000" // UUID spécial pour super admin
        }]);

      if (roleError) throw roleError;

      toast({
        title: "Succès",
        description: `${profile.full_name} est maintenant super administrateur`,
      });

      navigate("/super-admin");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configuration Initiale</CardTitle>
          <CardDescription>
            Créez le premier super administrateur de l'application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSuperAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email de l'utilisateur</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                L'utilisateur doit déjà avoir un compte dans l'application
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                "Créer le Super Admin"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm mb-2">À propos du Super Admin</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Accès à toutes les organisations</li>
              <li>• Gestion des abonnements</li>
              <li>• Création d'autres administrateurs</li>
              <li>• Accès aux statistiques globales</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialSetup;
