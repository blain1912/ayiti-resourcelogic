import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isDiplomaticInstitution, institutionTypeLabel } from "@/lib/institutionTypes";
import { getOrganizationCapabilities } from "@/lib/organizationCapabilities";

/**
 * Informations complémentaires de l'organisation (Phase 3).
 * Tous les champs sont facultatifs : l'assistant initial reste simple,
 * les détails se complètent ici, dans Administration → Organisation.
 */
interface Props {
  organization: any;
  onUpdate: () => void;
}

const GENERAL_FIELDS: { key: string; label: string; placeholder?: string; type?: string }[] = [
  { key: "acronym", label: "Sigle", placeholder: "Ex : MENFP" },
  { key: "country", label: "Pays" },
  { key: "city", label: "Ville" },
  { key: "address", label: "Adresse" },
  { key: "phone", label: "Téléphone", type: "tel" },
  { key: "institutional_email", label: "E-mail institutionnel", type: "email" },
  { key: "website", label: "Site web", placeholder: "https://" },
  { key: "head_name", label: "Responsable principal" },
  { key: "head_title", label: "Titre du responsable", placeholder: "Ex : Directeur général" },
];

const DIPLOMATIC_FIELDS: { key: string; label: string; placeholder?: string }[] = [
  { key: "represented_country", label: "Pays représenté", placeholder: "Ex : Haïti" },
  { key: "host_country", label: "Pays d'implantation", placeholder: "Ex : République dominicaine" },
  { key: "host_city", label: "Ville d'implantation", placeholder: "Ex : Santiago" },
  {
    key: "representation_type",
    label: "Type de représentation",
    placeholder: "Ex : Consulat général",
  },
];

const OrganizationDetails = ({ organization, onUpdate }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!organization) return;
    const next: Record<string, string> = {};
    [...GENERAL_FIELDS, ...DIPLOMATIC_FIELDS].forEach((f) => {
      next[f.key] = organization[f.key] ?? "";
    });
    next.notes = organization.notes ?? "";
    setValues(next);
  }, [organization]);

  const diplomatic = isDiplomaticInstitution(organization?.type);

  const handleSave = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const payload: Record<string, string | null> = {};
      Object.entries(values).forEach(([k, v]) => {
        payload[k] = v.trim() === "" ? null : v.trim();
      });
      const { error } = await supabase
        .from("organizations")
        .update(payload as any)
        .eq("id", organization.id);
      if (error) throw error;
      toast({ title: "Informations enregistrées" });
      onUpdate();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (!organization) return null;

  const fields = diplomatic ? [...GENERAL_FIELDS, ...DIPLOMATIC_FIELDS] : GENERAL_FIELDS;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations détaillées</CardTitle>
        <CardDescription>
          Complétez à votre rythme les coordonnées de votre {institutionTypeLabel(organization.type).toLowerCase()}.
          Aucun de ces champs n'est obligatoire.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`org-${f.key}`}>{f.label}</Label>
              <Input
                id={`org-${f.key}`}
                type={(f as any).type || "text"}
                placeholder={f.placeholder}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org-notes">Observations</Label>
          <Textarea
            id="org-notes"
            rows={3}
            value={values.notes ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          />
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default OrganizationDetails;
