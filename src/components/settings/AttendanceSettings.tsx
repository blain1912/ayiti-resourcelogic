import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, CalendarDays, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WEEK_DAYS, type AttendanceScheduleScope } from "@/lib/attendance";
import { SecureAttendanceQR } from "@/components/attendance/SecureAttendanceQR";
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  useAttendanceHolidays,
  useAttendanceSettings,
  useDeleteHoliday,
  useDeleteWorkSchedule,
  useSaveAttendanceSettings,
  useSaveHoliday,
  useSaveWorkSchedule,
  useWorkSchedules,
} from "@/hooks/useAttendanceConfig";

interface Props {
  organizationId: string;
}

const emptySchedule = {
  scope: "organization" as AttendanceScheduleScope,
  unit_id: "" as string,
  name: "Horaire administratif",
  work_days: [1, 2, 3, 4, 5],
  arrival_time: "08:00",
  departure_time: "16:00",
  break_start: "",
  break_end: "",
  tolerance_minutes: 15,
};

export const AttendanceSettings = ({ organizationId }: Props) => {
  const { data: settings } = useAttendanceSettings(organizationId);
  const saveSettings = useSaveAttendanceSettings(organizationId);
  const { data: schedules } = useWorkSchedules(organizationId);
  const saveSchedule = useSaveWorkSchedule(organizationId);
  const deleteSchedule = useDeleteWorkSchedule(organizationId);
  const { data: holidays } = useAttendanceHolidays(organizationId);
  const saveHoliday = useSaveHoliday(organizationId);
  const deleteHoliday = useDeleteHoliday(organizationId);

  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState(emptySchedule);
  const [holidayForm, setHolidayForm] = useState({ date: "", label: "", type: "ferie" });
  const [modes, setModes] = useState(DEFAULT_ATTENDANCE_SETTINGS);

  useEffect(() => {
    if (settings) {
      setModes({
        manual_enabled: settings.manual_enabled,
        central_qr_enabled: settings.central_qr_enabled,
        individual_qr_enabled: settings.individual_qr_enabled,
        telework_enabled: settings.telework_enabled,
        anti_double_seconds: settings.anti_double_seconds,
      });
    }
  }, [settings]);

  useEffect(() => {
    supabase
      .from("organizational_units")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name")
      .then(({ data }) => setUnits(data || []));
  }, [organizationId]);

  const persistModes = (next: typeof modes) => {
    setModes(next);
    saveSettings.mutate(next, {
      onSuccess: () => toast({ title: "Paramètres enregistrés" }),
      onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      work_days: f.work_days.includes(day)
        ? f.work_days.filter((d) => d !== day)
        : [...f.work_days, day].sort(),
    }));
  };

  const submitSchedule = () => {
    if (!form.name.trim() || !form.work_days.length) {
      toast({ title: "Nom et jours ouvrés obligatoires", variant: "destructive" });
      return;
    }
    if (form.scope === "unit" && !form.unit_id) {
      toast({ title: "Sélectionnez une structure", variant: "destructive" });
      return;
    }
    saveSchedule.mutate(
      { ...form, unit_id: form.unit_id || null },
      {
        onSuccess: () => {
          toast({ title: "Horaire enregistré" });
          setForm(emptySchedule);
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
      }
    );
  };

  const submitHoliday = () => {
    if (!holidayForm.date || !holidayForm.label.trim()) {
      toast({ title: "Date et libellé obligatoires", variant: "destructive" });
      return;
    }
    saveHoliday.mutate(holidayForm, {
      onSuccess: () => {
        toast({ title: "Journée enregistrée" });
        setHolidayForm({ date: "", label: "", type: "ferie" });
      },
      onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });
  };

  const scopeLabel = (scope: string) =>
    scope === "organization" ? "Organisation" : scope === "unit" ? "Structure" : "Agent";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modes de pointage</CardTitle>
          <CardDescription>
            Activez uniquement les modes utilisés par votre institution. Les modes désactivés sont
            refusés côté serveur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "manual_enabled", label: "Saisie manuelle par le service RH" },
            { key: "central_qr_enabled", label: "QR code central (affiché sur site)" },
            { key: "individual_qr_enabled", label: "QR code individuel par agent" },
            { key: "telework_enabled", label: "Télétravail / mission hors site" },
          ].map((mode) => (
            <div key={mode.key} className="flex items-center justify-between gap-4">
              <Label htmlFor={mode.key}>{mode.label}</Label>
              <Switch
                id={mode.key}
                checked={(modes as any)[mode.key]}
                onCheckedChange={(checked) => persistModes({ ...modes, [mode.key]: checked })}
              />
            </div>
          ))}

          <Separator />

          <div className="space-y-2 max-w-xs">
            <Label htmlFor="anti-double">Délai anti-double pointage (secondes)</Label>
            <Input
              id="anti-double"
              type="number"
              min={0}
              value={modes.anti_double_seconds}
              onChange={(e) =>
                setModes({ ...modes, anti_double_seconds: parseInt(e.target.value) || 0 })
              }
              onBlur={() => persistModes(modes)}
            />
          </div>
        </CardContent>
      </Card>

      {modes.central_qr_enabled && (
        <SecureAttendanceQR organizationId={organizationId} scope="central" canManage />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Horaires de travail
          </CardTitle>
          <CardDescription>
            Héritage automatique : horaire de l'agent, sinon celui de sa structure, sinon celui de
            l'organisation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Niveau</Label>
              <Select
                value={form.scope}
                onValueChange={(v) => setForm({ ...form, scope: v as AttendanceScheduleScope })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">Organisation</SelectItem>
                  <SelectItem value="unit">Structure administrative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.scope === "unit" && (
              <div className="space-y-2">
                <Label>Structure</Label>
                <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nom de l'horaire</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tolérance (minutes)</Label>
              <Input
                type="number"
                min={0}
                value={form.tolerance_minutes}
                onChange={(e) =>
                  setForm({ ...form, tolerance_minutes: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Heure d'arrivée</Label>
              <Input type="time" value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Heure de départ</Label>
              <Input type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Début de pause (facultatif)</Label>
              <Input type="time" value={form.break_start} onChange={(e) => setForm({ ...form, break_start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Fin de pause (facultatif)</Label>
              <Input type="time" value={form.break_end} onChange={(e) => setForm({ ...form, break_end: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Jours ouvrés</Label>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((d) => (
                <Button
                  key={d.value}
                  type="button"
                  size="sm"
                  variant={form.work_days.includes(d.value) ? "default" : "outline"}
                  onClick={() => toggleDay(d.value)}
                >
                  {d.short}
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={submitSchedule} disabled={saveSchedule.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Enregistrer l'horaire
          </Button>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Horaire</TableHead>
                  <TableHead>Jours</TableHead>
                  <TableHead>Tolérance</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(schedules || []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell><Badge variant="outline">{scopeLabel(s.scope)}</Badge></TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.arrival_time?.slice(0, 5)} – {s.departure_time?.slice(0, 5)}</TableCell>
                    <TableCell>
                      {(s.work_days || [])
                        .map((d) => WEEK_DAYS.find((w) => w.value === d)?.short)
                        .join(", ")}
                    </TableCell>
                    <TableCell>{s.tolerance_minutes} min</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSchedule.mutate(s.id)}
                        aria-label="Supprimer l'horaire"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!schedules?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Aucun horaire défini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Journées non travaillées
          </CardTitle>
          <CardDescription>
            Jours fériés, fermetures et jours chômés : aucune absence n'est générée sur ces dates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Libellé</Label>
              <Input value={holidayForm.label} onChange={(e) => setHolidayForm({ ...holidayForm, label: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={holidayForm.type} onValueChange={(v) => setHolidayForm({ ...holidayForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ferie">Jour férié</SelectItem>
                  <SelectItem value="fermeture">Fermeture</SelectItem>
                  <SelectItem value="chome">Jour chômé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={submitHoliday} disabled={saveHoliday.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter
          </Button>

          <div className="flex flex-wrap gap-2">
            {(holidays || []).map((h) => (
              <Badge key={h.id} variant="secondary" className="gap-2">
                {new Date(`${h.date}T00:00:00`).toLocaleDateString("fr-FR")} — {h.label}
                <button onClick={() => deleteHoliday.mutate(h.id)} aria-label="Supprimer">
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {!holidays?.length && (
              <p className="text-sm text-muted-foreground">Aucune journée enregistrée.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceSettings;
