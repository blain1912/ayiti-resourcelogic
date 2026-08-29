import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, MapPin, Plus, Users } from "lucide-react";
import { useHrProfile, hrProfileName } from "@/hooks/useHrProfile";
import { useMissions, useSaveMission, useUpdateMissionStatus, type Mission } from "@/hooks/useMissions";
import { MISSION_STATUSES, formatFrDate, missionStatusLabel, missionStatusVariant } from "@/lib/hr";
import { MissionOrderDialog } from "@/components/missions/MissionOrderDialog";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  id: undefined as string | undefined,
  reference: "",
  subject: "",
  destination: "",
  country: "",
  city: "",
  place: "",
  start_date: today(),
  end_date: today(),
  lead_profile_id: "",
  observations: "",
  status: "planned",
};

const Missions = () => {
  const { toast } = useToast();
  const { data: profile, isLoading: loadingProfile } = useHrProfile();
  const orgId = profile?.organization_id ?? null;
  const canManage = !!profile?.isHr;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [participants, setParticipants] = useState<string[]>([]);
  const [orderMission, setOrderMission] = useState<Mission | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: missions = [], isLoading } = useMissions(orgId, canManage ? null : profile?.id);
  const saveMission = useSaveMission(orgId);
  const updateStatus = useUpdateMissionStatus();

  const { data: employees = [] } = useQuery({
    queryKey: ["mission-employees", orgId],
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

  const filtered = useMemo(
    () => (statusFilter === "all" ? missions : missions.filter((m) => m.status === statusFilter)),
    [missions, statusFilter]
  );

  const openCreate = () => {
    setForm(emptyForm);
    setParticipants([]);
    setOpen(true);
  };

  const openEdit = (mission: Mission) => {
    setForm({
      id: mission.id,
      reference: mission.reference ?? "",
      subject: mission.subject,
      destination: mission.destination ?? "",
      country: mission.country ?? "",
      city: mission.city ?? "",
      place: mission.place ?? "",
      start_date: mission.start_date,
      end_date: mission.end_date,
      lead_profile_id: mission.lead_profile_id ?? "",
      observations: mission.observations ?? "",
      status: mission.status,
    });
    setParticipants((mission.participants || []).map((p) => p.profile_id));
    setOpen(true);
  };

  const toggleParticipant = (id: string) => {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!form.subject.trim()) {
      toast({ title: "Objet requis", description: "Précisez l'objet de la mission.", variant: "destructive" });
      return;
    }
    if (form.end_date < form.start_date) {
      toast({ title: "Dates invalides", description: "La date de fin précède la date de début.", variant: "destructive" });
      return;
    }
    if (participants.length === 0) {
      toast({ title: "Participants requis", description: "Sélectionnez au moins un agent.", variant: "destructive" });
      return;
    }
    try {
      await saveMission.mutateAsync({
        mission: {
          id: form.id,
          reference: form.reference || null,
          subject: form.subject.trim(),
          destination: form.destination || null,
          country: form.country || null,
          city: form.city || null,
          place: form.place || null,
          start_date: form.start_date,
          end_date: form.end_date,
          lead_profile_id: form.lead_profile_id || null,
          observations: form.observations || null,
          status: form.status,
        },
        participantIds: participants,
      });
      toast({ title: "Mission enregistrée" });
      setOpen(false);
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
            <h1 className="text-3xl font-bold">Missions</h1>
            <p className="text-muted-foreground">
              Les agents en mission approuvée ne sont jamais comptés absents dans le module Présences.
            </p>
          </div>
          {canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Nouvelle mission
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-sm">Statut</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {MISSION_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Chargement des missions…</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Aucune mission enregistrée.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((mission) => (
              <Card key={mission.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{mission.subject}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant={missionStatusVariant(mission.status)}>
                        {missionStatusLabel(mission.status)}
                      </Badge>
                      {mission.reference && <span className="font-mono text-xs">{mission.reference}</span>}
                      <span>
                        {formatFrDate(mission.start_date)} → {formatFrDate(mission.end_date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setOrderMission(mission)}>
                      <FileText className="h-4 w-4 mr-1" /> Ordre de mission
                    </Button>
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => openEdit(mission)}>
                        Modifier
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(mission.destination || mission.city || mission.country) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {[mission.place, mission.destination, mission.city, mission.country]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <span>
                      {(mission.participants || []).map((p) => hrProfileName(p.profile)).join(", ") || "—"}
                    </span>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {MISSION_STATUSES.filter((s) => s.value !== mission.status).map((s) => (
                        <Button
                          key={s.value}
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: mission.id, status: s.value })}
                        >
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Modifier la mission" : "Nouvelle mission"}</DialogTitle>
            <DialogDescription>
              La mission couvre la période indiquée pour tous les agents sélectionnés.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Référence de l'ordre de mission</Label>
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MISSION_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Objet de la mission</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Lieu</Label>
                <Input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Pays</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Chef de mission</Label>
              <Select
                value={form.lead_profile_id || "none"}
                onValueChange={(value) => setForm({ ...form, lead_profile_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {hrProfileName(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Agents en mission ({participants.length})</Label>
              <ScrollArea className="h-48 rounded-md border p-3">
                <div className="space-y-2">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={participants.includes(emp.id)}
                        onCheckedChange={() => toggleParticipant(emp.id)}
                      />
                      {hrProfileName(emp)}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label>Observations</Label>
              <Textarea
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saveMission.isPending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MissionOrderDialog
        mission={orderMission}
        open={!!orderMission}
        onOpenChange={(value) => !value && setOrderMission(null)}
      />
    </div>
  );
};

export default Missions;
