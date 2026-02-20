import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInYears } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Users, FileDown, UserCircle, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportToPdf } from "@/lib/exportPdf";
import { ReportAnalysis } from "@/components/reports/ReportAnalysis";

interface EmployeeDemo {
  id: string;
  name: string;
  unitName: string | null;
  sexe: string;
  dateNaissance: string | null;
  age: number | null;
}

const COLORS = ["#3b82f6", "#ec4899", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6"];

export const DemographicsReport = () => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [employees, setEmployees] = useState<EmployeeDemo[]>([]);
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
      .select("id, full_name, unit_id, sexe, date_naissance, organizational_units(name)")
      .eq("organization_id", organizationId)
      .eq("approval_status", "approved");

    if (!profiles) { setLoading(false); return; }

    const now = new Date();
    const data: EmployeeDemo[] = profiles.map(p => {
      const age = p.date_naissance ? differenceInYears(now, new Date(p.date_naissance)) : null;
      return {
        id: p.id,
        name: p.full_name || "Sans nom",
        unitName: (p as any).organizational_units?.name || null,
        sexe: p.sexe || "Non renseigné",
        dateNaissance: p.date_naissance,
        age,
      };
    });

    data.sort((a, b) => (b.age ?? 0) - (a.age ?? 0));
    setEmployees(data);
    setLoading(false);
  };

  const genderStats = [
    { name: "Masculin", count: employees.filter(e => e.sexe === "M").length },
    { name: "Féminin", count: employees.filter(e => e.sexe === "F").length },
    { name: "Non renseigné", count: employees.filter(e => e.sexe !== "M" && e.sexe !== "F").length },
  ].filter(g => g.count > 0);

  const ageBuckets = [
    { name: "< 25 ans", count: employees.filter(e => e.age !== null && e.age < 25).length },
    { name: "25-34 ans", count: employees.filter(e => e.age !== null && e.age >= 25 && e.age < 35).length },
    { name: "35-44 ans", count: employees.filter(e => e.age !== null && e.age >= 35 && e.age < 45).length },
    { name: "45-54 ans", count: employees.filter(e => e.age !== null && e.age >= 45 && e.age < 55).length },
    { name: "55+ ans", count: employees.filter(e => e.age !== null && e.age >= 55).length },
    { name: "Non renseigné", count: employees.filter(e => e.age === null).length },
  ].filter(b => b.count > 0);

  const ageGenderMatrix = [
    { range: "< 25", M: employees.filter(e => e.sexe === "M" && e.age !== null && e.age < 25).length, F: employees.filter(e => e.sexe === "F" && e.age !== null && e.age < 25).length },
    { range: "25-34", M: employees.filter(e => e.sexe === "M" && e.age !== null && e.age >= 25 && e.age < 35).length, F: employees.filter(e => e.sexe === "F" && e.age !== null && e.age >= 25 && e.age < 35).length },
    { range: "35-44", M: employees.filter(e => e.sexe === "M" && e.age !== null && e.age >= 35 && e.age < 45).length, F: employees.filter(e => e.sexe === "F" && e.age !== null && e.age >= 35 && e.age < 45).length },
    { range: "45-54", M: employees.filter(e => e.sexe === "M" && e.age !== null && e.age >= 45 && e.age < 55).length, F: employees.filter(e => e.sexe === "F" && e.age !== null && e.age >= 45 && e.age < 55).length },
    { range: "55+", M: employees.filter(e => e.sexe === "M" && e.age !== null && e.age >= 55).length, F: employees.filter(e => e.sexe === "F" && e.age !== null && e.age >= 55).length },
  ];

  const avgAge = (() => {
    const withAge = employees.filter(e => e.age !== null);
    return withAge.length > 0 ? (withAge.reduce((s, e) => s + (e.age ?? 0), 0) / withAge.length).toFixed(1) : "N/A";
  })();

  const exportToCSV = () => {
    const headers = ["Employé", "Unité", "Sexe", "Date de naissance", "Âge"];
    const rows = employees.map(e => [e.name, e.unitName || "-", e.sexe === "M" ? "Masculin" : e.sexe === "F" ? "Féminin" : e.sexe, e.dateNaissance || "-", e.age !== null ? String(e.age) : "-"]);
    const csv = [`Rapport Démographique - ${organizationName}`, `Date: ${format(new Date(), "dd/MM/yyyy")}`, "", headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-demographique-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  if (loading && employees.length === 0) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6" id="demographics-report">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Rapport Démographique</h2>
          <p className="text-muted-foreground">{organizationName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} variant="outline"><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button onClick={() => exportToPdf("demographics-report", `rapport-demographique-${format(new Date(), "yyyy-MM-dd")}`)} variant="outline"><FileDown className="h-4 w-4 mr-2" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{employees.length}</p><p className="text-xs text-muted-foreground">Total employés</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><UserCircle className="h-5 w-5 text-blue-500" /><div><p className="text-2xl font-bold">{employees.filter(e => e.sexe === "M").length}</p><p className="text-xs text-muted-foreground">Hommes</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><UserCircle className="h-5 w-5 text-pink-500" /><div><p className="text-2xl font-bold">{employees.filter(e => e.sexe === "F").length}</p><p className="text-xs text-muted-foreground">Femmes</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-green-500" /><div><p className="text-2xl font-bold">{avgAge} ans</p><p className="text-xs text-muted-foreground">Âge moyen</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Répartition Âge / Genre</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageGenderMatrix} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="M" name="Masculin" fill="#3b82f6" />
                  <Bar dataKey="F" name="Féminin" fill="#ec4899" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Répartition par Genre</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderStats} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="count" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {genderStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
                  <TableHead>Sexe</TableHead>
                  <TableHead>Âge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp, i) => (
                  <TableRow key={emp.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.unitName ? <Badge variant="outline">{emp.unitName}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>
                      <Badge className={emp.sexe === "M" ? "bg-blue-500" : emp.sexe === "F" ? "bg-pink-500" : "bg-muted text-muted-foreground"}>
                        {emp.sexe === "M" ? "Masculin" : emp.sexe === "F" ? "Féminin" : emp.sexe}
                      </Badge>
                    </TableCell>
                    <TableCell>{emp.age !== null ? `${emp.age} ans` : <span className="text-muted-foreground">Non renseigné</span>}</TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune donnée</TableCell></TableRow>}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      <ReportAnalysis
        reportType="demographics"
        reportData={{
          totalEmployees: employees.length,
          genderStats,
          ageBuckets,
          avgAge,
        }}
        organizationName={organizationName}
      />
    </div>
  );
};
