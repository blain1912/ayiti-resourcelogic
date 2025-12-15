import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, UserCheck, UserX, Clock, Activity, Wifi, Building2 } from "lucide-react";

interface AttendanceEvent {
  id: string;
  profile_id: string;
  status: string;
  time: string | null;
  employee_name: string;
  unit_name: string | null;
  timestamp: Date;
}

interface Stats {
  total: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

interface OrganizationalUnit {
  id: string;
  name: string;
  type: string;
}

export const RealtimeAttendanceDashboard = () => {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, absent: 0, late: 0, rate: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("all");

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
        await fetchUnits(profile.organization_id);
        await fetchInitialData(profile.organization_id, "all");
        setupRealtimeSubscription(profile.organization_id);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (organizationId) {
      fetchInitialData(organizationId, selectedUnitId);
    }
  }, [selectedUnitId]);

  const fetchUnits = async (orgId: string) => {
    const { data } = await supabase
      .from("organizational_units")
      .select("id, name, type")
      .eq("organization_id", orgId)
      .order("type")
      .order("name");
    
    if (data) {
      setUnits(data);
    }
  };

  const fetchInitialData = async (orgId: string, unitId: string) => {
    const today = format(new Date(), "yyyy-MM-dd");

    // Fetch total employees (filtered by unit if selected)
    let employeeQuery = supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("approval_status", "approved");
    
    if (unitId !== "all") {
      employeeQuery = employeeQuery.eq("unit_id", unitId);
    }
    
    const { count: totalEmployees } = await employeeQuery;

    // Fetch today's attendance with employee names and unit info
    let attendanceQuery = supabase
      .from("attendance")
      .select(`
        id,
        profile_id,
        status,
        time,
        created_at,
        profiles!attendance_profile_id_fkey(full_name, unit_id, organizational_units(name))
      `)
      .eq("organization_id", orgId)
      .eq("date", today)
      .order("created_at", { ascending: false });

    const { data: attendanceData } = await attendanceQuery;

    if (attendanceData) {
      // Filter by unit if selected
      let filteredData = attendanceData;
      if (unitId !== "all") {
        filteredData = attendanceData.filter((a: any) => a.profiles?.unit_id === unitId);
      }

      const recentEvents = filteredData.slice(0, 20).map((a: any) => ({
        id: a.id,
        profile_id: a.profile_id,
        status: a.status,
        time: a.time,
        employee_name: a.profiles?.full_name || "Employé",
        unit_name: a.profiles?.organizational_units?.name || null,
        timestamp: new Date(a.created_at),
      }));
      setEvents(recentEvents);

      const present = filteredData.filter((a: any) => a.status === "present").length;
      const absent = filteredData.filter((a: any) => a.status === "absent").length;
      const late = filteredData.filter((a: any) => a.status === "late").length;
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
              // Fetch employee name and unit
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, unit_id, organizational_units(name)")
                .eq("id", newAttendance.profile_id)
                .single();

              const newEvent: AttendanceEvent = {
                id: newAttendance.id,
                profile_id: newAttendance.profile_id,
                status: newAttendance.status,
                time: newAttendance.time,
                employee_name: profile?.full_name || "Employé",
                unit_name: (profile as any)?.organizational_units?.name || null,
                timestamp: new Date(),
              };

              // Only add to events if matches selected filter
              setEvents((prev) => {
                if (selectedUnitId !== "all" && profile?.unit_id !== selectedUnitId) {
                  return prev;
                }
                const filtered = prev.filter((e) => e.profile_id !== newAttendance.profile_id);
                return [newEvent, ...filtered].slice(0, 20);
              });

              // Update stats
              await fetchInitialData(orgId, selectedUnitId);
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
      {/* Header with Connection Status and Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Tableau de Bord en Temps Réel</h2>
          <p className="text-muted-foreground capitalize">{today}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Unit Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrer par unité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les unités</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <Wifi className={`h-4 w-4 ${isConnected ? "text-green-500" : "text-muted-foreground"}`} />
            <span className={`text-sm ${isConnected ? "text-green-500" : "text-muted-foreground"}`}>
              {isConnected ? "Connecté" : "Connexion..."}
            </span>
          </div>
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
                          {event.unit_name && <span className="mr-2">{event.unit_name}</span>}
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
