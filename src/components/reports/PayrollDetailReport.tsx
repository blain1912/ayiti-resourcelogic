import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Download, FileDown, Users, Briefcase } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportToPdf } from "@/lib/exportPdf";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmployeePayroll {
  id: string;
  nif: string;
  nifSecondary: string;
  fullName: string;
  poste: string;
  brut: number;
  isr: number;
  casFdu: number;
  pension: number;
  cfgdct: number;
  net: number;
  employmentType: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-HT", { style: "currency", currency: "HTG", minimumFractionDigits: 2 }).format(amount);

// Calcul ISR Haïtien (mensuel) basé sur les tranches observées
const calculateISR = (brut: number): number => {
  if (brut <= 10000) return 0;
  let isr = 0;
  if (brut > 10000) {
    const tranche15 = Math.min(brut, 40000) - 10000;
    isr += tranche15 * 0.15;
  }
  if (brut > 40000) {
    isr += (brut - 40000) * 0.25;
  }
  return Math.round(isr * 100) / 100;
};

const calculateDeductions = (brut: number) => {
  const casFdu = brut * 0.02;
  const pension = brut * 0.08;
  const cfgdct = brut * 0.01;
  const isr = calculateISR(brut);
  const net = brut - isr - casFdu - pension - cfgdct;
  return { isr, casFdu, pension, cfgdct, net: Math.round(net * 100) / 100 };
};

const PayrollTable = ({ employees, title, icon }: { employees: EmployeePayroll[]; title: string; icon: React.ReactNode }) => {
  const totals = employees.reduce(
    (acc, e) => ({
      brut: acc.brut + e.brut,
      isr: acc.isr + e.isr,
      casFdu: acc.casFdu + e.casFdu,
      pension: acc.pension + e.pension,
      cfgdct: acc.cfgdct + e.cfgdct,
      net: acc.net + e.net,
    }),
    { brut: 0, isr: 0, casFdu: 0, pension: 0, cfgdct: 0, net: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-sm">
            {employees.length} employé(s)
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Code / NIF</TableHead>
                <TableHead>Nom et Prénom</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead className="text-right">Brut</TableHead>
                <TableHead className="text-right">ISR</TableHead>
                <TableHead className="text-right">CAS/FDU</TableHead>
                <TableHead className="text-right">Pension</TableHead>
                <TableHead className="text-right">CFGDCT</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e, idx) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <div>{e.nif || "—"}</div>
                    {e.nifSecondary && <div className="text-muted-foreground mt-1">{e.nifSecondary}</div>}
                  </TableCell>
                  <TableCell className="font-medium">{e.fullName}</TableCell>
                  <TableCell className="text-sm">
                    {e.poste ? e.poste.split(" / ").map((p, i) => (
                      <div key={i} className={i > 0 ? "text-muted-foreground mt-1" : ""}>{p}</div>
                    )) : "—"}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(e.brut)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(e.isr)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(e.casFdu)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(e.pension)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(e.cfgdct)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(e.net)}</TableCell>
                </TableRow>
              ))}
              {employees.length > 0 && (
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell colSpan={4}>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.brut)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.isr)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.casFdu)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.pension)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.cfgdct)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.net)}</TableCell>
                </TableRow>
              )}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Aucun employé dans cette catégorie
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export const PayrollDetailReport = () => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [permanents, setPermanents] = useState<EmployeePayroll[]>([]);
  const [contractuels, setContractuels] = useState<EmployeePayroll[]>([]);
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

    const [{ data: profiles }, { data: positions }, { data: professorGrades }, { data: units }] = await Promise.all([
      supabase.from("profiles")
        .select("id, full_name, nif, code_budgetaire, professor_code_budgetaire, position_id, professor_grade, professor_salary, employment_type, employee_status, unit_id")
        .eq("organization_id", organizationId)
        .eq("approval_status", "approved"),
      supabase.from("positions").select("id, name, salary").eq("organization_id", organizationId),
      supabase.from("professor_grades").select("grade, salary").eq("organization_id", organizationId),
      supabase.from("organizational_units").select("id, name").eq("organization_id", organizationId),
    ]);

    if (!profiles) { setLoading(false); return; }

    const positionMap = new Map((positions || []).map(p => [p.id, { name: p.name, salary: p.salary }]));
    const gradeMap = new Map((professorGrades || []).map(g => [g.grade, g.salary]));

    const buildPayrollEntries = (profile: any): EmployeePayroll[] => {
      const entries: EmployeePayroll[] = [];

      // Entry 1: Administrative position
      if (profile.position_id && positionMap.has(profile.position_id)) {
        const pos = positionMap.get(profile.position_id)!;
        const deductions = calculateDeductions(pos.salary);
        entries.push({
          id: profile.id + "-admin",
          nif: [profile.code_budgetaire, profile.nif].filter(Boolean).join(" / ") || "—",
          nifSecondary: "",
          fullName: profile.full_name || "Sans nom",
          poste: pos.name,
          brut: pos.salary,
          ...deductions,
          employmentType: profile.employment_type || "permanent",
        });
      }

      // Entry 2: Professor position
      const hasProfessorRole = profile.professor_salary || profile.professor_code_budgetaire || (profile.professor_grade && gradeMap.has(profile.professor_grade));
      if (hasProfessorRole) {
        const profSalary = profile.professor_salary || (profile.professor_grade ? gradeMap.get(profile.professor_grade) || 0 : 0);
        const deductions = calculateDeductions(profSalary);
        const gradeLabel = profile.professor_grade ? ` (${profile.professor_grade})` : "";
        entries.push({
          id: profile.id + "-prof",
          nif: [profile.professor_code_budgetaire, profile.nif].filter(Boolean).join(" / ") || "—",
          nifSecondary: "",
          fullName: profile.full_name || "Sans nom",
          poste: `Professeur${gradeLabel}`,
          brut: profSalary,
          ...deductions,
          employmentType: profile.employment_type || "permanent",
        });
      }

      // Fallback: no position at all
      if (entries.length === 0) {
        entries.push({
          id: profile.id,
          nif: [profile.code_budgetaire, profile.nif].filter(Boolean).join(" / ") || "—",
          nifSecondary: "",
          fullName: profile.full_name || "Sans nom",
          poste: "",
          brut: 0,
          isr: 0, casFdu: 0, pension: 0, cfgdct: 0, net: 0,
          employmentType: profile.employment_type || "permanent",
        });
      }

      return entries;
    };

    const activeProfiles = profiles.filter(p => p.employee_status === "actif" || !p.employee_status);
    const perms: EmployeePayroll[] = [];
    const conts: EmployeePayroll[] = [];

    activeProfiles.forEach(p => {
      const entries = buildPayrollEntries(p);
      entries.forEach(payroll => {
        if (payroll.brut === 0) return;
        if (p.employment_type === "contractuel") {
          conts.push(payroll);
        } else {
          perms.push(payroll);
        }
      });
    });

    perms.sort((a, b) => a.fullName.localeCompare(b.fullName));
    conts.sort((a, b) => a.fullName.localeCompare(b.fullName));

    setPermanents(perms);
    setContractuels(conts);
    setLoading(false);
  };

  const exportAllCSV = () => {
    const headers = ["Type", "NIF", "Nom et Prénom", "Poste", "Brut", "ISR", "CAS/FDU", "Pension", "CFGDCT", "Net"];
    const allEmployees = [
      ...permanents.map(e => ["Permanent", e.nif, e.fullName, e.poste, e.brut, e.isr, e.casFdu, e.pension, e.cfgdct, e.net]),
      ...contractuels.map(e => ["Contractuel", e.nif, e.fullName, e.poste, e.brut, e.isr, e.casFdu, e.pension, e.cfgdct, e.net]),
    ];
    const totalBrut = [...permanents, ...contractuels].reduce((s, e) => s + e.brut, 0);
    const totalNet = [...permanents, ...contractuels].reduce((s, e) => s + e.net, 0);
    allEmployees.push(["TOTAL", "", "", "", totalBrut, "", "", "", "", totalNet]);

    const csv = [
      `État d'Émargement - ${organizationName}`,
      `Date: ${format(new Date(), "dd/MM/yyyy")}`,
      "",
      headers.join(","),
      ...allEmployees.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `etat-emargement-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const grandTotalBrut = [...permanents, ...contractuels].reduce((s, e) => s + e.brut, 0);
  const grandTotalNet = [...permanents, ...contractuels].reduce((s, e) => s + e.net, 0);

  if (loading && permanents.length === 0 && contractuels.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="payroll-detail-report">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">État d'Émargement</h2>
          <p className="text-muted-foreground">{organizationName} — {format(new Date(), "dd/MM/yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportAllCSV} variant="outline"><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button onClick={() => exportToPdf("payroll-detail-report", `etat-emargement-${format(new Date(), "yyyy-MM-dd")}`)} variant="outline"><FileDown className="h-4 w-4 mr-2" />PDF</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{permanents.length}</p>
                <p className="text-xs text-muted-foreground">Permanents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-accent" />
              <div>
                <p className="text-2xl font-bold">{contractuels.length}</p>
                <p className="text-xs text-muted-foreground">Contractuels</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-lg font-bold">{formatCurrency(grandTotalBrut)}</p>
              <p className="text-xs text-muted-foreground">Masse brute totale</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-lg font-bold text-primary">{formatCurrency(grandTotalNet)}</p>
              <p className="text-xs text-muted-foreground">Masse nette totale</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for permanent vs contractual */}
      <Tabs defaultValue="permanent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="permanent" className="gap-2">
            <Users className="h-4 w-4" />
            Permanents ({permanents.length})
          </TabsTrigger>
          <TabsTrigger value="contractuel" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Contractuels ({contractuels.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permanent">
          <PayrollTable
            employees={permanents}
            title="Personnel Permanent — État d'Émargement"
            icon={<Users className="h-5 w-5 text-primary" />}
          />
        </TabsContent>

        <TabsContent value="contractuel">
          <PayrollTable
            employees={contractuels}
            title="Personnel Contractuel — État d'Émargement"
            icon={<Briefcase className="h-5 w-5 text-accent" />}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
