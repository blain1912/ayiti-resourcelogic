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
      console.log("⚙️ Settings: Checking user and organization...");
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("❌ Settings: Error getting user", userError);
        throw userError;
      }
      
      if (!user) {
        console.log("❌ Settings: No user, redirecting to auth");
        navigate("/auth");
        return;
      }

      console.log("✅ Settings: User found:", user.id);

      // Get user profile and organization
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("❌ Settings: Error getting profile", profileError);
        throw profileError;
      }

      console.log("✅ Settings: Profile found, org_id:", profile?.organization_id);

      if (!profile?.organization_id) {
        console.log("❌ Settings: No organization, redirecting to setup");
        navigate("/organization-setup");
        return;
      }

      // Check if user has admin role
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", profile.organization_id)
        .maybeSingle();

      if (roleError) {
        console.error("❌ Settings: Error getting role", roleError);
        throw roleError;
      }

      console.log("✅ Settings: User role:", userRole?.role);

      const adminRoles = ['admin', 'directeur_general', 'directeur_administratif', 'directeur_rh'];
      const hasAdminRole = adminRoles.includes(userRole?.role || '');
      console.log("✅ Settings: Is admin?", hasAdminRole);
      setIsAdmin(hasAdminRole);

      // Get organization details
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();

      if (orgError) {
        console.error("❌ Settings: Error getting organization", orgError);
        throw orgError;
      }

      console.log("✅ Settings: Organization loaded:", org?.name);
      setOrganization(org);
    } catch (error: any) {
      console.error("❌ Settings: Fatal error", error);
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
            <Button onClick={() => navigate("/dashboard")} className="w-full">
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
