import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import OrganizationInfo from "@/components/settings/OrganizationInfo";
import OrganizationalUnits from "@/components/settings/OrganizationalUnits";
import { SubscriptionInfo } from "@/components/settings/SubscriptionInfo";
import { CustomizationSettings } from "@/components/settings/CustomizationSettings";
import SalaryScale from "@/components/settings/SalaryScale";
import { ProfessorGrades } from "@/components/settings/ProfessorGrades";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();

  useEffect(() => {
    checkUserAndOrganization();
  }, []);

  const checkUserAndOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get user profile and organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.organization_id) {
        navigate("/organization-setup");
        return;
      }

      // Check if user has admin role
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", profile.organization_id)
        .single();

      const adminRoles = ['admin', 'directeur_general', 'directeur_administratif', 'directeur_rh'];
      setIsAdmin(adminRoles.includes(userRole?.role || ''));

      // Get organization details
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();

      setOrganization(org);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const refetchOrganization = async () => {
    if (!organization) return;
    
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organization.id)
      .single();
    
    if (org) setOrganization(org);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>{language === "fr" ? "Chargement..." : "Loading..."}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{language === "fr" ? "Accès refusé" : "Access Denied"}</CardTitle>
            <CardDescription>
              {language === "fr" 
                ? "Vous devez être administrateur pour accéder à cette page" 
                : "You must be an administrator to access this page"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              {language === "fr" ? "Retour au tableau de bord" : "Back to Dashboard"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {language === "fr" ? "Paramètres" : "Settings"}
          </h1>
          <p className="text-muted-foreground">
            {language === "fr" 
              ? "Gérez votre organisation et sa structure administrative" 
              : "Manage your organization and administrative structure"}
          </p>
        </div>

        <Tabs defaultValue="organization" className="w-full">
          <TabsList>
            <TabsTrigger value="organization">
              {language === "fr" ? "Organisation" : "Organization"}
            </TabsTrigger>
            <TabsTrigger value="units">
              {language === "fr" ? "Structures Administratives" : "Administrative Units"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organization" className="space-y-6">
            <OrganizationInfo organization={organization} onUpdate={refetchOrganization} />
            <CustomizationSettings organization={organization} onUpdate={refetchOrganization} />
            <SalaryScale />
            <ProfessorGrades />
            <SubscriptionInfo organization={organization} onUpdate={refetchOrganization} />
          </TabsContent>

          <TabsContent value="units">
            <OrganizationalUnits organizationId={organization?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
