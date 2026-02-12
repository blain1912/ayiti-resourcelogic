import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Calendar, Download, Users, FileText, FileDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportToPdf } from "@/lib/exportPdf";

interface EmployeeLeaveData {
  id: string;
  name: string;
  unitName: string | null;
  annualTotal: number;
  annualUsed: number;
  annualRemaining: number;
  sickTotal: number;
  sickUsed: number;
  sickRemaining: number;
  pendingRequests: number;
}

const COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6"];

export const LeaveReport = () => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [employeeLeaves, setEmployeeLeaves] = useState<EmployeeLeaveData[]>([]);
  const [loading, setLoading] = useState(true);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).single();
      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
        const { data: org } = await supabase.from("organizations").select("name").eq("id", profile.organization_id).single();
        if (org) setOrganizationName(org.name);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (organizationId) fetchData();
  }, [organizationId, selectedYear]);

  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);

    const [{ data: employees }, { data: balances }, { data: requests }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, unit_id, organizational_units(name)").eq("organization_id", organizationId).eq("approval_status", "approved"),
      supabase.from("leave_balances").select("*").eq("organization_id", organizationId).eq("year", selectedYear),
      supabase.from("leave_requests").select("*").eq("organization_id", organizationId).eq("status", "pending"),
    ]);

    if (!employees) { setLoading(false); return; }

    const data: EmployeeLeaveData[] = employees.map(emp => {
      const empBalances = balances?.filter(b => b.employee_id === emp.id) || [];
      const annual = empBalances.find(b => b.leave_type === "conge_annuel");
      const sick = empBalances.find(b => b.leave_type === "conge_maladie");
      const pending = requests?.filter(r => r.employee_id === emp.id).length || 0;

      return {
        id: emp.id,
        name: emp.full_name || "Sans nom",
        unitName: (emp as any).organizational_units?.name || null,
        annualTotal: annual?.total_days || 20,
        annualUsed: annual?.used_days || 0,
        annualRemaining: (annual?.total_days || 20) - (annual?.used_days || 0),
        sickTotal: sick?.total_days || 15,
        sickUsed: sick?.used_days || 0,
        sickRemaining: (sick?.total_days || 15) - (sick?.used_days || 0),
        pendingRequests: pending,
      };
    });

    data.sort((a, b) => b.annualUsed - a.annualUsed);
    setEmployeeLeaves(data);
    setLoading(false);
  };

  const totalAnnualUsed = employeeLeaves.reduce((s, e) => s + e.annualUsed, 0);
  const totalSickUsed = employeeLeaves.reduce((s, e) => s + e.sickUsed, 0);
  const totalPending = employeeLeaves.reduce((s, e) => s + e.pendingRequests, 0);

  const pieData = [
    { name: "Congés annuels", value: totalAnnualUsed },
    { name: "Congés maladie", value: totalSickUsed },
  ].filter(d => d.value > 0);

  const exportToCSV = () => {
    const headers = ["Employé", "Unité", "Annuel Total", "Annuel Utilisé", "Annuel Restant", "Maladie Total", "Maladie Utilisé", "Maladie Restant", "En attente"];
    const rows = employeeLeaves.map(e => [e.name, e.unitName || "-", e.annualTotal, e.annualUsed, e.annualRemaining, e.sickTotal, e.sickUsed, e.sickRemaining, e.pendingRequests]);
    const csv = [`Rapport des Congés - ${organizationName}`, `Année: ${selectedYear}`, "", headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-conges-${selectedYear}.csv`;
    link.click();
  };

  if (loading && employeeLeaves.length === 0) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6" id="leave-report">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Rapport des Congés</h2>
          <p className="text-muted-foreground">{organizationName} - Année {selectedYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[140px]"><Calendar className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline"><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button onClick={() => exportToPdf("leave-report", `rapport-conges-${selectedYear}`)} variant="outline"><FileDown className="h-4 w-4 mr-2" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{employeeLeaves.length}</p><p className="text-xs text-muted-foreground">Employés</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-green-500" /><div><p className="text-2xl font-bold">{totalAnnualUsed}</p><p className="text-xs text-muted-foreground">Jours annuels utilisés</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-red-500" /><div><p className="text-2xl font-bold">{totalSickUsed}</p><p className="text-xs text-muted-foreground">Jours maladie utilisés</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-yellow-500" /><div><p className="text-2xl font-bold">{totalPending}</p><p className="text-xs text-muted-foreground">Demandes en attente</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Utilisation des Congés par Employé</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeLeaves.slice(0, 15)} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="annualUsed" name="Congés annuels" fill="#22c55e" />
                  <Bar dataKey="sickUsed" name="Congés maladie" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Répartition</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Détails par Employé</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="text-center">Annuel Utilisé</TableHead>
                  <TableHead className="text-center">Annuel Restant</TableHead>
                  <TableHead className="text-center">Maladie Utilisé</TableHead>
                  <TableHead className="text-center">Maladie Restant</TableHead>
                  <TableHead className="text-center">En attente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeLeaves.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.unitName ? <Badge variant="outline">{emp.unitName}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-green-500">{emp.annualUsed}/{emp.annualTotal}</Badge></TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={(emp.annualRemaining / emp.annualTotal) * 100} className="w-16 h-2" />
                        <span className="text-sm">{emp.annualRemaining}j</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Badge variant="destructive">{emp.sickUsed}/{emp.sickTotal}</Badge></TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={(emp.sickRemaining / emp.sickTotal) * 100} className="w-16 h-2" />
                        <span className="text-sm">{emp.sickRemaining}j</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{emp.pendingRequests > 0 ? <Badge className="bg-yellow-500">{emp.pendingRequests}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                  </TableRow>
                ))}
                {employeeLeaves.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune donnée disponible</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
