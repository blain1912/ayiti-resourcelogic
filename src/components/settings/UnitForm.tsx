import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const formSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  type: z.enum(["direction_generale", "direction_technique", "service", "section", "departement"]),
  parent_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface UnitFormProps {
  organizationId: string;
  units: any[];
  onSuccess: () => void;
  defaultValues?: Partial<FormData>;
  unitId?: string;
}

const UnitForm = ({ organizationId, units, onSuccess, defaultValues, unitId }: UnitFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      name: "",
      type: "service",
      parent_id: "",
    },
  });

  const unitTypes = {
    direction_generale: language === "fr" ? "Direction Générale" : "General Directorate",
    direction_technique: language === "fr" ? "Direction Technique" : "Technical Directorate",
    service: language === "fr" ? "Service" : "Service",
    section: language === "fr" ? "Section" : "Section",
    departement: language === "fr" ? "Département" : "Department",
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const unitData = {
        name: data.name,
        type: data.type,
        organization_id: organizationId,
        parent_id: data.parent_id || null,
      };

      if (unitId) {
        const { error } = await supabase
          .from("organizational_units")
          .update(unitData)
          .eq("id", unitId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("organizational_units")
          .insert([unitData]);

        if (error) throw error;
      }

      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: unitId 
          ? (language === "fr" ? "Structure mise à jour" : "Unit updated")
          : (language === "fr" ? "Structure créée" : "Unit created"),
      });

      onSuccess();
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {language === "fr" ? "Nom de la structure" : "Unit Name"}
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {language === "fr" ? "Type de structure" : "Unit Type"}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(unitTypes).map(([key, label]) => (
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
          name="parent_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {language === "fr" ? "Structure parente (optionnel)" : "Parent Unit (optional)"}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={language === "fr" ? "Aucune" : "None"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">
                    {language === "fr" ? "Aucune" : "None"}
                  </SelectItem>
                  {units.filter(u => u.id !== unitId).map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading 
            ? (language === "fr" ? "Enregistrement..." : "Saving...") 
            : (language === "fr" ? "Enregistrer" : "Save")}
        </Button>
      </form>
    </Form>
  );
};

export default UnitForm;
