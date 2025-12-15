import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, UserCheck, UserX, Clock, Activity, Wifi } from "lucide-react";

interface AttendanceEvent {
  id: string;
  profile_id: string;
  status: string;
  time: string | null;
  employee_name: string;
  timestamp: Date;
}

interface Stats {
  total: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

export const RealtimeAttendanceDashboard = () => {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, absent: 0, late: 0, rate: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
        await fetchInitialData(profile.organization_id);
        setupRealtimeSubscription(profile.organization_id);
      }
    };

    init();
  }, []);

  const fetchInitialData = async (orgId: string) => {
    const today = format(new Date(), "yyyy-MM-dd");

    // Fetch total employees
    const { count: totalEmployees } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("approval_status", "approved");

    // Fetch today's attendance with employee names
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select(`
        id,
        profile_id,
        status,
        time,
        created_at,
        profiles!attendance_profile_id_fkey(full_name)
      `)
      .eq("organization_id", orgId)
      .eq("date", today)
      .order("created_at", { ascending: false });

    if (attendanceData) {
      const recentEvents = attendanceData.slice(0, 20).map((a: any) => ({
        id: a.id,
        profile_id: a.profile_id,
        status: a.status,
        time: a.time,
        employee_name: a.profiles?.full_name || "Employé",
        timestamp: new Date(a.created_at),
      }));
      setEvents(recentEvents);

      const present = attendanceData.filter((a: any) => a.status === "present").length;
      const absent = attendanceData.filter((a: any) => a.status === "absent").length;
      const late = attendanceData.filter((a: any) => a.status === "late").length;
      const total = totalEmployees || 0;

      setStats({
        total,
        present,
        absent,
        late,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      });
    }
  };

  const setupRealtimeSubscription = (orgId: string) => {
    const channel = supabase
      .channel("attendance-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `organization_id=eq.${orgId}`,
        },
        async (payload) => {
          console.log("Realtime event:", payload);
          
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newAttendance = payload.new as any;
            const today = format(new Date(), "yyyy-MM-dd");
            
            if (newAttendance.date === today) {
              // Fetch employee name
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", newAttendance.profile_id)
                .single();

              const newEvent: AttendanceEvent = {
                id: newAttendance.id,
                profile_id: newAttendance.profile_id,
                status: newAttendance.status,
                time: newAttendance.time,
                employee_name: profile?.full_name || "Employé",
                timestamp: new Date(),
              };

              setEvents((prev) => {
                // Remove existing event for same profile if exists
                const filtered = prev.filter((e) => e.profile_id !== newAttendance.profile_id);
                return [newEvent, ...filtered].slice(0, 20);
              });

              // Update stats
              await fetchInitialData(orgId);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-500">Présent</Badge>;
      case "absent":
        return <Badge variant="destructive">Absent</Badge>;
      case "late":
        return <Badge className="bg-yellow-500">En retard</Badge>;
      case "leave":
        return <Badge variant="secondary">Congé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tableau de Bord en Temps Réel</h2>
          <p className="text-muted-foreground capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Wifi className={`h-4 w-4 ${isConnected ? "text-green-500" : "text-muted-foreground"}`} />
          <span className={`text-sm ${isConnected ? "text-green-500" : "text-muted-foreground"}`}>
            {isConnected ? "Connecté en temps réel" : "Connexion..."}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total employés</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/10">
              <UserCheck className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.present}</p>
              <p className="text-xs text-muted-foreground">Présents</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-500/10">
              <UserX className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">Absents</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rate}%</p>
              <p className="text-xs text-muted-foreground">Taux de présence</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary animate-pulse" />
            Activité en Direct
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun pointage aujourd'hui</p>
                <p className="text-sm">Les pointages apparaîtront ici en temps réel</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event, index) => (
                  <div
                    key={event.id}
                    className={`flex items-center justify-between p-3 rounded-lg border bg-card transition-all ${
                      index === 0 ? "ring-2 ring-primary/20 animate-pulse" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {event.employee_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{event.employee_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.time ? format(new Date(`2000-01-01T${event.time}`), "HH:mm") : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(event.status)}
                      <span className="text-xs text-muted-foreground">
                        {format(event.timestamp, "HH:mm:ss")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
