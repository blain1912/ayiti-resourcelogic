import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Download, FileDown, Users, Briefcase, Upload, Loader2, FileText, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportToPdf } from "@/lib/exportPdf";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmployeePayroll {
  id: string;
  codeBudgetaire: string;
  nif: string;
  nifSecondary: string;
  fullName: string;
  category: string;
  poste: string;
  unite: string;
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

const EditableCell = ({ value, onChange, type = "text", className = "" }: { value: string | number; onChange: (val: string) => void; type?: string; className?: string }) => {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  if (editing) {
    return (
      <Input
        type={type}
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={() => { setEditing(false); onChange(localVal); }}
        onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onChange(localVal); } }}
        className={`h-7 text-xs px-1 ${className}`}
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 inline-block min-w-[2rem] ${className}`}
      title="Cliquer pour modifier"
    >
      {value || "—"}
    </span>
  );
};

const PayrollTable = ({ employees, title, icon, onUpdate }: { employees: EmployeePayroll[]; title: string; icon: React.ReactNode; onUpdate: (id: string, field: keyof EmployeePayroll, value: string) => void }) => {
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
                <TableHead>Code Employé</TableHead>
                <TableHead>NIF</TableHead>
                <TableHead>Nom et Prénom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="text-right">Brut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e, idx) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <EditableCell value={e.codeBudgetaire} onChange={val => onUpdate(e.id, "codeBudgetaire", val)} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <EditableCell value={e.nif} onChange={val => onUpdate(e.id, "nif", val)} />
                  </TableCell>
                  <TableCell className="font-medium">
                    <EditableCell value={e.fullName} onChange={val => onUpdate(e.id, "fullName", val)} />
                  </TableCell>
                  <TableCell className="text-sm">
                    <EditableCell value={e.category} onChange={val => onUpdate(e.id, "category", val)} />
                  </TableCell>
                  <TableCell className="text-sm">
                    <EditableCell value={e.poste} onChange={val => onUpdate(e.id, "poste", val)} />
                  </TableCell>
                  <TableCell className="text-sm">
                    <EditableCell value={e.unite} onChange={val => onUpdate(e.id, "unite", val)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableCell value={e.brut} type="number" onChange={val => onUpdate(e.id, "brut", val)} className="text-right" />
                  </TableCell>
                </TableRow>
              ))}
              {employees.length > 0 && (
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell colSpan={7}>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.brut)}</TableCell>
                </TableRow>
              )}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<{ id: string; file_name: string; file_url: string; created_at: string; period_label: string | null }[]>([]);
  const [periodLabel, setPeriodLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (organizationId) {
      fetchData();
      fetchDocuments();
    }
  }, [organizationId]);

  const fetchDocuments = async () => {
    if (!organizationId) return;
    const { data } = await supabase
      .from("emargement_documents")
      .select("id, file_name, file_url, created_at, period_label")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (data) setDocuments(data);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organizationId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Erreur", description: "Le fichier doit faire moins de 10 Mo", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const fileName = `${organizationId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("emargement-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("emargement-documents")
        .getPublicUrl(uploadData.path);

      const { error: insertError } = await supabase.from("emargement_documents").insert({
        organization_id: organizationId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        period_label: periodLabel || null,
      });

      if (insertError) throw insertError;

      toast({ title: "Succès", description: "Document d'émargement téléversé" });
      setPeriodLabel("");
      setUploadDialogOpen(false);
      fetchDocuments();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Erreur", description: error.message || "Erreur lors du téléversement", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = async (docId: string, fileUrl: string) => {
    try {
      const path = fileUrl.split("/emargement-documents/")[1];
      if (path) {
        await supabase.storage.from("emargement-documents").remove([decodeURIComponent(path)]);
      }
      await supabase.from("emargement_documents").delete().eq("id", docId);
      toast({ title: "Supprimé", description: "Document supprimé" });
      fetchDocuments();
    } catch (error) {
      toast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);

    const [{ data: profiles }, { data: positions }, { data: professorGrades }, { data: units }, { data: categories }] = await Promise.all([
      supabase.from("profiles")
        .select("id, full_name, nif, code_budgetaire, professor_code_budgetaire, position_id, professor_grade, professor_salary, employment_type, employee_status, unit_id, employee_category")
        .eq("organization_id", organizationId)
        .eq("approval_status", "approved"),
      supabase.from("positions").select("id, name, salary, category_id").eq("organization_id", organizationId),
      supabase.from("professor_grades").select("grade, salary").eq("organization_id", organizationId),
      supabase.from("organizational_units").select("id, name").eq("organization_id", organizationId),
      supabase.from("employee_categories").select("id, name").eq("organization_id", organizationId),
    ]);

    if (!profiles) { setLoading(false); return; }

    const positionMap = new Map((positions || []).map(p => [p.id, { name: p.name, salary: p.salary, category_id: (p as any).category_id }]));
    const categoryMap = new Map((categories || []).map((c: any) => [c.id, c.name]));
    const gradeMap = new Map((professorGrades || []).map(g => [g.grade, g.salary]));
    const unitMap = new Map((units || []).map(u => [u.id, u.name]));

    const buildPayrollEntries = (profile: any): EmployeePayroll[] => {
      const entries: EmployeePayroll[] = [];
      const uniteName = profile.unit_id ? (unitMap.get(profile.unit_id) || "") : "";

      // Entry 1: Administrative position
      if (profile.position_id && positionMap.has(profile.position_id)) {
        const pos = positionMap.get(profile.position_id)!;
        const catName = pos.category_id ? (categoryMap.get(pos.category_id) || "") : (profile.employee_category || "");
        const deductions = calculateDeductions(pos.salary);
        entries.push({
          id: profile.id + "-admin",
          codeBudgetaire: profile.code_budgetaire || "",
          nif: profile.nif || "",
          nifSecondary: "",
          fullName: profile.full_name || "Sans nom",
          category: catName,
          poste: pos.name,
          unite: uniteName,
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
          codeBudgetaire: profile.professor_code_budgetaire || "",
          nif: profile.nif || "",
          nifSecondary: "",
          fullName: profile.full_name || "Sans nom",
          category: "Professeur",
          poste: `Professeur${gradeLabel}`,
          unite: uniteName,
          brut: profSalary,
          ...deductions,
          employmentType: profile.employment_type || "permanent",
        });
      }

      // Fallback: no position at all
      if (entries.length === 0) {
        entries.push({
          id: profile.id,
          codeBudgetaire: profile.code_budgetaire || "",
          nif: profile.nif || "",
          nifSecondary: "",
          fullName: profile.full_name || "Sans nom",
          category: profile.employee_category || "Non classé",
          poste: "",
          unite: uniteName,
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

  const handleUpdateEmployee = (list: EmployeePayroll[], setList: React.Dispatch<React.SetStateAction<EmployeePayroll[]>>) =>
    (id: string, field: keyof EmployeePayroll, value: string) => {
      setList(prev => prev.map(e => {
        if (e.id !== id) return e;
        if (field === "brut") {
          const newBrut = parseFloat(value) || 0;
          const deductions = calculateDeductions(newBrut);
          return { ...e, brut: newBrut, ...deductions };
        }
        return { ...e, [field]: value };
      }));
    };

  const exportAllCSV = () => {
    const headers = ["Type", "Code Employé", "NIF", "Nom et Prénom", "Catégorie", "Poste", "Unité", "Brut"];
    const allEmployees = [
      ...permanents.map(e => ["Permanent", e.codeBudgetaire, e.nif, e.fullName, e.category, e.poste, e.unite, e.brut]),
      ...contractuels.map(e => ["Contractuel", e.codeBudgetaire, e.nif, e.fullName, e.category, e.poste, e.unite, e.brut]),
    ];
    const totalBrut = [...permanents, ...contractuels].reduce((s, e) => s + e.brut, 0);
    allEmployees.push(["TOTAL", "", "", "", "", "", "", totalBrut]);

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
        <div className="flex gap-2 flex-wrap">
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default"><Upload className="h-4 w-4 mr-2" />Téléverser un émargement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Téléverser un document d'émargement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="period">Période (optionnel)</Label>
                  <Input
                    id="period"
                    placeholder="Ex: Février 2026"
                    value={periodLabel}
                    onChange={(e) => setPeriodLabel(e.target.value)}
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Téléversement...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Choisir un fichier</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
            onUpdate={handleUpdateEmployee(permanents, setPermanents)}
          />
        </TabsContent>

        <TabsContent value="contractuel">
          <PayrollTable
            employees={contractuels}
            title="Personnel Contractuel — État d'Émargement"
            icon={<Briefcase className="h-5 w-5 text-accent" />}
            onUpdate={handleUpdateEmployee(contractuels, setContractuels)}
          />
        </TabsContent>
      </Tabs>

      {/* Uploaded emargement documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documents d'émargement téléversés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                        {doc.file_name}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {doc.period_label && <span className="mr-2">{doc.period_label} —</span>}
                        {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc.id, doc.file_url)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
