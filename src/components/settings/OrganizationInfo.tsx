import { useState } from "react";
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

const formSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  type: z.enum(["ministere", "direction_generale", "organisme_autonome", "organisme_deconcentre"]),
});

type FormData = z.infer<typeof formSchema>;

interface OrganizationInfoProps {
  organization: any;
  onUpdate: () => void;
}

const OrganizationInfo = ({ organization, onUpdate }: OrganizationInfoProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization?.name || "",
      type: organization?.type || "ministere",
    },
  });

  const organizationTypes = {
    ministere: language === "fr" ? "Ministère" : "Ministry",
    direction_generale: language === "fr" ? "Direction Générale" : "General Directorate",
    organisme_autonome: language === "fr" ? "Organisme Autonome" : "Autonomous Organization",
    organisme_deconcentre: language === "fr" ? "Organisme Déconcentré" : "Decentralized Organization",
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: data.name, type: data.type })
        .eq("id", organization.id);

      if (error) throw error;

      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: language === "fr" ? "Organisation mise à jour" : "Organization updated",
      });

      onUpdate();
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
    <Card>
      <CardHeader>
        <CardTitle>{language === "fr" ? "Informations de l'organisation" : "Organization Information"}</CardTitle>
        <CardDescription>
          {language === "fr" 
            ? "Modifiez les informations de base de votre organisation" 
            : "Modify your organization's basic information"}
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(organizationTypes).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading}>
              {loading 
                ? (language === "fr" ? "Mise à jour..." : "Updating...") 
                : (language === "fr" ? "Mettre à jour" : "Update")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default OrganizationInfo;
