import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { Session } from "@supabase/supabase-js";

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").max(100),
  userType: z.enum(["responsable", "employe"]),
});

const signInSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(1, "Le mot de passe est requis"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const [signUpData, setSignUpData] = useState({
    fullName: "",
    email: "",
    password: "",
    userType: "responsable" as "responsable" | "employe",
    organizationId: "",
  });

  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [detectedOrganization, setDetectedOrganization] = useState<{ 
    id: string; 
    name: string; 
    logo_url?: string | null;
    primary_color?: string | null;
    secondary_color?: string | null;
  } | null>(null);

  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    // Detect organization from custom domain
    const detectOrganization = async () => {
      let currentDomain = window.location.hostname;
      
      // Remove www. prefix if present
      currentDomain = currentDomain.replace(/^www\./, '');
      
      console.log("Auth: Current hostname:", window.location.hostname);
      console.log("Auth: Cleaned domain:", currentDomain);
      
      // Skip detection for localhost and lovable preview domains
      const isPreviewDomain = currentDomain.includes('lovable.app') || 
                              currentDomain.includes('localhost') ||
                              currentDomain.includes('127.0.0.1');
      
      if (!isPreviewDomain) {
        console.log("Auth: Attempting to detect organization for custom domain:", currentDomain);
        
        // Check if this domain corresponds to an organization
        const { data: orgByDomain, error } = await supabase
          .from("organizations")
          .select("id, name, logo_url, primary_color, secondary_color")
          .eq("custom_domain", currentDomain)
          .eq("approval_status", "approved")
          .maybeSingle();
        
        console.log("Auth: Query result:", { orgByDomain, error });
        
        if (error) {
          console.error("Auth: Error detecting organization:", error);
        }
        
        if (orgByDomain) {
          console.log("Auth: Organization detected:", orgByDomain);
          setDetectedOrganization(orgByDomain);
          setSignUpData(prev => ({ 
            ...prev, 
            organizationId: orgByDomain.id,
            userType: "employe"
          }));
          return;
        } else {
          console.log("Auth: No organization found for domain:", currentDomain);
        }
      }
      
      console.log("Auth: Loading all approved organizations for dropdown");
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("approval_status", "approved")
        .order("name");
      
      if (data) {
        setOrganizations(data);
      }
    };

    detectOrganization();

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        // Redirect to dashboard if authenticated
        if (session) {
          setTimeout(async () => {
            // Check if super admin first
            const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { _user_id: session.user.id });
            
            if (isSuperAdmin) {
              navigate("/super-admin");
              return;
            }
            
            // Check if user has an organization
            const { data: profile } = await supabase
              .from("profiles")
              .select("organization_id, profile_completed")
              .eq("user_id", session.user.id)
              .maybeSingle();
            
            const userType = session.user.user_metadata?.user_type;
            
            if (!profile?.organization_id) {
              if (userType === "employe") {
                navigate("/employee-waiting");
              } else {
                navigate("/onboarding");
              }
            } else if (userType === "employe" && !profile.profile_completed) {
              navigate("/employee-profile");
            } else {
              navigate("/dashboard");
            }
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        // Check if super admin first
        const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { _user_id: session.user.id });
        
        if (isSuperAdmin) {
          navigate("/super-admin");
          return;
        }
        
        // Check if user has an organization
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id, profile_completed")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        const userType = session.user.user_metadata?.user_type;
        
        if (!profile?.organization_id) {
          if (userType === "employe") {
            navigate("/employee-waiting");
          } else {
            navigate("/onboarding");
          }
        } else if (userType === "employe" && !profile.profile_completed) {
          navigate("/employee-profile");
        } else {
          navigate("/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = signUpSchema.parse(signUpData);
      
      // Validate organization selection for employees
      if (validatedData.userType === "employe" && !signUpData.organizationId) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner une organisation",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: validatedData.fullName,
            user_type: validatedData.userType,
            organization_id: validatedData.userType === "employe" ? signUpData.organizationId : null,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Erreur",
            description: "Cet email est déjà utilisé. Veuillez vous connecter.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur d'inscription",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Inscription réussie !",
          description: "Vous êtes maintenant connecté.",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erreur de validation",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = signInSchema.parse(signInData);
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        toast({
          title: "Erreur de connexion",
          description: "Email ou mot de passe incorrect.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connexion réussie !",
          description: "Bienvenue.",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erreur de validation",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!signInData.email) {
      toast({
        variant: "destructive",
        title: "Email requis",
        description: "Veuillez entrer votre email pour réinitialiser le mot de passe",
      });
      return;
    }

    try {
      setResetLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(signInData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: error.message,
        });
        return;
      }

      toast({
        title: "Email envoyé",
        description: "Vérifiez votre boîte de réception pour réinitialiser votre mot de passe",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur s'est produite lors de l'envoi de l'email",
      });
    } finally {
      setResetLoading(false);
    }
  };

  // Don't render the form if user is already authenticated
  if (session) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          {detectedOrganization?.logo_url && (
            <img 
              src={detectedOrganization.logo_url} 
              alt={detectedOrganization.name}
              className="h-20 w-auto mx-auto mb-2 object-contain"
            />
          )}
          <CardTitle className="text-3xl font-bold text-center">
            {detectedOrganization ? detectedOrganization.name : "Bienvenue"}
          </CardTitle>
          <CardDescription className="text-center">
            {detectedOrganization 
              ? "Connectez-vous ou inscrivez-vous" 
              : "Connectez-vous ou créez un compte"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Mot de passe</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
                <Button 
                  type="button" 
                  variant="link" 
                  className="w-full text-sm" 
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? "Envoi..." : "Mot de passe oublié ?"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                {detectedOrganization && (
                  <div 
                    className="rounded-lg border p-3 mb-4 text-center"
                    style={{ 
                      backgroundColor: detectedOrganization.primary_color ? `${detectedOrganization.primary_color}15` : undefined,
                      borderColor: detectedOrganization.primary_color || undefined
                    }}
                  >
                    <p className="text-xs text-muted-foreground">
                      Vous vous inscrivez comme employé de cette organisation
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nom complet</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Jean Dupont"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    required
                  />
                </div>
                {!detectedOrganization && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-type">Type d'utilisateur</Label>
                    <Select
                      value={signUpData.userType}
                      onValueChange={(value: "responsable" | "employe") => 
                        setSignUpData({ 
                          ...signUpData, 
                          userType: value,
                          organizationId: ""
                        })
                      }
                    >
                      <SelectTrigger id="signup-type">
                        <SelectValue placeholder="Sélectionnez votre type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="responsable">Responsable d'organisation</SelectItem>
                        <SelectItem value="employe">Employé</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {signUpData.userType === "responsable" 
                        ? "Vous pourrez créer et gérer votre organisation" 
                        : "Rejoignez une organisation existante"}
                    </p>
                  </div>
                )}
                {!detectedOrganization && signUpData.userType === "employe" && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-organization">Organisation *</Label>
                    <Select
                      value={signUpData.organizationId}
                      onValueChange={(value) => 
                        setSignUpData({ ...signUpData, organizationId: value })
                      }
                    >
                      <SelectTrigger id="signup-organization">
                        <SelectValue placeholder="Sélectionnez votre organisation" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Votre demande sera soumise à l'approbation de l'administrateur
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Inscription..." : "S'inscrire"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
