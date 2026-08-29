import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { History, Plus } from "lucide-react";
import { useHrProfile, hrProfileName } from "@/hooks/useHrProfile";
import { useCreateAssignment, useStaffAssignments } from "@/hooks/useStaffAssignments";
import { ASSIGNMENT_KINDS, assignmentKindLabel, formatFrShortDate } from "@/lib/hr";

const today = () => new Date().toISOString().slice(0, 10);

const Assignments = () => {
  const { toast } = useToast();
  const { data: profile, isLoading: loadingProfile } = useHrProfile();
  const orgId = profile?.organization_id ?? null;
  const canManage = !!profile?.isHr;

  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    unit_id: "",
    position_id: "",
    supervisor_profile_id: "",
    assignment_kind: "principale",
    start_date: today(),
    decision_reference: "",
    comment: "",
  });

  const currentProfileId = selectedProfile || profile?.id || "";
  const { data: history = [], isLoading } = useStaffAssignments(currentProfileId);
  const createAssignment = useCreateAssignment(orgId);

  const { data: employees = [] } = useQuery({
    queryKey: ["assignment-employees", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, prenom, nom")
        .eq("organization_id", orgId!)
        .order("nom", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["assignment-units", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizational_units")
        .select("id, name")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["assignment-positions", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select("id, name")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const currentAssignment = useMemo(() => history.find((a) => a.is_current), [history]);

  const handleSave = async () => {
    if (!currentProfileId) return;
    try {
      await createAssignment.mutateAsync({
        assignment: {
          profile_id: currentProfileId,
          unit_id: form.unit_id || null,
          position_id: form.position_id || null,
          supervisor_profile_id: form.supervisor_profile_id || null,
          assignment_kind: form.assignment_kind,
          start_date: form.start_date,
          decision_reference: form.decision_reference || null,
          comment: form.comment || null,
        },
        movement: { movement_type: form.assignment_kind, comment: form.comment },
      });
      toast({
        title: "Affectation enregistrée",
        description: "L'affectation précédente a été clôturée et conservée dans l'historique.",
      });
      setOpen(false);
      setForm({
        unit_id: "",
        position_id: "",
        supervisor_profile_id: "",
        assignment_kind: "principale",
        start_date: today(),
        decision_reference: "",
        comment: "",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Enregistrement impossible",
        variant: "destructive",
      });
    }
  };

  if (loadingProfile) {
    return <div className="container mx-auto p-6 text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Affectations</h1>
            <p className="text-muted-foreground">
              Historique daté des affectations. Une nouvelle affectation clôture la précédente sans jamais l'effacer.
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setOpen(true)} disabled={!currentProfileId}>
              <Plus className="h-4 w-4 mr-2" /> Nouvelle affectation
            </Button>
          )}
        </div>

        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent</CardTitle>
              <CardDescription>Sélectionnez l'agent dont vous consultez le parcours.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedProfile || profile?.id || ""} onValueChange={setSelectedProfile}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Sélectionner un agent" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {hrProfileName(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {currentAssignment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Affectation courante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{currentAssignment.unit?.name ?? "Structure non précisée"}</p>
              <p className="text-muted-foreground">
                {currentAssignment.position?.name ?? "Poste non précisé"} ·{" "}
                {assignmentKindLabel(currentAssignment.assignment_kind)}
              </p>
              <p className="text-muted-foreground">
                Depuis le {formatFrShortDate(currentAssignment.start_date)}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Historique
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune affectation enregistrée.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Période</TableHead>
                      <TableHead>Structure</TableHead>
                      <TableHead>Poste</TableHead>
                      <TableHead>Nature</TableHead>
                      <TableHead>Décision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatFrShortDate(item.start_date)} →{" "}
                          {item.end_date ? formatFrShortDate(item.end_date) : "en cours"}
                          {item.is_current && (
                            <Badge variant="default" className="ml-2">
                              Actuelle
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{item.unit?.name ?? "—"}</TableCell>
                        <TableCell>{item.position?.name ?? "—"}</TableCell>
                        <TableCell>{assignmentKindLabel(item.assignment_kind)}</TableCell>
                        <TableCell className="text-xs">{item.decision_reference ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle affectation</DialogTitle>
            <DialogDescription>
              L'affectation principale en cours sera clôturée la veille de la date de prise d'effet.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Nature de l'affectation</Label>
              <Select
                value={form.assignment_kind}
                onValueChange={(value) => setForm({ ...form, assignment_kind: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_KINDS.map((kind) => (
                    <SelectItem key={kind.value} value={kind.value}>
                      {kind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Structure</Label>
              <Select
                value={form.unit_id || "none"}
                onValueChange={(value) => setForm({ ...form, unit_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non précisée</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Poste</Label>
              <Select
                value={form.position_id || "none"}
                onValueChange={(value) => setForm({ ...form, position_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non précisé</SelectItem>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Supérieur hiérarchique</Label>
              <Select
                value={form.supervisor_profile_id || "none"}
                onValueChange={(value) =>
                  setForm({ ...form, supervisor_profile_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non précisé</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {hrProfileName(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de prise d'effet</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Référence de décision</Label>
                <Input
                  value={form.decision_reference}
                  onChange={(e) => setForm({ ...form, decision_reference: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={createAssignment.isPending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assignments;
