import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Users, Award, TrendingUp, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmployeeSeniority {
  id: string;
  name: string;
  unitName: string | null;
  dateEntree: string | null;
  years: number;
  months: number;
  label: string;
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export const SeniorityReport = () => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [employees, setEmployees] = useState<EmployeeSeniority[]>([]);
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

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, unit_id, date_entree_fonction, organizational_units(name)")
      .eq("organization_id", organizationId)
      .eq("approval_status", "approved");

    if (!profiles) { setLoading(false); return; }

    const now = new Date();
    const data: EmployeeSeniority[] = profiles.map(p => {
      const dateEntree = p.date_entree_fonction;
      const years = dateEntree ? differenceInYears(now, new Date(dateEntree)) : 0;
      const totalMonths = dateEntree ? differenceInMonths(now, new Date(dateEntree)) : 0;
      const months = totalMonths % 12;

      return {
        id: p.id,
        name: p.full_name || "Sans nom",
        unitName: (p as any).organizational_units?.name || null,
        dateEntree,
        years,
        months,
        label: dateEntree ? `${years} an${years > 1 ? "s" : ""} ${months} mois` : "Non renseigné",
      };
    });

    data.sort((a, b) => b.years * 12 + b.months - (a.years * 12 + a.months));
    setEmployees(data);
    setLoading(false);
  };

  const seniorityBuckets = [
    { name: "< 1 an", count: employees.filter(e => e.years < 1).length },
    { name: "1-3 ans", count: employees.filter(e => e.years >= 1 && e.years < 3).length },
    { name: "3-5 ans", count: employees.filter(e => e.years >= 3 && e.years < 5).length },
    { name: "5-10 ans", count: employees.filter(e => e.years >= 5 && e.years < 10).length },
    { name: "10+ ans", count: employees.filter(e => e.years >= 10).length },
  ];

  const avgYears = employees.length > 0 ? (employees.reduce((s, e) => s + e.years + e.months / 12, 0) / employees.length).toFixed(1) : "0";
  const maxSeniority = employees.length > 0 ? employees[0] : null;

  const exportToCSV = () => {
    const headers = ["Employé", "Unité", "Date d'entrée", "Ancienneté"];
    const rows = employees.map(e => [e.name, e.unitName || "-", e.dateEntree ? format(new Date(e.dateEntree), "dd/MM/yyyy") : "-", e.label]);
    const csv = [`Rapport d'Ancienneté - ${organizationName}`, `Date: ${format(new Date(), "dd/MM/yyyy")}`, "", headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-anciennete-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  if (loading && employees.length === 0) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6" id="seniority-report">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Rapport d'Ancienneté</h2>
          <p className="text-muted-foreground">{organizationName}</p>
        </div>
        <Button onClick={exportToCSV} variant="outline"><Download className="h-4 w-4 mr-2" />CSV</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{employees.length}</p><p className="text-xs text-muted-foreground">Employés</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" /><div><p className="text-2xl font-bold">{avgYears} ans</p><p className="text-xs text-muted-foreground">Ancienneté moyenne</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Award className="h-5 w-5 text-yellow-500" /><div><p className="text-lg font-bold truncate">{maxSeniority?.name || "-"}</p><p className="text-xs text-muted-foreground">Plus ancien: {maxSeniority?.label || "-"}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-blue-500" /><div><p className="text-2xl font-bold">{employees.filter(e => !e.dateEntree).length}</p><p className="text-xs text-muted-foreground">Date non renseignée</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Répartition par Tranche</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seniorityBuckets}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="count" name="Employés" fill="hsl(var(--primary))">
                    {seniorityBuckets.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={seniorityBuckets.filter(b => b.count > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="count" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {seniorityBuckets.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Liste des Employés</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Employé</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Date d'entrée</TableHead>
                  <TableHead>Ancienneté</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp, i) => (
                  <TableRow key={emp.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.unitName ? <Badge variant="outline">{emp.unitName}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{emp.dateEntree ? format(new Date(emp.dateEntree), "dd MMM yyyy", { locale: fr }) : <span className="text-muted-foreground">Non renseigné</span>}</TableCell>
                    <TableCell>
                      <Badge className={emp.years >= 10 ? "bg-green-500" : emp.years >= 5 ? "bg-blue-500" : emp.years >= 1 ? "bg-yellow-500" : "bg-muted text-muted-foreground"}>
                        {emp.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune donnée</TableCell></TableRow>}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
