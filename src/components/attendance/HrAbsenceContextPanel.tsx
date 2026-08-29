import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, CalendarOff, Clock } from "lucide-react";
import { hrProfileName } from "@/hooks/useHrProfile";
import { authorizationTypeLabel, formatFrShortDate, MISSION_ACTIVE_STATUSES } from "@/lib/hr";

interface Props {
  organizationId?: string | null;
  date?: string;
}

/**
 * Contexte RH du jour : agents en congé, en mission ou bénéficiant d'une
 * autorisation approuvée. Ces agents ne doivent jamais être comptés absents.
 */
export const HrAbsenceContextPanel = ({ organizationId, date }: Props) => {
  const day = date ?? new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["hr-absence-context", organizationId, day],
    enabled: !!organizationId,
    queryFn: async () => {
      const [leaves, missions, authorizations] = await Promise.all([
        supabase
          .from("leave_requests")
          .select(
            `id, start_date, end_date, leave_type,
             leave_type_ref:leave_types!leave_requests_leave_type_id_fkey(label),
             employee:profiles!leave_requests_employee_id_fkey(id, full_name, prenom, nom)`
          )
          .eq("organization_id", organizationId!)
          .eq("status", "approved")
          .lte("start_date", day)
          .gte("end_date", day),
        supabase
          .from("missions")
          .select(
            `id, subject, start_date, end_date, status,
             participants:mission_participants(
               profile:profiles!mission_participants_profile_id_fkey(id, full_name, prenom, nom)
             )`
          )
          .eq("organization_id", organizationId!)
          .in("status", MISSION_ACTIVE_STATUSES)
          .lte("start_date", day)
          .gte("end_date", day),
        supabase
          .from("absence_authorizations")
          .select(
            `id, date, authorization_type, start_time, end_time, reason,
             employee:profiles!absence_authorizations_profile_id_fkey(id, full_name, prenom, nom)`
          )
          .eq("organization_id", organizationId!)
          .eq("status", "approved")
          .eq("date", day),
      ]);

      return {
        leaves: leaves.data || [],
        missions: missions.data || [],
        authorizations: authorizations.data || [],
      };
    },
  });

  const total =
    (data?.leaves.length ?? 0) +
    (data?.missions.reduce((sum, m) => sum + (m.participants?.length ?? 0), 0) ?? 0) +
    (data?.authorizations.length ?? 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contexte RH du {formatFrShortDate(day)}</CardTitle>
        <CardDescription>
          Congés, missions et autorisations approuvés : ces agents sont justifiés et ne comptent pas comme absents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune absence justifiée aujourd'hui.</p>
        ) : (
          <>
            {(data?.leaves.length ?? 0) > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarOff className="h-4 w-4" /> En congé ({data!.leaves.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {data!.leaves.map((leave) => (
                    <Badge key={leave.id} variant="secondary">
                      {hrProfileName(leave.employee)} —{" "}
                      {(leave.leave_type_ref as { label?: string } | null)?.label ?? leave.leave_type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(data?.missions.length ?? 0) > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Briefcase className="h-4 w-4" /> En mission
                </div>
                <div className="flex flex-wrap gap-2">
                  {data!.missions.flatMap((mission) =>
                    (mission.participants || []).map((p, index) => (
                      <Badge key={`${mission.id}-${index}`} variant="secondary">
                        {hrProfileName(p.profile)} — {mission.subject}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )}

            {(data?.authorizations.length ?? 0) > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" /> Autorisations ({data!.authorizations.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {data!.authorizations.map((auth) => (
                    <Badge key={auth.id} variant="outline">
                      {hrProfileName(auth.employee)} — {authorizationTypeLabel(auth.authorization_type)}
                      {auth.start_time && auth.end_time
                        ? ` (${auth.start_time.slice(0, 5)}–${auth.end_time.slice(0, 5)})`
                        : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default HrAbsenceContextPanel;
