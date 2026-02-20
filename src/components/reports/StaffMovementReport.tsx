import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Download, ArrowRightLeft, UserCheck, UserMinus, ArrowUpCircle, Send, Plus, Trash2, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportToPdf } from "@/lib/exportPdf";
import { ReportAnalysis } from "@/components/reports/ReportAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

type MovementType = "affectation" | "promotion" | "detachement" | "mise_a_disposition" | "transfert" | "reintegration";

interface StaffMovement {
  id: string;
  employeeName: string;
  employeeCode: string;
  movementType: MovementType;
  fromUnit: string;
  toUnit: string;
  fromPosition: string;
  toPosition: string;
  effectiveDate: string;
  decisionReference: string;
  notes: string;
}

const movementTypeLabels: Record<MovementType, string> = {
  affectation: "Affectation",
  promotion: "Promotion",
  detachement: "Détachement",
  mise_a_disposition: "Mise à disposition",
  transfert: "Transfert",
  reintegration: "Réintégration",
};

const movementTypeColors: Record<MovementType, string> = {
  affectation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  promotion: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  detachement: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  mise_a_disposition: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  transfert: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  reintegration: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

const movementTypeIcons: Record<MovementType, React.ReactNode> = {
  affectation: <ArrowRightLeft className="h-4 w-4" />,
  promotion: <ArrowUpCircle className="h-4 w-4" />,
  detachement: <Send className="h-4 w-4" />,
  mise_a_disposition: <UserMinus className="h-4 w-4" />,
  transfert: <ArrowRightLeft className="h-4 w-4" />,
  reintegration: <UserCheck className="h-4 w-4" />,
};

export const StaffMovementReport = () => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [movements, setMovements] = useState<StaffMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; code_budgetaire: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    employeeId: "",
    movementType: "affectation" as MovementType,
    fromUnit: "",
    toUnit: "",
    fromPosition: "",
    toPosition: "",
    effectiveDate: format(new Date(), "yyyy-MM-dd"),
    decisionReference: "",
    notes: "",
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).single();
      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (organizationId) {
      fetchReferenceData();
      // Load from localStorage
      const stored = localStorage.getItem(`staff_movements_${organizationId}`);
      if (stored) {
        setMovements(JSON.parse(stored));
      }
      setLoading(false);
    }
  }, [organizationId]);

  const fetchReferenceData = async () => {
    if (!organizationId) return;
    const [{ data: profilesData }, { data: unitsData }, { data: positionsData }] = await Promise.all([
      supabase.from("profiles")
        .select("id, full_name, code_budgetaire")
        .eq("organization_id", organizationId)
        .eq("approval_status", "approved")
        .order("full_name"),
      supabase.from("organizational_units")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name"),
      supabase.from("positions")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name"),
    ]);
    setProfiles((profilesData || []).map(p => ({ id: p.id, full_name: p.full_name || "", code_budgetaire: p.code_budgetaire || "" })));
    setUnits(unitsData || []);
    setPositions(positionsData || []);
  };

  const saveMovements = (updated: StaffMovement[]) => {
    setMovements(updated);
    if (organizationId) {
      localStorage.setItem(`staff_movements_${organizationId}`, JSON.stringify(updated));
    }
  };

  const handleAddMovement = () => {
    const selectedProfile = profiles.find(p => p.id === formData.employeeId);
    if (!selectedProfile) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un employé", variant: "destructive" });
      return;
    }

    const newMovement: StaffMovement = {
      id: crypto.randomUUID(),
      employeeName: selectedProfile.full_name,
      employeeCode: selectedProfile.code_budgetaire,
      movementType: formData.movementType,
      fromUnit: formData.fromUnit,
      toUnit: formData.toUnit,
      fromPosition: formData.fromPosition,
      toPosition: formData.toPosition,
      effectiveDate: formData.effectiveDate,
      decisionReference: formData.decisionReference,
      notes: formData.notes,
    };

    const updated = [newMovement, ...movements];
    saveMovements(updated);
    setDialogOpen(false);
    setFormData({
      employeeId: "",
      movementType: "affectation",
      fromUnit: "",
      toUnit: "",
      fromPosition: "",
      toPosition: "",
      effectiveDate: format(new Date(), "yyyy-MM-dd"),
      decisionReference: "",
      notes: "",
    });
    toast({ title: "Succès", description: "Mouvement enregistré" });
  };

  const handleDeleteMovement = (id: string) => {
    const updated = movements.filter(m => m.id !== id);
    saveMovements(updated);
    toast({ title: "Supprimé", description: "Mouvement supprimé" });
  };

  const filteredMovements = filterType === "all" ? movements : movements.filter(m => m.movementType === filterType);

  const exportCSV = () => {
    const headers = ["Type", "Nom", "Code", "De (Unité)", "Vers (Unité)", "De (Poste)", "Vers (Poste)", "Date effective", "Réf. Décision", "Notes"];
    const rows = filteredMovements.map(m => [
      movementTypeLabels[m.movementType],
      m.employeeName,
      m.employeeCode,
      m.fromUnit,
      m.toUnit,
      m.fromPosition,
      m.toPosition,
      m.effectiveDate,
      m.decisionReference,
      m.notes,
    ]);

    const csv = [
      `Mouvement du Personnel - ${format(new Date(), "dd/MM/yyyy")}`,
      "",
      headers.join(","),
      ...rows.map(r => r.map(c => `"${c}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `mouvements-personnel-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const exportPDF = async () => {
    setExportingPdf(true);
    try {
      await exportToPdf(
        "staff-movement-report",
        `mouvements-personnel-${format(new Date(), "yyyy-MM-dd")}`,
        "Registre des mouvements du personnel"
      );
    } finally {
      setExportingPdf(false);
    }
  };

  const stats = {
    total: movements.length,
    affectations: movements.filter(m => m.movementType === "affectation").length,
    promotions: movements.filter(m => m.movementType === "promotion").length,
    detachements: movements.filter(m => m.movementType === "detachement").length,
    transferts: movements.filter(m => m.movementType === "transfert").length,
    autres: movements.filter(m => ["mise_a_disposition", "reintegration"].includes(m.movementType)).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-primary" },
          { label: "Affectations", value: stats.affectations, color: "text-blue-600" },
          { label: "Promotions", value: stats.promotions, color: "text-green-600" },
          { label: "Détachements", value: stats.detachements, color: "text-orange-600" },
          { label: "Transferts", value: stats.transferts, color: "text-yellow-600" },
          { label: "Autres", value: stats.autres, color: "text-purple-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(movementTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nouveau mouvement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Enregistrer un mouvement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Employé</Label>
                  <Select value={formData.employeeId} onValueChange={v => setFormData(p => ({ ...p, employeeId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type de mouvement</Label>
                  <Select value={formData.movementType} onValueChange={v => setFormData(p => ({ ...p, movementType: v as MovementType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(movementTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Unité d'origine</Label>
                    <Select value={formData.fromUnit} onValueChange={v => setFormData(p => ({ ...p, fromUnit: v }))}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unité de destination</Label>
                    <Select value={formData.toUnit} onValueChange={v => setFormData(p => ({ ...p, toUnit: v }))}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Poste d'origine</Label>
                    <Select value={formData.fromPosition} onValueChange={v => setFormData(p => ({ ...p, fromPosition: v }))}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {positions.map(p => (
                          <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nouveau poste</Label>
                    <Select value={formData.toPosition} onValueChange={v => setFormData(p => ({ ...p, toPosition: v }))}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {positions.map(p => (
                          <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date effective</Label>
                    <Input type="date" value={formData.effectiveDate} onChange={e => setFormData(p => ({ ...p, effectiveDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Réf. Décision</Label>
                    <Input value={formData.decisionReference} onChange={e => setFormData(p => ({ ...p, decisionReference: e.target.value }))} placeholder="N° décision" />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Observations..." rows={2} />
                </div>
                <Button onClick={handleAddMovement} className="w-full">Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={exportCSV} className="gap-2" disabled={filteredMovements.length === 0}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2" disabled={filteredMovements.length === 0 || exportingPdf}>
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card id="staff-movement-report">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Registre des mouvements</CardTitle>
            <Badge variant="secondary" className="ml-2">{filteredMovements.length} entrée(s)</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>De (Unité)</TableHead>
                  <TableHead>Vers (Unité)</TableHead>
                  <TableHead>De (Poste)</TableHead>
                  <TableHead>Vers (Poste)</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Réf.</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((m, idx) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${movementTypeColors[m.movementType]}`}>
                        {movementTypeIcons[m.movementType]}
                        {movementTypeLabels[m.movementType]}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{m.employeeName}</TableCell>
                    <TableCell className="font-mono text-xs">{m.employeeCode || "—"}</TableCell>
                    <TableCell className="text-sm">{m.fromUnit || "—"}</TableCell>
                    <TableCell className="text-sm">{m.toUnit || "—"}</TableCell>
                    <TableCell className="text-sm">{m.fromPosition || "—"}</TableCell>
                    <TableCell className="text-sm">{m.toPosition || "—"}</TableCell>
                    <TableCell className="text-sm">{m.effectiveDate ? format(new Date(m.effectiveDate), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell className="text-xs">{m.decisionReference || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteMovement(m.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMovements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Aucun mouvement enregistré
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      <ReportAnalysis
        reportType="staff-movement"
        reportData={{
          total: stats.total,
          affectations: stats.affectations,
          promotions: stats.promotions,
          detachements: stats.detachements,
          transferts: stats.transferts,
          autres: stats.autres,
        }}
        organizationName=""
      />
    </div>
  );
};
