import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Ban, Loader2, Plus, Milestone } from "lucide-react";
import { useCareerEvents, useCancelCareerEvent, useRecordCareerEvent } from "@/hooks/useCareerEvents";
import { useStaffAssignments } from "@/hooks/useStaffAssignments";
import { useEmployeeDocuments } from "@/hooks/useEmployeeDocuments";
import {
  ADMINISTRATIVE_STATUSES,
  CAREER_EVENT_TYPES,
  administrativeStatusLabel,
  careerEventLabel,
  careerEventTypesFor,
} from "@/lib/careerTypes";
import { formatDate } from "@/lib/seniority";
import type { OrganizationCapabilities } from "@/lib/organizationCapabilities";

interface CareerTabProps {
  profile: any;
  units: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
  capabilities: OrganizationCapabilities;
  canManage: boolean;
}

interface TimelineItem {
  key: string;
  date: string;
  title: string;
  detail: string;
  reference?: string | null;
  source: "event" | "assignment";
  cancelled?: boolean;
  status?: string | null;
}

export function CareerTab({ profile, units, positions, capabilities, canManage }: CareerTabProps) {
  const { data: events = [], isLoading: eventsLoading } = useCareerEvents(profile?.id);
  const { data: assignments = [] } = useStaffAssignments(profile?.id);
  const { data: documents = [] } = useEmployeeDocuments(profile?.id);
  const record = useRecordCareerEvent(profile?.organization_id);
  const cancelEvent = useCancelCareerEvent();

  const [open, setOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const availableTypes = careerEventTypesFor(capabilities);
  const [form, setForm] = useState({
    event_type: "promotion",
    effective_date: new Date().toISOString().slice(0, 10),
    decision_date: "",
    unit_id: "",
    position_id: "",
    create_assignment: true,
    close_assignment: false,
    assignment_kind: "principale",
    new_status: "",
    decision_reference: "",
    document_id: "",
    notes: "",
  });

  const selectedType = CAREER_EVENT_TYPES.find((t) => t.value === form.event_type);

  const onTypeChange = (value: string) => {
    const type = CAREER_EVENT_TYPES.find((t) => t.value === value);
    setForm((f) => ({
      ...f,
      event_type: value,
      create_assignment: type?.createsAssignment ?? false,
      close_assignment: type?.closesAssignment ?? false,
      new_status: type?.suggestedStatus ?? "",
    }));
  };

  /**
   * La chronologie est GÉNÉRÉE depuis les données réelles :
   * affectations (Phase 6) + événements de carrière (staff_movements).
   */
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    if (profile?.date_entree_organisation) {
      items.push({
        key: "entry",
        date: profile.date_entree_organisation,
        title: "Entrée dans l'organisation",
        detail: "Début de l'ancienneté administrative",
        source: "event",
      });
    }

    const assignmentIdsWithEvent = new Set(events.map((e) => e.assignment_id).filter(Boolean));

    events.forEach((e) => {
      items.push({
        key: `evt-${e.id}`,
        date: e.effective_date,
        title: careerEventLabel(e.movement_type),
        detail: [
          e.from_position || e.to_position
            ? `${e.from_position || "—"} → ${e.to_position || "—"}`
            : null,
          e.from_unit || e.to_unit ? `${e.from_unit || "—"} → ${e.to_unit || "—"}` : null,
          e.notes,
        ]
          .filter(Boolean)
          .join(" • "),
        reference: e.decision_reference,
        source: "event",
        cancelled: e.is_cancelled,
        status: e.new_status,
      });
    });

    // Les affectations déjà représentées par un événement ne sont pas dupliquées.
    assignments
      .filter((a) => !assignmentIdsWithEvent.has(a.id))
      .forEach((a) => {
        items.push({
          key: `asg-${a.id}`,
          date: a.start_date,
          title:
            a.assignment_kind === "principale"
              ? "Affectation principale"
              : `Affectation ${a.assignment_kind}`,
          detail: [a.position?.name, a.unit?.name, a.end_date ? `jusqu'au ${formatDate(a.end_date)}` : "en cours"]
            .filter(Boolean)
            .join(" • "),
          reference: a.decision_reference,
          source: "assignment",
        });
      });

    return items.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [events, assignments, profile?.date_entree_organisation]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    timeline.forEach((item) => {
      const year = item.date?.slice(0, 4) || "—";
      map.set(year, [...(map.get(year) || []), item]);
    });
    return Array.from(map.entries());
  }, [timeline]);

  const submit = async () => {
    if (!form.effective_date) {
      toast({ title: "Date requise", description: "Indiquez la date d'effet.", variant: "destructive" });
      return;
    }
    try {
      await record.mutateAsync({
        profile_id: profile.id,
        event_type: form.event_type,
        effective_date: form.effective_date,
        decision_date: form.decision_date || null,
        unit_id: form.unit_id || null,
        position_id: form.position_id || null,
        create_assignment: form.create_assignment,
        close_assignment: !form.create_assignment && form.close_assignment,
        assignment_kind: form.assignment_kind,
        new_status: form.new_status || null,
        decision_reference: form.decision_reference || null,
        document_id: form.document_id || null,
        notes: form.notes || null,
      });
      toast({ title: "Enregistré", description: "Événement de carrière ajouté au dossier." });
      setOpen(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelEvent.mutateAsync({ id: cancelTarget, reason: cancelReason || "Annulé" });
      toast({ title: "Événement annulé", description: "La décision reste conservée dans l'historique." });
      setCancelTarget(null);
      setCancelReason("");
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Milestone className="h-5 w-5" />
            Chronologie de carrière
          </CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel événement
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">
              Aucun événement de carrière enregistré pour le moment.
            </p>
          ) : (
            <div className="space-y-6">
              {grouped.map(([year, items]) => (
                <div key={year} className="relative pl-6 border-l">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary" />
                  <p className="text-lg font-bold leading-none mb-3">{year}</p>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.key}
                        className={`rounded-lg border p-3 ${item.cancelled ? "opacity-60" : ""}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{item.title}</span>
                          {item.cancelled && <Badge variant="destructive">Annulé</Badge>}
                          {item.source === "assignment" && <Badge variant="outline">Affectation</Badge>}
                          {item.status && (
                            <Badge variant="secondary">{administrativeStatusLabel(item.status)}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDate(item.date)}
                          </span>
                        </div>
                        {item.detail && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                            {item.detail}
                          </p>
                        )}
                        {item.reference && (
                          <p className="text-xs text-muted-foreground mt-1">Réf. {item.reference}</p>
                        )}
                        {canManage && item.key.startsWith("evt-") && !item.cancelled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 text-xs text-destructive"
                            onClick={() => setCancelTarget(item.key.replace("evt-", ""))}
                          >
                            <Ban className="h-3 w-3 mr-1" />
                            Annuler la décision
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enregistrer un événement de carrière</DialogTitle>
            <DialogDescription>
              L'ancienne situation est conservée. La nouvelle affectation est créée par le
              mécanisme d'affectation existant et l'opération est journalisée.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Type d'événement</Label>
              <Select value={form.event_type} onValueChange={onTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {availableTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date d'effet</Label>
              <Input
                type="date"
                value={form.effective_date}
                onChange={(e) => setForm((f) => ({ ...f, effective_date: e.target.value }))}
              />
            </div>

            <div>
              <Label>Date de la décision (facultatif)</Label>
              <Input
                type="date"
                value={form.decision_date}
                onChange={(e) => setForm((f) => ({ ...f, decision_date: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Date de signature de l'acte, si différente de la date d'effet.
              </p>
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Créer une affectation</Label>
                <p className="text-xs text-muted-foreground">
                  Utilise le mécanisme d'affectation existant (clôture automatique de la précédente).
                </p>
              </div>
              <Switch
                checked={form.create_assignment}
                onCheckedChange={(v) => setForm((f) => ({ ...f, create_assignment: v }))}
              />
            </div>

            {!form.create_assignment && (
              <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm">Clôturer l'affectation en cours</Label>
                  <p className="text-xs text-muted-foreground">
                    Rappel, fin de mission, départ ou retraite : l'affectation principale est
                    fermée à la date d'effet. L'agent et son historique sont conservés.
                  </p>
                </div>
                <Switch
                  checked={form.close_assignment}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, close_assignment: v }))}
                />
              </div>
            )}

            {form.create_assignment && (
              <>
                <div>
                  <Label>Structure</Label>
                  <Select
                    value={form.unit_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, unit_id: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Poste</Label>
                  <Select
                    value={form.position_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, position_id: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {positions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nature de l'affectation</Label>
                  <Select
                    value={form.assignment_kind}
                    onValueChange={(v) => setForm((f) => ({ ...f, assignment_kind: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="principale">Principale</SelectItem>
                      <SelectItem value="secondaire">Secondaire (cumul)</SelectItem>
                      <SelectItem value="temporaire">Temporaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label>Nouveau statut administratif</Label>
              <Select
                value={form.new_status}
                onValueChange={(v) => setForm((f) => ({ ...f, new_status: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Inchangé" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {ADMINISTRATIVE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Statut durable — le statut du jour reste calculé par le moteur RH.
              </p>
            </div>

            <div>
              <Label>Référence de décision</Label>
              <Input
                value={form.decision_reference}
                onChange={(e) => setForm((f) => ({ ...f, decision_reference: e.target.value }))}
                placeholder="Arrêté, décision, lettre…"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Pièce justificative (dossier de l'agent)</Label>
              <Select
                value={form.document_id}
                onValueChange={(v) => setForm((f) => ({ ...f, document_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {documents.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.title || d.file_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>Observations</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={record.isPending}>
              {record.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer {selectedType ? `« ${selectedType.label} »` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler cette décision</DialogTitle>
            <DialogDescription>
              La décision reste visible dans l'historique, marquée comme annulée. Aucune donnée
              n'est supprimée.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Motif</Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Retour</Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={cancelEvent.isPending}>
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
