import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, DollarSign, Users, Building2, FileDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportToPdf } from "@/lib/exportPdf";

interface UnitPayroll {
  id: string;
  name: string;
  type: string;
  employeeCount: number;
  totalSalary: number;
  percentage: number;
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-HT", { style: "currency", currency: "HTG", minimumFractionDigits: 0 }).format(amount);
};

export const PayrollReport = () => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [unitPayrolls, setUnitPayrolls] = useState<UnitPayroll[]>([]);
  const [totalSalary, setTotalSalary] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(true);

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
  }, [organizationId]);

  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);

    const [{ data: units }, { data: profiles }, { data: positions }, { data: professorGrades }] = await Promise.all([
      supabase.from("organizational_units").select("id, name, type").eq("organization_id", organizationId),
      supabase.from("profiles").select("id, unit_id, position_id, professor_grade, employee_status").eq("organization_id", organizationId).eq("approval_status", "approved"),
      supabase.from("positions").select("id, salary").eq("organization_id", organizationId),
      supabase.from("professor_grades").select("grade, salary").eq("organization_id", organizationId),
    ]);

    if (!profiles) { setLoading(false); return; }

    const positionMap = new Map((positions || []).map(p => [p.id, p.salary]));
    const gradeMap = new Map((professorGrades || []).map(g => [g.grade, g.salary]));

    const getEmployeeSalary = (profile: any): number => {
      if (profile.position_id && positionMap.has(profile.position_id)) {
        return positionMap.get(profile.position_id)!;
      }
      if (profile.professor_grade && gradeMap.has(profile.professor_grade)) {
        return gradeMap.get(profile.professor_grade)!;
      }
      return 0;
    };

    const activeProfiles = profiles.filter(p => p.employee_status === "actif" || !p.employee_status);
    let grandTotal = 0;

    const uPayrolls: UnitPayroll[] = (units || []).map(u => {
      const unitProfiles = activeProfiles.filter(p => p.unit_id === u.id);
      const unitSalary = unitProfiles.reduce((sum, p) => sum + getEmployeeSalary(p), 0);
      grandTotal += unitSalary;
      return {
        id: u.id,
        name: u.name,
        type: u.type,
        employeeCount: unitProfiles.length,
        totalSalary: unitSalary,
        percentage: 0,
      };
    });

    const unassigned = activeProfiles.filter(p => !p.unit_id);
    if (unassigned.length > 0) {
      const unassignedSalary = unassigned.reduce((sum, p) => sum + getEmployeeSalary(p), 0);
      grandTotal += unassignedSalary;
      uPayrolls.push({ id: "none", name: "Non assigné", type: "-", employeeCount: unassigned.length, totalSalary: unassignedSalary, percentage: 0 });
    }

    uPayrolls.forEach(u => {
      u.percentage = grandTotal > 0 ? (u.totalSalary / grandTotal) * 100 : 0;
    });

    uPayrolls.sort((a, b) => b.totalSalary - a.totalSalary);

    setUnitPayrolls(uPayrolls);
    setTotalSalary(grandTotal);
    setTotalEmployees(activeProfiles.length);
    setLoading(false);
  };

  const exportToCSV = () => {
    const headers = ["Direction/Unité", "Type", "Nb Employés", "Masse Salariale", "% du Total"];
    const rows = unitPayrolls.map(u => [u.name, u.type, u.employeeCount, u.totalSalary, `${u.percentage.toFixed(1)}%`]);
    rows.push(["TOTAL", "", totalEmployees, totalSalary, "100%"]);
    const csv = [`Rapport Masse Salariale - ${organizationName}`, `Date: ${format(new Date(), "dd/MM/yyyy")}`, "", headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-masse-salariale-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  if (loading && unitPayrolls.length === 0) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6" id="payroll-report">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Rapport Masse Salariale par Direction</h2>
          <p className="text-muted-foreground">{organizationName} — {format(new Date(), "dd/MM/yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline"><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button onClick={() => exportToPdf("payroll-report", `rapport-masse-salariale-${format(new Date(), "yyyy-MM-dd")}`)} variant="outline"><FileDown className="h-4 w-4 mr-2" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{totalEmployees}</p><p className="text-xs text-muted-foreground">Employés actifs</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-blue-500" /><div><p className="text-2xl font-bold">{unitPayrolls.filter(u => u.id !== "none").length}</p><p className="text-xs text-muted-foreground">Directions / Unités</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-500" /><div><p className="text-2xl font-bold">{formatCurrency(totalSalary)}</p><p className="text-xs text-muted-foreground">Masse salariale totale</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Masse Salariale par Direction</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unitPayrolls.filter(u => u.totalSalary > 0)} margin={{ top: 10, right: 10, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="totalSalary" name="Masse Salariale" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Répartition en %</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={unitPayrolls.filter(u => u.totalSalary > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="totalSalary" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`} labelLine={false}>
                    {unitPayrolls.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Détails par Direction</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction / Unité</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Nb Employés</TableHead>
                  <TableHead className="text-right">Masse Salariale</TableHead>
                  <TableHead className="text-right">% du Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unitPayrolls.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell><Badge variant="outline">{u.type}</Badge></TableCell>
                    <TableCell className="text-center font-bold">{u.employeeCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(u.totalSalary)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={u.percentage > 20 ? "destructive" : "secondary"}>
                        {u.percentage.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {unitPayrolls.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-center">{totalEmployees}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalSalary)}</TableCell>
                    <TableCell className="text-right"><Badge>100%</Badge></TableCell>
                  </TableRow>
                )}
                {unitPayrolls.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune donnée</TableCell></TableRow>}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
