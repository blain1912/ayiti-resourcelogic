import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

interface EmployeeScheduleProps {
  profileId: string;
}

export function EmployeeSchedule({ profileId }: EmployeeScheduleProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, [profileId]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from("special_schedule_assignments")
        .select("*")
        .eq("profile_id", profileId);

      if (error) throw error;

      // Fetch schedule details
      const scheduleIds = [...new Set((data || []).map((a: any) => a.schedule_id))];
      let schedules: any[] = [];
      if (scheduleIds.length > 0) {
        const { data: scheduleData } = await supabase
          .from("special_schedules")
          .select("*")
          .in("id", scheduleIds);
        schedules = scheduleData || [];
      }

      setAssignments(
        (data || []).map(a => ({
          ...a,
          schedule: schedules.find(s => s.id === a.schedule_id),
        }))
      );
    } catch (error) {
      console.error("Error fetching schedule assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Chargement...</p>;

  const activeAssignments = assignments.filter(a => a.schedule?.is_active);
  const inactiveAssignments = assignments.filter(a => !a.schedule?.is_active);

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucun horaire spécial</h3>
          <p className="text-muted-foreground text-center mt-2">
            Cet employé n'est assigné à aucun horaire spécial.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activeAssignments.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Horaires actifs</h3>
          {activeAssignments.map(a => (
            <ScheduleCard key={a.id} assignment={a} />
          ))}
        </>
      )}
      {inactiveAssignments.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-6">Horaires passés</h3>
          {inactiveAssignments.map(a => (
            <ScheduleCard key={a.id} assignment={a} inactive />
          ))}
        </>
      )}
    </div>
  );
}

function ScheduleCard({ assignment, inactive }: { assignment: any; inactive?: boolean }) {
  const schedule = assignment.schedule;
  return (
    <Card className={inactive ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {schedule?.name || "Horaire spécial"}
          </CardTitle>
          <Badge variant={inactive ? "secondary" : "default"}>
            {inactive ? "Inactif" : "Actif"}
          </Badge>
        </div>
        {schedule && (
          <p className="text-sm text-muted-foreground">
            {format(new Date(schedule.start_date), "d MMM yyyy", { locale: fr })}
            {schedule.end_date && ` → ${format(new Date(schedule.end_date), "d MMM yyyy", { locale: fr })}`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Jours</p>
            <div className="flex gap-1">
              {(assignment.work_days || []).sort().map((d: number) => (
                <Badge key={d} variant="outline" className="text-xs">{DAY_LABELS[d]}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Horaire</p>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Clock className="h-3.5 w-3.5" />
              {assignment.start_time?.slice(0, 5)} - {assignment.end_time?.slice(0, 5)}
            </div>
          </div>
          {assignment.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{assignment.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
