import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useSpecialSchedules, ScheduleAssignment } from "@/hooks/useSpecialSchedules";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Calendar, Clock, Users, ChevronRight, ArrowLeft, Building2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function SpecialSchedules() {
  const {
    schedules, loading, createSchedule, updateSchedule, deleteSchedule,
    fetchAssignments, assignEmployee, assignUnit, removeAssignment,
  } = useSpecialSchedules();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUnitOpen, setAssignUnitOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  
  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Assignment form
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [assignNotes, setAssignNotes] = useState("");

  // Unit assignment form
  const [selectedUnit, setSelectedUnit] = useState("");
  const [unitWorkDays, setUnitWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [unitStartTime, setUnitStartTime] = useState("08:00");
  const [unitEndTime, setUnitEndTime] = useState("16:00");
  const [unitNotes, setUnitNotes] = useState("");

  useEffect(() => {
    if (selectedSchedule) {
      loadAssignments(selectedSchedule);
      loadEmployees();
      loadUnits();
    }
  }, [selectedSchedule]);

  const loadAssignments = async (scheduleId: string) => {
    const data = await fetchAssignments(scheduleId);
    setAssignments(data);
  };

  const loadEmployees = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.organization_id) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, prenom, nom")
      .eq("organization_id", profile.organization_id)
      .eq("approval_status", "approved");
    setEmployees(data || []);
  };

  const loadUnits = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.organization_id) return;

    const { data } = await supabase
      .from("organizational_units")
      .select("id, name, type")
      .eq("organization_id", profile.organization_id)
      .order("name");
    setUnits(data || []);
  };

  const handleCreate = async () => {
    const success = await createSchedule({ name, description, start_date: startDate, end_date: endDate || undefined });
    if (success) {
      setCreateOpen(false);
      setName(""); setDescription(""); setStartDate(""); setEndDate("");
    }
  };

  const handleAssign = async () => {
    if (!selectedSchedule || !selectedEmployee) return;
    const success = await assignEmployee(selectedSchedule, {
      profile_id: selectedEmployee,
      work_days: workDays,
      start_time: startTime,
      end_time: endTime,
      notes: assignNotes || undefined,
    });
    if (success) {
      setAssignOpen(false);
      setSelectedEmployee(""); setWorkDays([1, 2, 3, 4, 5]); setStartTime("08:00"); setEndTime("16:00"); setAssignNotes("");
      loadAssignments(selectedSchedule);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    await removeAssignment(id);
    if (selectedSchedule) loadAssignments(selectedSchedule);
  };

  const toggleDay = (day: number) => {
    setWorkDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const toggleUnitDay = (day: number) => {
    setUnitWorkDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const handleAssignUnit = async () => {
    if (!selectedSchedule || !selectedUnit) return;
    const success = await assignUnit(selectedSchedule, selectedUnit, {
      work_days: unitWorkDays,
      start_time: unitStartTime,
      end_time: unitEndTime,
      notes: unitNotes || undefined,
    });
    if (success) {
      setAssignUnitOpen(false);
      setSelectedUnit(""); setUnitWorkDays([1, 2, 3, 4, 5]); setUnitStartTime("08:00"); setUnitEndTime("16:00"); setUnitNotes("");
      loadAssignments(selectedSchedule);
    }
  };

  const currentSchedule = schedules.find(s => s.id === selectedSchedule);

  if (loading) {
    return <div className="container mx-auto p-6"><p>Chargement...</p></div>;
  }

  // Detail view for a schedule
  if (selectedSchedule && currentSchedule) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSchedule(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{currentSchedule.name}</h1>
            <p className="text-muted-foreground">
              {format(new Date(currentSchedule.start_date), "d MMMM yyyy", { locale: fr })}
              {currentSchedule.end_date && ` → ${format(new Date(currentSchedule.end_date), "d MMMM yyyy", { locale: fr })}`}
            </p>
          </div>
          <Badge variant={currentSchedule.is_active ? "default" : "secondary"} className="ml-auto">
            {currentSchedule.is_active ? "Actif" : "Inactif"}
          </Badge>
        </div>

        {currentSchedule.description && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-muted-foreground">{currentSchedule.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employés assignés ({assignments.length})
              </CardTitle>
              <CardDescription>Jours et heures de travail assignés à chaque employé</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={assignUnitOpen} onOpenChange={setAssignUnitOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Building2 className="h-4 w-4 mr-2" />Assigner une unité</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assigner tous les employés d'une unité</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Unité organisationnelle</Label>
                      <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner une unité" /></SelectTrigger>
                        <SelectContent>
                          {units.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Jours de travail</Label>
                      <div className="flex gap-2 mt-2">
                        {DAY_LABELS.map((label, i) => (
                          <Button key={i} type="button" variant={unitWorkDays.includes(i) ? "default" : "outline"} size="sm" className="w-10 h-10 p-0" onClick={() => toggleUnitDay(i)}>
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Heure début</Label>
                        <Input type="time" value={unitStartTime} onChange={e => setUnitStartTime(e.target.value)} />
                      </div>
                      <div>
                        <Label>Heure fin</Label>
                        <Input type="time" value={unitEndTime} onChange={e => setUnitEndTime(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea value={unitNotes} onChange={e => setUnitNotes(e.target.value)} placeholder="Notes optionnelles..." />
                    </div>
                    <Button onClick={handleAssignUnit} disabled={!selectedUnit} className="w-full">
                      Assigner toute l'unité
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" />Assigner un employé</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assigner un employé</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Employé</Label>
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
                        <SelectContent>
                          {employees
                            .filter(e => !assignments.some(a => a.profile_id === e.id))
                            .map(e => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.prenom && e.nom ? `${e.prenom} ${e.nom}` : e.full_name || "Sans nom"}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Jours de travail</Label>
                      <div className="flex gap-2 mt-2">
                        {DAY_LABELS.map((label, i) => (
                          <Button key={i} type="button" variant={workDays.includes(i) ? "default" : "outline"} size="sm" className="w-10 h-10 p-0" onClick={() => toggleDay(i)}>
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Heure début</Label>
                        <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                      </div>
                      <div>
                        <Label>Heure fin</Label>
                        <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea value={assignNotes} onChange={e => setAssignNotes(e.target.value)} placeholder="Notes optionnelles..." />
                    </div>
                    <Button onClick={handleAssign} disabled={!selectedEmployee} className="w-full">
                      Assigner l'employé
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucun employé assigné à cet horaire.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Jours</TableHead>
                    <TableHead>Horaire</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.profile?.prenom && a.profile?.nom
                          ? `${a.profile.prenom} ${a.profile.nom}`
                          : a.profile?.full_name || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {a.work_days.sort().map(d => (
                            <Badge key={d} variant="outline" className="text-xs">{DAY_LABELS[d]}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{a.start_time?.slice(0, 5)} - {a.end_time?.slice(0, 5)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{a.notes || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAssignment(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Horaires Spéciaux</h1>
          <p className="text-muted-foreground">Gérer les horaires spéciaux en période de crise</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouvel horaire</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un horaire spécial</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom de l'horaire</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Horaire de crise - Janvier 2026" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description optionnelle..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de début</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Date de fin (optionnel)</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={!name || !startDate} className="w-full">
                Créer l'horaire
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Aucun horaire spécial</h3>
            <p className="text-muted-foreground text-center mt-2">
              Créez un horaire spécial pour assigner des jours et heures de travail aux employés en période difficile.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map(schedule => (
            <Card key={schedule.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedSchedule(schedule.id)}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{schedule.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(schedule.start_date), "d MMM yyyy", { locale: fr })}
                      {schedule.end_date && ` → ${format(new Date(schedule.end_date), "d MMM yyyy", { locale: fr })}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={(checked) => updateSchedule(schedule.id, { is_active: checked })}
                    />
                    <span className="text-sm text-muted-foreground">{schedule.is_active ? "Actif" : "Inactif"}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); deleteSchedule(schedule.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
