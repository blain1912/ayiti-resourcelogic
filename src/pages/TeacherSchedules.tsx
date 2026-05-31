import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "@/hooks/use-toast";
import { DAY_LABELS, slotDurationHours, useOrgTeacherSlots } from "@/hooks/useTeacherSchedules";

const TeacherSchedules = () => {
  const { organization } = useOrganization();
  const qc = useQueryClient();
  const orgId = organization?.id;
  const { data: slots = [], isLoading } = useOrgTeacherSlots(orgId);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    profile_id: "",
    day_of_week: "1",
    start_time: "08:00",
    end_time: "10:00",
    subject: "",
  });

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", orgId)
      .eq("approval_status", "approved")
      .order("full_name")
      .then(({ data }) => setProfiles(data || []));
  }, [orgId]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof slots> = {};
    slots.forEach((s) => {
      (map[s.profile_id] ||= []).push(s);
    });
    return map;
  }, [slots]);

  const profileName = (id: string) => profiles.find((p) => p.id === id)?.full_name || "—";

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["teacher-slots"] });
  };

  const addSlot = async () => {
    if (!orgId || !form.profile_id) {
      toast({ title: "Champs requis", description: "Sélectionnez un enseignant.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("teacher_schedule_slots").insert({
      organization_id: orgId,
      profile_id: form.profile_id,
      day_of_week: parseInt(form.day_of_week, 10),
      start_time: form.start_time,
      end_time: form.end_time,
      subject: form.subject || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Créneau ajouté" });
    setOpen(false);
    setForm({ ...form, subject: "" });
    refresh();
  };

  const removeSlot = async (id: string) => {
    if (!confirm("Supprimer ce créneau ?")) return;
    const { error } = await supabase.from("teacher_schedule_slots").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Créneau supprimé" });
    refresh();
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Programmation des enseignants</h1>
            <p className="text-sm text-muted-foreground">
              Définissez 2 à 6 h par semaine répartis sur des créneaux précis.
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Ajouter un créneau
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau créneau enseignant</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Enseignant</Label>
                <Select
                  value={form.profile_id}
                  onValueChange={(v) => setForm({ ...form, profile_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jour</Label>
                <Select
                  value={form.day_of_week}
                  onValueChange={(v) => setForm({ ...form, day_of_week: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_LABELS.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Début</Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fin</Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Matière / Classe (optionnel)</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Ex : Mathématiques 9e A"
                />
              </div>
              <Button onClick={addSlot} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucun enseignant programmé. Cliquez sur « Ajouter un créneau » pour commencer.
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([pid, list]) => {
          const total = list.reduce((s, x) => s + slotDurationHours(x), 0);
          return (
            <Card key={pid}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between flex-wrap gap-2 text-base md:text-lg">
                  <span>{profileName(pid)}</span>
                  <Badge variant={total === 6 ? "default" : "secondary"}>
                    {total.toFixed(1)} h / semaine
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jour</TableHead>
                      <TableHead>Horaire</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Matière</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list
                      .sort(
                        (a, b) =>
                          a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
                      )
                      .map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{DAY_LABELS[s.day_of_week]}</TableCell>
                          <TableCell>
                            {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                          </TableCell>
                          <TableCell>{slotDurationHours(s).toFixed(1)} h</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {s.subject || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeSlot(s.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default TeacherSchedules;
