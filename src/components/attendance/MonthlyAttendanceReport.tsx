import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, subMonths, getYear, getMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, UserCheck, UserX, Clock, TrendingUp, Calendar, Download, Building2 } from "lucide-react";

interface EmployeeAttendance {
  id: string;
  name: string;
  unitName: string | null;
  present: number;
  absent: number;
  late: number;
  leave: number;
  rate: number;
}

interface DailyStats {
  date: string;
  day: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

interface MonthlyStats {
  totalEmployees: number;
  workingDays: number;
  avgPresenceRate: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalLeave: number;
}

interface OrganizationalUnit {
  id: string;
  name: string;
}

const COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6"];

export const MonthlyAttendanceReport = () => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedUnitId, setSelectedUnitId] = useState<string>("all");
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [employeeAttendance, setEmployeeAttendance] = useState<EmployeeAttendance[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: fr }),
      date,
    };
  });

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
        
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", profile.organization_id)
          .single();
        
        if (org) setOrganizationName(org.name);

        const { data: unitsData } = await supabase
          .from("organizational_units")
          .select("id, name")
          .eq("organization_id", profile.organization_id)
          .order("name");

        if (unitsData) setUnits(unitsData);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (organizationId) {
      fetchReportData();
    }
  }, [organizationId, selectedMonth, selectedUnitId]);

  const fetchReportData = async () => {
    if (!organizationId) return;
    setLoading(true);

    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const startDate = format(monthStart, "yyyy-MM-dd");
    const endDate = format(monthEnd, "yyyy-MM-dd");

    // Calculate working days (exclude weekends)
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const workingDays = allDays.filter(day => !isWeekend(day)).length;

    // Fetch employees
    let employeesQuery = supabase
      .from("profiles")
      .select("id, full_name, unit_id, organizational_units(name)")
      .eq("organization_id", organizationId)
      .eq("approval_status", "approved");

    if (selectedUnitId !== "all") {
      employeesQuery = employeesQuery.eq("unit_id", selectedUnitId);
    }

    const { data: employees } = await employeesQuery;

    // Fetch attendance for the month
    const { data: attendance } = await supabase
      .from("attendance")
      .select("profile_id, date, status")
      .eq("organization_id", organizationId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (!employees || !attendance) {
      setLoading(false);
      return;
    }

    // Filter attendance by unit if selected
    const employeeIds = new Set(employees.map(e => e.id));
    const filteredAttendance = attendance.filter(a => employeeIds.has(a.profile_id));

    // Calculate employee-level stats
    const employeeStats: EmployeeAttendance[] = employees.map(emp => {
      const empAttendance = filteredAttendance.filter(a => a.profile_id === emp.id);
      const present = empAttendance.filter(a => a.status === "present").length;
      const absent = empAttendance.filter(a => a.status === "absent").length;
      const late = empAttendance.filter(a => a.status === "late").length;
      const leave = empAttendance.filter(a => ["leave", "sick", "permission"].includes(a.status)).length;
      const totalDays = present + absent + late + leave;

      return {
        id: emp.id,
        name: emp.full_name || "Sans nom",
        unitName: (emp as any).organizational_units?.name || null,
        present,
        absent,
        late,
        leave,
        rate: totalDays > 0 ? Math.round(((present + late) / workingDays) * 100) : 0,
      };
    });

    // Sort by attendance rate descending
    employeeStats.sort((a, b) => b.rate - a.rate);
    setEmployeeAttendance(employeeStats);

    // Calculate daily stats
    const dailyData: DailyStats[] = allDays
      .filter(day => !isWeekend(day))
      .map(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayAttendance = filteredAttendance.filter(a => a.date === dateStr);
        
        return {
          date: dateStr,
          day: format(day, "EEE d", { locale: fr }),
          present: dayAttendance.filter(a => a.status === "present").length,
          absent: dayAttendance.filter(a => a.status === "absent").length,
          late: dayAttendance.filter(a => a.status === "late").length,
          leave: dayAttendance.filter(a => ["leave", "sick", "permission"].includes(a.status)).length,
        };
      });

    setDailyStats(dailyData);

    // Calculate monthly totals
    const totalPresent = employeeStats.reduce((sum, e) => sum + e.present, 0);
    const totalAbsent = employeeStats.reduce((sum, e) => sum + e.absent, 0);
    const totalLate = employeeStats.reduce((sum, e) => sum + e.late, 0);
    const totalLeave = employeeStats.reduce((sum, e) => sum + e.leave, 0);
    const totalPossible = employees.length * workingDays;
    const avgRate = totalPossible > 0 ? Math.round(((totalPresent + totalLate) / totalPossible) * 100) : 0;

    setMonthlyStats({
      totalEmployees: employees.length,
      workingDays,
      avgPresenceRate: avgRate,
      totalPresent,
      totalAbsent,
      totalLate,
      totalLeave,
    });

    setLoading(false);
  };

  const handleMonthChange = (value: string) => {
    const selected = months.find(m => m.value === value);
    if (selected) setSelectedMonth(selected.date);
  };

  const pieData = monthlyStats ? [
    { name: "Présents", value: monthlyStats.totalPresent },
    { name: "Absents", value: monthlyStats.totalAbsent },
    { name: "En retard", value: monthlyStats.totalLate },
    { name: "Congés", value: monthlyStats.totalLeave },
  ].filter(d => d.value > 0) : [];

  const exportToCSV = () => {
    const headers = ["Employé", "Unité", "Présent", "Absent", "En retard", "Congé", "Taux (%)"];
    const rows = employeeAttendance.map(e => [
      e.name,
      e.unitName || "-",
      e.present,
      e.absent,
      e.late,
      e.leave,
      e.rate,
    ]);

    const csvContent = [
      `Rapport de présence - ${organizationName}`,
      `Période: ${format(selectedMonth, "MMMM yyyy", { locale: fr })}`,
      "",
      headers.join(","),
      ...rows.map(r => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-presence-${format(selectedMonth, "yyyy-MM")}.csv`;
    link.click();
  };

  if (loading && !monthlyStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Rapport de Présence Mensuel</h2>
          <p className="text-muted-foreground">{organizationName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={format(selectedMonth, "yyyy-MM")} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value} className="capitalize">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
            <SelectTrigger className="w-[180px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrer par unité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les unités</SelectItem>
              {units.map(unit => (
                <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {monthlyStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{monthlyStats.totalEmployees}</p>
                  <p className="text-xs text-muted-foreground">Employés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{monthlyStats.workingDays}</p>
                  <p className="text-xs text-muted-foreground">Jours ouvrés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{monthlyStats.avgPresenceRate}%</p>
                  <p className="text-xs text-muted-foreground">Taux moyen</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{monthlyStats.totalPresent}</p>
                  <p className="text-xs text-muted-foreground">Présences</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{monthlyStats.totalAbsent}</p>
                  <p className="text-xs text-muted-foreground">Absences</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{monthlyStats.totalLate}</p>
                  <p className="text-xs text-muted-foreground">Retards</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Attendance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Présences Quotidiennes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10 }}
                    interval={Math.floor(dailyStats.length / 10)}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="present" name="Présents" fill="#22c55e" stackId="a" />
                  <Bar dataKey="late" name="En retard" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="absent" name="Absents" fill="#ef4444" stackId="a" />
                  <Bar dataKey="leave" name="Congés" fill="#3b82f6" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition Globale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Détails par Employé</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="text-center">Présent</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Retard</TableHead>
                  <TableHead className="text-center">Congé</TableHead>
                  <TableHead>Taux de Présence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeAttendance.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>
                      {emp.unitName ? (
                        <Badge variant="outline">{emp.unitName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-500">{emp.present}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive">{emp.absent}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-yellow-500">{emp.late}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{emp.leave}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={emp.rate} className="w-20 h-2" />
                        <span className={`text-sm font-medium ${
                          emp.rate >= 80 ? "text-green-500" : 
                          emp.rate >= 60 ? "text-yellow-500" : "text-red-500"
                        }`}>
                          {emp.rate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {employeeAttendance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucune donnée disponible pour cette période
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
