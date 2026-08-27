import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { STRUCTURE_TYPES, STRUCTURE_TYPE_VALUES } from "@/lib/institutionTypes";

const formSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  type: z.enum(STRUCTURE_TYPE_VALUES),
  parent_id: z.string().nullable().optional(),
  code: z.string().max(30).optional(),
  description: z.string().max(2000).optional(),
  manager_profile_id: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  display_order: z.coerce.number().int().min(0).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface UnitFormProps {
  organizationId: string;
  units: any[];
  onSuccess: () => void;
  defaultValues?: Partial<FormData>;
  unitId?: string;
  /** Liste optionnelle des agents pour désigner un responsable */
  profiles?: { id: string; full_name: string | null }[];
}

const UnitForm = ({ organizationId, units, onSuccess, defaultValues, unitId, profiles = [] }: UnitFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "service",
      parent_id: null,
      code: "",
      description: "",
      manager_profile_id: null,
      is_active: true,
      display_order: 0,
      ...(defaultValues || {}),
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const unitData: any = {
        name: data.name,
        type: data.type,
        organization_id: organizationId,
        parent_id: data.parent_id || null,
        code: data.code?.trim() || null,
        description: data.description?.trim() || null,
        manager_profile_id: data.manager_profile_id || null,
        is_active: data.is_active ?? true,
        display_order: data.display_order ?? 0,
      };

      if (unitId) {
        const { error } = await supabase
          .from("organizational_units")
          .update(unitData)
          .eq("id", unitId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("organizational_units").insert([unitData]);
        if (error) throw error;
      }

      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: unitId
          ? language === "fr" ? "Structure mise à jour" : "Unit updated"
          : language === "fr" ? "Structure créée" : "Unit created",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === "fr" ? "Nom de la structure" : "Unit Name"}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{language === "fr" ? "Code (optionnel)" : "Code (optional)"}</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: SC-01" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="display_order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{language === "fr" ? "Ordre d'affichage" : "Display order"}</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} value={field.value ?? 0} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === "fr" ? "Type de structure" : "Unit Type"}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STRUCTURE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {language === "fr" ? t.fr : t.en}
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
              <Select
                onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={language === "fr" ? "Aucune" : "None"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">{language === "fr" ? "Aucune" : "None"}</SelectItem>
                  {units.filter((u) => u.id !== unitId).map((unit) => (
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

        {profiles.length > 0 && (
          <FormField
            control={form.control}
            name="manager_profile_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{language === "fr" ? "Responsable (optionnel)" : "Manager (optional)"}</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                  value={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "fr" ? "Non désigné" : "Not assigned"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">{language === "fr" ? "Non désigné" : "Not assigned"}</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name || "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{language === "fr" ? "Description (optionnel)" : "Description (optional)"}</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <FormLabel className="mb-0">{language === "fr" ? "Structure active" : "Active unit"}</FormLabel>
              <FormControl>
                <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? language === "fr" ? "Enregistrement..." : "Saving..."
            : language === "fr" ? "Enregistrer" : "Save"}
        </Button>
      </form>
    </Form>
  );
};

export default UnitForm;
