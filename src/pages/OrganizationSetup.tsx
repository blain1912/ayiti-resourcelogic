import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { INSTITUTION_TYPES, INSTITUTION_TYPE_VALUES } from "@/lib/institutionTypes";

const formSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  type: z.enum(INSTITUTION_TYPE_VALUES),
});

type FormData = z.infer<typeof formSchema>;

const OrganizationSetup = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "ministere",
    },
  });

  const groupLabels: Record<string, string> = {
    public: language === "fr" ? "Administration publique" : "Public administration",
    diplomatique:
      language === "fr" ? "Missions diplomatiques et consulaires" : "Diplomatic & consular missions",
    autre: language === "fr" ? "Autre" : "Other",
  };


  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          variant: "destructive",
          title: language === "fr" ? "Erreur" : "Error",
          description: language === "fr" ? "Vous devez être connecté" : "You must be logged in",
        });
        return;
      }

      // Create organization
      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .insert([{ name: data.name, type: data.type }])
        .select()
        .single();

      if (orgError) throw orgError;

      // Create admin role for user
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{ user_id: user.id, role: "admin", organization_id: organization.id }]);

      if (roleError) throw roleError;

      // Update user profile with organization
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ organization_id: organization.id })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: language === "fr" 
          ? "Votre organisation a été créée et est en attente d'approbation par l'administrateur système" 
          : "Your organization has been created and is pending approval by the system administrator",
      });

      // Redirect to waiting page or home
      navigate("/");
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">
            {language === "fr" ? "Configuration de votre organisation" : "Organization Setup"}
          </CardTitle>
          <CardDescription>
            {language === "fr" 
              ? "Définissez le type et le nom de votre entité administrative" 
              : "Define the type and name of your administrative entity"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === "fr" ? "Type d'organisation" : "Organization Type"}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(["public", "diplomatique", "autre"] as const).map((group) => (
                          <div key={group}>
                            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {groupLabels[group]}
                            </p>
                            {INSTITUTION_TYPES.filter((t) => t.group === group).map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {language === "fr" ? t.fr : t.en}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>

                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === "fr" ? "Nom de l'organisation" : "Organization Name"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={language === "fr" 
                          ? "Ex: Ministère de l'Éducation Nationale" 
                          : "Ex: Ministry of National Education"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading 
                  ? (language === "fr" ? "Création..." : "Creating...") 
                  : (language === "fr" ? "Créer l'organisation" : "Create Organization")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationSetup;
