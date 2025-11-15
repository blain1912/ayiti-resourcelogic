import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EmployeeWaiting = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    checkUserStatus();
    
    // Set up a subscription to check for profile updates
    const channel = supabase
      .channel("profile-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          // Check if the updated profile has an organization_id
          if (payload.new.organization_id) {
            checkUserStatus();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkUserStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserName(user.user_metadata?.full_name || user.email || "");

      // Check if user has been added to an organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.organization_id) {
        toast({
          title: "Compte activé",
          description: "Vous avez été ajouté à une organisation. Redirection...",
        });
        setTimeout(() => {
          navigate("/");
        }, 1500);
      }
    } catch (error) {
      console.error("Error checking user status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background px-4 py-12">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-secondary p-4">
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Compte en attente</CardTitle>
          <CardDescription>
            Bienvenue {userName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Inscription réussie</p>
                <p className="text-sm text-muted-foreground">
                  Votre compte a été créé avec succès
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">En attente d'activation</p>
                <p className="text-sm text-muted-foreground">
                  Un administrateur doit vous ajouter à une organisation pour que vous puissiez accéder au système. 
                  Vous recevrez une notification dès que votre compte sera activé.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Contactez votre administrateur pour accélérer le processus
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeWaiting;
