import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Users, Building2, UserCheck, UserX, FileDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportToPdf } from "@/lib/exportPdf";

interface UnitStats {
  id: string;
  name: string;
  type: string;
  totalEmployees: number;
  active: number;
  inactive: number;
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export const StaffingReport = () => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [unitStats, setUnitStats] = useState<UnitStats[]>([]);
  const [genderStats, setGenderStats] = useState<{ name: string; count: number }[]>([]);
  const [statusStats, setStatusStats] = useState<{ name: string; count: number }[]>([]);
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

    const [{ data: units }, { data: profiles }] = await Promise.all([
      supabase.from("organizational_units").select("id, name, type").eq("organization_id", organizationId),
      supabase.from("profiles").select("id, unit_id, sexe, employee_status").eq("organization_id", organizationId).eq("approval_status", "approved"),
    ]);

    if (!profiles) { setLoading(false); return; }

    setTotalEmployees(profiles.length);

    // Unit stats
    const uStats: UnitStats[] = (units || []).map(u => {
      const unitProfiles = profiles.filter(p => p.unit_id === u.id);
      return {
        id: u.id,
        name: u.name,
        type: u.type,
        totalEmployees: unitProfiles.length,
        active: unitProfiles.filter(p => p.employee_status === "actif" || !p.employee_status).length,
        inactive: unitProfiles.filter(p => p.employee_status && p.employee_status !== "actif").length,
      };
    });

    const unassigned = profiles.filter(p => !p.unit_id).length;
    if (unassigned > 0) {
      uStats.push({ id: "none", name: "Non assigné", type: "-", totalEmployees: unassigned, active: unassigned, inactive: 0 });
    }

    uStats.sort((a, b) => b.totalEmployees - a.totalEmployees);
    setUnitStats(uStats);

    // Gender stats
    const gMap: Record<string, number> = {};
    profiles.forEach(p => {
      const g = p.sexe || "Non renseigné";
      gMap[g] = (gMap[g] || 0) + 1;
    });
    setGenderStats(Object.entries(gMap).map(([name, count]) => ({ name: name === "M" ? "Masculin" : name === "F" ? "Féminin" : name, count })));

    // Status stats
    const sMap: Record<string, number> = {};
    profiles.forEach(p => {
      const s = p.employee_status || "active";
      sMap[s] = (sMap[s] || 0) + 1;
    });
    setStatusStats(Object.entries(sMap).map(([name, count]) => ({ name, count })));

    setLoading(false);
  };

  const exportToCSV = () => {
    const headers = ["Unité", "Type", "Total", "Actifs", "Inactifs"];
    const rows = unitStats.map(u => [u.name, u.type, u.totalEmployees, u.active, u.inactive]);
    const csv = [`Rapport des Effectifs - ${organizationName}`, `Date: ${format(new Date(), "dd/MM/yyyy")}`, "", headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-effectifs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  if (loading && unitStats.length === 0) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6" id="staffing-report">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Rapport des Effectifs</h2>
          <p className="text-muted-foreground">{organizationName}</p>
        </div>
        <Button onClick={exportToCSV} variant="outline"><Download className="h-4 w-4 mr-2" />CSV</Button>
        <Button onClick={() => exportToPdf("staffing-report", `rapport-effectifs-${format(new Date(), "yyyy-MM-dd")}`)} variant="outline"><FileDown className="h-4 w-4 mr-2" />PDF</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{totalEmployees}</p><p className="text-xs text-muted-foreground">Total employés</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-blue-500" /><div><p className="text-2xl font-bold">{unitStats.filter(u => u.id !== "none").length}</p><p className="text-xs text-muted-foreground">Unités</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-green-500" /><div><p className="text-2xl font-bold">{unitStats.reduce((s, u) => s + u.active, 0)}</p><p className="text-xs text-muted-foreground">Actifs</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><UserX className="h-5 w-5 text-red-500" /><div><p className="text-2xl font-bold">{unitStats.reduce((s, u) => s + u.inactive, 0)}</p><p className="text-xs text-muted-foreground">Inactifs</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Effectifs par Unité</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unitStats} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="active" name="Actifs" fill="#22c55e" stackId="a" />
                  <Bar dataKey="inactive" name="Inactifs" fill="#ef4444" stackId="a" />
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
        <CardHeader><CardTitle className="text-lg">Détails par Unité</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unité</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Actifs</TableHead>
                  <TableHead className="text-center">Inactifs</TableHead>
                  <TableHead>% du total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unitStats.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell><Badge variant="outline">{u.type}</Badge></TableCell>
                    <TableCell className="text-center font-bold">{u.totalEmployees}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-green-500">{u.active}</Badge></TableCell>
                    <TableCell className="text-center">{u.inactive > 0 ? <Badge variant="destructive">{u.inactive}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                    <TableCell>{totalEmployees > 0 ? `${Math.round((u.totalEmployees / totalEmployees) * 100)}%` : "0%"}</TableCell>
                  </TableRow>
                ))}
                {unitStats.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune donnée</TableCell></TableRow>}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
