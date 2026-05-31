import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DAY_LABELS, slotDurationHours, useOrgTeacherSlots, type TeacherSlot } from "@/hooks/useTeacherSchedules";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  organizationId: string;
  selectedDate: Date;
}

interface ProfileLite {
  id: string;
  full_name: string;
}

export const TeacherAttendanceSection = ({ organizationId, selectedDate }: Props) => {
  const { data: slots = [], isLoading } = useOrgTeacherSlots(organizationId);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [todayAttendance, setTodayAttendance] = useState<{ profile_id: string; time: string | null }[]>([]);

  const teacherIds = useMemo(() => Array.from(new Set(slots.map((s) => s.profile_id))), [slots]);
  const dow = selectedDate.getDay();
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    if (teacherIds.length === 0) {
      setProfiles({});
      return;
    }
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", teacherIds)
      .then(({ data }) => {
        const map: Record<string, ProfileLite> = {};
        (data || []).forEach((p: any) => (map[p.id] = p));
        setProfiles(map);
      });
  }, [teacherIds.join(",")]);

  useEffect(() => {
    if (teacherIds.length === 0) {
      setTodayAttendance([]);
      return;
    }
    supabase
      .from("attendance")
      .select("profile_id, time")
      .eq("organization_id", organizationId)
      .eq("date", dateStr)
      .in("profile_id", teacherIds)
      .then(({ data }) => setTodayAttendance(data || []));
  }, [teacherIds.join(","), dateStr, organizationId]);

  // Group slots by teacher for the weekly summary.
  const weekly = useMemo(() => {
    const byTeacher: Record<string, TeacherSlot[]> = {};
    slots.forEach((s) => {
      (byTeacher[s.profile_id] ||= []).push(s);
    });
    return byTeacher;
  }, [slots]);

  const todaySlots = slots.filter((s) => s.day_of_week === dow);

  // For each slot today, determine status from attendance time.
  const slotStatus = (s: TeacherSlot) => {
    const att = todayAttendance.find((a) => a.profile_id === s.profile_id);
    if (!att || !att.time) return "not_marked";
    const t = att.time.slice(0, 5);
    // present if pointed within [start - 15 min, end]
    const toMin = (hm: string) => {
      const [h, m] = hm.split(":").map(Number);
      return h * 60 + m;
    };
    const tMin = toMin(t);
    const start = toMin(s.start_time.slice(0, 5));
    const end = toMin(s.end_time.slice(0, 5));
    if (tMin > end) return "absent";
    if (tMin > start + 10) return "late";
    return "present";
  };

  const statusBadge = (st: string) => {
    if (st === "present") return <Badge>Présent</Badge>;
    if (st === "late") return <Badge variant="secondary">En retard</Badge>;
    if (st === "absent") return <Badge variant="destructive">Manqué</Badge>;
    return <Badge variant="outline">En attente</Badge>;
  };

  if (isLoading) return null;
  if (teacherIds.length === 0) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <GraduationCap className="h-5 w-5 text-primary" />
          Présence des enseignants
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Détection automatique : tout employé programmé apparaît ici. Les règles 8h–16h ne s'appliquent pas.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Créneaux du {format(selectedDate, "EEEE d MMMM", { locale: fr })}
          </h3>
          {todaySlots.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucun enseignant programmé ce jour.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enseignant</TableHead>
                    <TableHead>Créneau</TableHead>
                    <TableHead>Matière</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaySlots
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {profiles[s.profile_id]?.full_name || "—"}
                        </TableCell>
                        <TableCell>
                          {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.subject || "—"}
                        </TableCell>
                        <TableCell>{statusBadge(slotStatus(s))}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2">Cumul hebdomadaire programmé</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enseignant</TableHead>
                  <TableHead>Heures / semaine</TableHead>
                  <TableHead>Jours programmés</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(weekly).map(([pid, list]) => {
                  const total = list.reduce((sum, s) => sum + slotDurationHours(s), 0);
                  const days = Array.from(new Set(list.map((s) => s.day_of_week)))
                    .sort()
                    .map((d) => DAY_LABELS[d].slice(0, 3))
                    .join(", ");
                  return (
                    <TableRow key={pid}>
                      <TableCell className="font-medium">
                        {profiles[pid]?.full_name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={total === 6 ? "default" : "secondary"}>{total.toFixed(1)} h</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{days}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
