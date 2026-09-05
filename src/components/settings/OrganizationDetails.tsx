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

const NONE = "__none__";

const OrganizationDetails = ({ organization, onUpdate }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [headProfileId, setHeadProfileId] = useState<string>(NONE);
  const [parentOrgId, setParentOrgId] = useState<string>(NONE);
  const [agents, setAgents] = useState<Array<{ id: string; full_name: string | null; fonction_responsabilite?: string | null }>>([]);
  const [representations, setRepresentations] = useState<
    Array<{ id: string; name: string; type: string; host_city: string | null; host_country: string | null }>
  >([]);

  const capabilities = useMemo(
    () => getOrganizationCapabilities(organization?.type, organization?.form_capabilities),
    [organization?.type, organization?.form_capabilities],
  );

  useEffect(() => {
    if (!organization) return;
    const next: Record<string, string> = {};
    [...GENERAL_FIELDS, ...DIPLOMATIC_FIELDS].forEach((f) => {
      next[f.key] = organization[f.key] ?? "";
    });
    next.notes = organization.notes ?? "";
    setValues(next);
    setHeadProfileId(organization.head_profile_id ?? NONE);
    setParentOrgId(organization.parent_organization_id ?? NONE);
  }, [organization]);

  // Agents de l'organisation (responsable de la représentation)
  useEffect(() => {
    if (!organization?.id || !capabilities.supports_head_of_post) return;
    supabase
      .from("profiles")
      .select("id, full_name, fonction_responsabilite")
      .eq("organization_id", organization.id)
      .order("full_name")
      .then(({ data }) => setAgents((data as any) || []));
  }, [organization?.id, capabilities.supports_head_of_post]);

  // Représentations rattachables (identité publique uniquement)
  useEffect(() => {
    if (!organization?.id || !capabilities.supports_parent_organization) return;
    (supabase as any)
      .rpc("list_attachable_representations", { _organization_id: organization.id })
      .then(({ data }: any) => setRepresentations(data || []));
  }, [organization?.id, capabilities.supports_parent_organization]);

  const diplomatic = isDiplomaticInstitution(organization?.type);

  const handleSave = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const payload: Record<string, string | null> = {};
      Object.entries(values).forEach(([k, v]) => {
        payload[k] = v.trim() === "" ? null : v.trim();
      });
      if (capabilities.supports_head_of_post) {
        payload.head_profile_id = headProfileId === NONE ? null : headProfileId;
      }
      if (capabilities.supports_parent_organization) {
        payload.parent_organization_id = parentOrgId === NONE ? null : parentOrgId;
      }
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

        {(capabilities.supports_head_of_post || capabilities.supports_parent_organization) && (
          <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
            {capabilities.supports_head_of_post && (
              <div className="space-y-1.5">
                <Label>Responsable de la représentation</Label>
                <Select value={headProfileId} onValueChange={setHeadProfileId}>
                  <SelectTrigger id="org-head-profile">
                    <SelectValue placeholder="Sélectionner un agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Non désigné</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.full_name || "Sans nom"}
                        {a.fonction_responsabilite ? ` — ${a.fonction_responsabilite}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Agent dirigeant la représentation. Son poste (Consul, Consul général…) et sa
                  responsabilité (« Chef de poste ») restent renseignés sur sa fiche. Cette
                  désignation ne modifie aucun droit d'accès.
                </p>
              </div>
            )}

            {capabilities.supports_parent_organization && (
              <div className="space-y-1.5">
                <Label>Représentation de rattachement</Label>
                <Select value={parentOrgId} onValueChange={setParentOrgId}>
                  <SelectTrigger id="org-parent">
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Aucune</SelectItem>
                    {representations.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                        {r.host_city ? ` — ${r.host_city}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Lien institutionnel de coordination uniquement. Chaque représentation conserve
                  ses structures, agents et données ; ce rattachement n'ouvre aucun accès aux
                  données d'une autre organisation.
                </p>
              </div>
            )}
          </div>
        )}


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
