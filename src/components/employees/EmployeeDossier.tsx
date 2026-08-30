import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Pencil, Printer, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logHrEvent } from "@/lib/hrAudit";
import { useStaffAssignments } from "@/hooks/useStaffAssignments";
import { useCareerEvents } from "@/hooks/useCareerEvents";
import { useEmployeeDocuments } from "@/hooks/useEmployeeDocuments";
import { useRequiredDocuments } from "@/hooks/useRequiredDocuments";
import {
  ADMINISTRATIVE_STATUSES,
  administrativeStatusLabel,
  careerEventLabel,
  documentExpiryState,
  documentTypeLabel,
} from "@/lib/careerTypes";
import { durationSince, formatDate, formatDuration } from "@/lib/seniority";
import type { OrganizationCapabilities } from "@/lib/organizationCapabilities";

interface EmployeeDossierProps {
  profile: any;
  organization?: any;
  units: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
  capabilities: OrganizationCapabilities;
  canManage: boolean;
  onUpdated?: () => void;
}

export function EmployeeDossier({
  profile,
  organization,
  units,
  positions,
  capabilities,
  canManage,
  onUpdated,
}: EmployeeDossierProps) {
  const { data: assignments = [] } = useStaffAssignments(profile?.id);
  const { data: events = [] } = useCareerEvents(profile?.id);
  const { data: documents = [] } = useEmployeeDocuments(profile?.id);
  const { data: requirements = [] } = useRequiredDocuments(profile?.organization_id);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date_entree_organisation: profile?.date_entree_organisation || "",
    administrative_status: profile?.administrative_status || "actif",
    administrative_status_since: profile?.administrative_status_since || "",
    administrative_status_comment: profile?.administrative_status_comment || "",
  });

  const currentAssignment = useMemo(
    () =>
      assignments.find((a) => a.is_current && a.assignment_kind === "principale") ||
      assignments.find((a) => a.is_current) ||
      null,
    [assignments],
  );

  const secondaryAssignments = useMemo(
    () => assignments.filter((a) => a.is_current && a.assignment_kind !== "principale"),
    [assignments],
  );

  // 7E : deux notions distinctes de dates.
  const entryDate = profile?.date_entree_organisation || profile?.date_entree_fonction || null;
  const positionStartDate = currentAssignment?.start_date || profile?.date_entree_fonction || null;

  const orgSeniority = formatDuration(durationSince(entryDate));
  const positionSeniority = formatDuration(durationSince(positionStartDate));

  const currentUnitName =
    currentAssignment?.unit?.name || units.find((u) => u.id === profile?.unit_id)?.name || null;
  const currentPositionName =
    currentAssignment?.position?.name || positions.find((p) => p.id === profile?.position_id)?.name || null;
  const supervisorName =
    currentAssignment?.supervisor?.full_name ||
    [currentAssignment?.supervisor?.prenom, currentAssignment?.supervisor?.nom].filter(Boolean).join(" ") ||
    null;

  /* ---------------- complétude & alertes ---------------- */

  const activeRequirements = useMemo(
    () =>
      requirements.filter(
        (r) =>
          r.is_active &&
          (!r.applies_to_category || r.applies_to_category === profile?.employee_category),
      ),
    [requirements, profile?.employee_category],
  );

  const requirementStatus = useMemo(
    () =>
      activeRequirements.map((req) => {
        const match = documents.find(
          (d) =>
            !d.is_archived &&
            (req.document_type ? d.document_type === req.document_type : d.category === req.category),
        );
        return {
          requirement: req,
          document: match || null,
          satisfied: !!match && (!req.requires_expiry || !!match.expires_at),
        };
      }),
    [activeRequirements, documents],
  );

  const mandatory = requirementStatus.filter((r) => r.requirement.is_mandatory);
  const completeness =
    mandatory.length === 0
      ? null
      : Math.round((mandatory.filter((r) => r.satisfied).length / mandatory.length) * 100);

  const expiredDocs = documents.filter((d) => !d.is_archived && documentExpiryState(d.expires_at) === "expired");
  const expiringDocs = documents.filter((d) => !d.is_archived && documentExpiryState(d.expires_at) === "expiring");
  const missingMandatory = mandatory.filter((r) => !r.satisfied);
  const assignmentsWithoutDecision = assignments.filter((a) => a.is_current && !a.decision_reference);

  /* ---------------- édition situation administrative ---------------- */

  const saveAdministrative = async () => {
    setSaving(true);
    try {
      const payload = {
        date_entree_organisation: form.date_entree_organisation || null,
        administrative_status: form.administrative_status,
        administrative_status_since: form.administrative_status_since || null,
        administrative_status_comment: form.administrative_status_comment || null,
      };
      const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
      if (error) throw error;

      await logHrEvent({
        organization_id: profile.organization_id,
        profile_id: profile.id,
        entity_type: "profile",
        entity_id: profile.id,
        action: "administrative_situation_updated",
        old_value: {
          date_entree_organisation: profile.date_entree_organisation,
          administrative_status: profile.administrative_status,
          administrative_status_since: profile.administrative_status_since,
        },
        new_value: payload,
        comment: form.administrative_status_comment || null,
      });

      toast({ title: "Enregistré", description: "Situation administrative mise à jour." });
      setEditOpen(false);
      onUpdated?.();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base">{value || "Non renseigné"}</p>
    </div>
  );

  const majorEvents = events.filter((e) => !e.is_cancelled).slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Alertes dossier — avertissements, jamais bloquants */}
      {(missingMandatory.length > 0 ||
        expiredDocs.length > 0 ||
        expiringDocs.length > 0 ||
        assignmentsWithoutDecision.length > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alertes dossier</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-1 space-y-1 text-sm">
              {missingMandatory.map((m) => (
                <li key={m.requirement.id}>Pièce obligatoire manquante : {m.requirement.label}</li>
              ))}
              {expiredDocs.map((d) => (
                <li key={d.id}>
                  Document expiré : {d.title || documentTypeLabel(d.document_type)} (
                  {formatDate(d.expires_at)})
                </li>
              ))}
              {expiringDocs.map((d) => (
                <li key={d.id}>
                  Document expirant bientôt : {d.title || documentTypeLabel(d.document_type)} (
                  {formatDate(d.expires_at)})
                </li>
              ))}
              {assignmentsWithoutDecision.length > 0 && (
                <li>
                  {assignmentsWithoutDecision.length} affectation(s) en cours sans référence de décision.
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div id="employee-dossier-print" className="space-y-4">
        {/* Situation professionnelle actuelle */}
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Situation administrative actuelle</CardTitle>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Fiche synthèse
              </Button>
              {canManage && (
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Agent" value={profile?.full_name} />
            <Field label="Matricule / code budgétaire" value={capabilities.supports_budget_code ? profile?.code_budgetaire : profile?.nif} />
            <Field label="Organisation" value={organization?.name} />
            <Field label="Structure actuelle" value={currentUnitName} />
            <Field label="Poste actuel" value={currentPositionName} />
            <Field label="Supérieur hiérarchique" value={supervisorName} />
            <Field
              label="Type d'affectation"
              value={currentAssignment?.assignment_kind || "Non renseigné"}
            />
            <Field label="Catégorie professionnelle" value={profile?.employee_category} />
            <Field
              label="Statut administratif"
              value={
                <Badge variant="secondary">
                  {administrativeStatusLabel(profile?.administrative_status)}
                </Badge>
              }
            />
            <Field label="Date d'entrée dans l'organisation" value={formatDate(entryDate)} />
            <Field label={capabilities.entry_date_label} value={formatDate(positionStartDate)} />
            <Field label="Ancienneté dans l'organisation" value={orgSeniority} />
            <Field label="Ancienneté dans le poste" value={positionSeniority} />
            {capabilities.supports_diplomatic_assignment && (
              <>
                <Field
                  label="Pays d'implantation"
                  value={organization?.host_country || organization?.country}
                />
                <Field
                  label="Ville d'implantation"
                  value={organization?.host_city || organization?.city}
                />
              </>
            )}
            {profile?.administrative_status_since && (
              <Field
                label="Statut en vigueur depuis"
                value={formatDate(profile.administrative_status_since)}
              />
            )}
          </CardContent>
        </Card>

        {secondaryAssignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Affectations en cumul</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {secondaryAssignments.map((a) => (
                <div key={a.id} className="text-sm flex flex-wrap gap-2 items-center">
                  <Badge variant="outline">{a.assignment_kind}</Badge>
                  <span>{a.position?.name || "Poste non précisé"}</span>
                  <span className="text-muted-foreground">— {a.unit?.name || "Structure non précisée"}</span>
                  <span className="text-muted-foreground ml-auto">depuis le {formatDate(a.start_date)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Complétude */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Complétude du dossier administratif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completeness === null ? (
              <p className="text-sm text-muted-foreground">
                Aucun référentiel de pièces requises n'a encore été défini pour cette organisation.
                {canManage && " Configurez-le dans « Documents requis »."}
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Progress value={completeness} className="flex-1" />
                  <span className="text-sm font-semibold">{completeness} %</span>
                </div>
                <ul className="space-y-1 text-sm">
                  {requirementStatus.map(({ requirement, satisfied }) => (
                    <li key={requirement.id} className="flex items-center gap-2">
                      {satisfied ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                      )}
                      <span>{requirement.label}</span>
                      {!requirement.is_mandatory && (
                        <Badge variant="outline" className="text-xs">Facultatif</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* Principaux événements de carrière */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Principaux événements de carrière</CardTitle>
          </CardHeader>
          <CardContent>
            {majorEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun événement enregistré.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {majorEvents.map((e) => (
                  <li key={e.id} className="flex flex-wrap gap-2">
                    <span className="font-medium">{formatDate(e.effective_date)}</span>
                    <span>{careerEventLabel(e.movement_type)}</span>
                    {e.to_position && <span className="text-muted-foreground">— {e.to_position}</span>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Situation administrative</DialogTitle>
            <DialogDescription>
              Le statut administratif est durable. Le statut du jour (congé, mission, présence)
              reste calculé automatiquement par le moteur RH.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Date d'entrée dans l'organisation</Label>
              <Input
                type="date"
                value={form.date_entree_organisation}
                onChange={(e) => setForm((f) => ({ ...f, date_entree_organisation: e.target.value }))}
              />
            </div>
            <div>
              <Label>Statut administratif</Label>
              <Select
                value={form.administrative_status}
                onValueChange={(v) => setForm((f) => ({ ...f, administrative_status: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {ADMINISTRATIVE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>En vigueur depuis</Label>
              <Input
                type="date"
                value={form.administrative_status_since}
                onChange={(e) => setForm((f) => ({ ...f, administrative_status_since: e.target.value }))}
              />
            </div>
            <div>
              <Label>Observations</Label>
              <Textarea
                rows={2}
                value={form.administrative_status_comment}
                onChange={(e) =>
                  setForm((f) => ({ ...f, administrative_status_comment: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={saveAdministrative} disabled={saving}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
