import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Shield, TrendingUp, Briefcase, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      // Check if we're on a custom domain first
      let currentDomain = window.location.hostname;
      currentDomain = currentDomain.replace(/^www\./, '');
      
      const isPreviewDomain = currentDomain.includes('lovable.app') || 
                              currentDomain.includes('lovableproject.com') ||
                              currentDomain.includes('localhost') ||
                              currentDomain.includes('127.0.0.1');
      
      // If on custom domain and not authenticated, redirect to auth page
      if (!isPreviewDomain) {
        const { data: orgByDomain } = await supabase
          .from("organizations")
          .select("id")
          .eq("custom_domain", currentDomain)
          .eq("approval_status", "approved")
          .maybeSingle();
        
        if (orgByDomain) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            // Not authenticated on custom domain, redirect to auth
            navigate("/auth");
            return;
          }
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if super admin
        const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { _user_id: user.id });
        
        if (isSuperAdmin) {
          navigate("/super-admin");
          return;
        }
        
        // Check if has organization
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id, approval_status")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (profile?.organization_id && profile.approval_status === "approved") {
          navigate("/dashboard");
          return;
        }
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Système de Gestion des Ressources Humaines
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Gérez efficacement les ressources humaines de votre administration avec une solution moderne et intuitive
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8">
                Se connecter
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Créer un compte
              </Button>
            </Link>
            <Link to="/careers">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                <Briefcase className="h-5 w-5 mr-2" />
                Offres d'emploi
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Gestion des Employés</CardTitle>
              <CardDescription>
                Gérez tous vos employés, leurs profils et informations personnelles en un seul endroit
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Suivi de Présence</CardTitle>
              <CardDescription>
                Suivez les présences quotidiennes avec un système QR code moderne et des rapports détaillés
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Building2 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Structure Organisationnelle</CardTitle>
              <CardDescription>
                Gérez votre hiérarchie avec des directions, services et départements personnalisables
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Sécurité & Rôles</CardTitle>
              <CardDescription>
                Contrôlez les accès avec un système de rôles complet et sécurisé pour votre organisation
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <Card className="max-w-3xl mx-auto bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h2 className="text-3xl font-bold mb-4">Prêt à commencer ?</h2>
              <p className="text-muted-foreground mb-6">
                Rejoignez les organisations qui font confiance à notre système de GRH
              </p>
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8">
                  Créer votre compte maintenant
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground">© 2025 Système de GRH. Tous droits réservés.</p>
            <Link to="/user-manual" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
              <BookOpen className="h-4 w-4" />
              Manuel d'utilisation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
