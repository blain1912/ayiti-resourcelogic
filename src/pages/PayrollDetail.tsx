import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  FileDown,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  Download,
  Search,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PayrollRow {
  id: string;
  no_cheque: string | null;
  code_employe: string | null;
  nif: string | null;
  nom_complet: string;
  poste: string | null;
  montant_brut: number;
  isr: number;
  cas_fdu: number;
  pension: number;
  cfgdct: number;
  aval: number;
  remboursement: number;
  autres_retenues: number;
  montant_net: number;
  status: string;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  profile_id: string | null;
}

interface EmargementDoc {
  id: string;
  organization_id: string;
  file_name: string;
  file_url: string;
  period_label: string | null;
  upload_date: string;
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PayrollDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<EmargementDoc | null>(null);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [orgName, setOrgName] = useState<string>("");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paye" | "non_paye">("all");

  useEffect(() => {
    if (id) load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    const { data: d } = await supabase
      .from("emargement_documents")
      .select("id, organization_id, file_name, file_url, period_label, upload_date")
      .eq("id", id!)
      .single();
    if (d) {
      setDoc(d);
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", d.organization_id)
        .single();
      if (org) setOrgName(org.name);
    }
    const { data: pr } = await supabase
      .from("payroll_payments")
      .select("*")
      .eq("emargement_document_id", id!)
      .order("nom_complet");
    setRows(pr || []);
    setLoading(false);
  };

  const handleExtract = async () => {
    if (!confirm("Extraire automatiquement les données du PDF ? Cela remplacera les lignes existantes.")) return;
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-emargement", {
        body: { emargement_document_id: id },
      });
      if (error) throw error;
      toast({
        title: "Extraction réussie",
        description: `${data.inserted} lignes extraites · ${data.matched} employés liés`,
      });
      load();
    } catch (err: any) {
      toast({ title: "Erreur d'extraction", description: err.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const handleCreateEmployees = async () => {
    const missing = rows.filter((r) => !r.profile_id).length;
    if (!missing) {
      toast({ title: "Rien à créer", description: "Toutes les lignes sont déjà liées à un employé." });
      return;
    }
    if (!confirm(`Créer les fiches employés pour les ${missing} ligne(s) non liée(s) ?`)) return;
    setCreatingEmployees(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-employees-from-emargement", {
        body: { emargement_document_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Import terminé",
        description: `${data.created} employé(s) créé(s) · ${data.linked} lié(s) · ${data.skipped} ignoré(s)${data.errors?.length ? ` · ${data.errors.length} erreur(s)` : ""}`,
      });
      load();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setCreatingEmployees(false);
    }
  };

  const togglePaid = async (row: PayrollRow) => {
    const newStatus = row.status === "paye" ? "non_paye" : "paye";
    const updates: any = {
      status: newStatus,
      payment_date: newStatus === "paye" ? new Date().toISOString().substring(0, 10) : null,
    };
    const { error } = await supabase.from("payroll_payments").update(updates).eq("id", row.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, ...updates } : r)));
  };

  const updateField = async (rowId: string, field: keyof PayrollRow, value: any) => {
    const { error } = await supabase.from("payroll_payments").update({ [field]: value }).eq("id", rowId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
  };

  const markAllPaid = async () => {
    if (!confirm(`Marquer les ${visibleRows.length} lignes affichées comme payées ?`)) return;
    const today = new Date().toISOString().substring(0, 10);
    const ids = visibleRows.map((r) => r.id);
    const { error } = await supabase
      .from("payroll_payments")
      .update({ status: "paye", payment_date: today })
      .in("id", ids);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lignes marquées payées" });
    load();
  };

  const visibleRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (filter) {
        const q = filter.toLowerCase();
        if (
          !r.nom_complet.toLowerCase().includes(q) &&
          !(r.nif || "").toLowerCase().includes(q) &&
          !(r.code_employe || "").toLowerCase().includes(q) &&
          !(r.poste || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, statusFilter, filter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const paid = rows.filter((r) => r.status === "paye").length;
    const totalBrut = rows.reduce((s, r) => s + Number(r.montant_brut), 0);
    const totalNet = rows.reduce((s, r) => s + Number(r.montant_net), 0);
    const totalPaidNet = rows
      .filter((r) => r.status === "paye")
      .reduce((s, r) => s + Number(r.montant_net), 0);
    return { total, paid, unpaid: total - paid, totalBrut, totalNet, totalPaidNet };
  }, [rows]);

  const generatePDF = () => {
    if (!rows.length) {
      toast({ title: "Aucune donnée", description: "Extrayez d'abord les lignes.", variant: "destructive" });
      return;
    }
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("ÉTAT D'ÉMARGEMENT", pageWidth / 2, 12, { align: "center" });
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(orgName.toUpperCase(), pageWidth / 2, 18, { align: "center" });
    pdf.text(`Période : ${doc?.period_label || ""}`, pageWidth / 2, 23, { align: "center" });
    pdf.setFontSize(7);
    pdf.text(`Généré le ${new Date().toLocaleString("fr-FR")}`, pageWidth - 14, 12, { align: "right" });

    autoTable(pdf, {
      startY: 28,
      head: [[
        "No Chèque", "Code / NIF", "Nom & Poste",
        "Brut", "ISR", "CAS/FDU", "Pension", "CFGDCT", "Aval", "Remb.", "Autres Ret.", "Net"
      ]],
      body: rows.map((r) => [
        r.no_cheque || "",
        `${r.code_employe || ""}\n${r.nif || ""}`,
        `${r.nom_complet}\n${r.poste || ""}`,
        fmt(r.montant_brut),
        fmt(r.isr),
        fmt(r.cas_fdu),
        fmt(r.pension),
        fmt(r.cfgdct),
        fmt(r.aval),
        fmt(r.remboursement),
        fmt(r.autres_retenues),
        fmt(r.montant_net),
      ]),
      foot: [[
        "", "", `Total (${rows.length} employés)`,
        fmt(stats.totalBrut),
        fmt(rows.reduce((s, r) => s + Number(r.isr), 0)),
        fmt(rows.reduce((s, r) => s + Number(r.cas_fdu), 0)),
        fmt(rows.reduce((s, r) => s + Number(r.pension), 0)),
        fmt(rows.reduce((s, r) => s + Number(r.cfgdct), 0)),
        fmt(rows.reduce((s, r) => s + Number(r.aval), 0)),
        fmt(rows.reduce((s, r) => s + Number(r.remboursement), 0)),
        fmt(rows.reduce((s, r) => s + Number(r.autres_retenues), 0)),
        fmt(stats.totalNet),
      ]],
      styles: { fontSize: 6.5, cellPadding: 1.2, overflow: "linebreak" },
      headStyles: { fillColor: [30, 64, 125], textColor: 255, fontSize: 7 },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 22 },
        2: { cellWidth: 45 },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
        7: { halign: "right" },
        8: { halign: "right" },
        9: { halign: "right" },
        10: { halign: "right" },
        11: { halign: "right", fontStyle: "bold" },
      },
    });

    pdf.save(`Emargement-${doc?.period_label || "export"}.pdf`);
  };

  const exportPaymentTracking = () => {
    const headers = ["No Chèque", "NIF", "Nom", "Poste", "Net", "Statut", "Date paiement", "Méthode", "Référence"];
    const lines = rows.map((r) => [
      r.no_cheque || "",
      r.nif || "",
      r.nom_complet,
      r.poste || "",
      r.montant_net.toFixed(2),
      r.status === "paye" ? "Payé" : "Non payé",
      r.payment_date || "",
      r.payment_method || "",
      r.payment_reference || "",
    ]);
    const csv = [headers, ...lines]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Suivi-paiements-${doc?.period_label || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-[1600px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/payroll"><ArrowLeft className="h-4 w-4 mr-1" /> Retour</Link>
            </Button>
            <h1 className="text-2xl font-bold">Émargement — {doc?.period_label}</h1>
            <p className="text-sm text-muted-foreground">{doc?.file_name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={doc?.file_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-1" /> PDF MEF
              </a>
            </Button>
            <Button onClick={handleExtract} disabled={extracting} size="sm">
              {extracting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {rows.length ? "Ré-extraire" : "Extraction automatique"}
            </Button>
            <Button variant="outline" size="sm" onClick={generatePDF} disabled={!rows.length}>
              <FileDown className="h-4 w-4 mr-1" /> Générer PDF interne
            </Button>
            <Button variant="outline" size="sm" onClick={exportPaymentTracking} disabled={!rows.length}>
              <Download className="h-4 w-4 mr-1" /> CSV suivi
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><Users className="h-3.5 w-3.5" /> Employés</div>
            <div className="text-2xl font-bold mt-1">{stats.total}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Payés</div>
            <div className="text-2xl font-bold mt-1 text-green-600">{stats.paid}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><Clock className="h-3.5 w-3.5 text-orange-500" /> En attente</div>
            <div className="text-2xl font-bold mt-1 text-orange-500">{stats.unpaid}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><DollarSign className="h-3.5 w-3.5" /> Total Net</div>
            <div className="text-lg font-bold mt-1">{fmt(stats.totalNet)}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><DollarSign className="h-3.5 w-3.5 text-green-600" /> Net payé</div>
            <div className="text-lg font-bold mt-1 text-green-600">{fmt(stats.totalPaidNet)}</div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Lignes de paie ({visibleRows.length})</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Nom, NIF, code, poste..."
                    className="pl-7 h-8 w-48 text-xs"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="all">Tous</option>
                  <option value="paye">Payés</option>
                  <option value="non_paye">Non payés</option>
                </select>
                {visibleRows.length > 0 && (
                  <Button size="sm" variant="outline" className="h-8" onClick={markAllPaid}>
                    Marquer tous payés
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!rows.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Aucune ligne extraite pour le moment.</p>
                <p className="text-sm">Cliquez sur "Extraction automatique" pour lire le PDF.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-10">Payé</TableHead>
                      <TableHead>No Chèque</TableHead>
                      <TableHead>Code / NIF</TableHead>
                      <TableHead>Nom & Poste</TableHead>
                      <TableHead className="text-right">Brut</TableHead>
                      <TableHead className="text-right">ISR</TableHead>
                      <TableHead className="text-right">CAS/FDU</TableHead>
                      <TableHead className="text-right">Pension</TableHead>
                      <TableHead className="text-right">CFGDCT</TableHead>
                      <TableHead className="text-right">Aval</TableHead>
                      <TableHead className="text-right">Remb.</TableHead>
                      <TableHead className="text-right">Autres</TableHead>
                      <TableHead className="text-right font-bold">Net</TableHead>
                      <TableHead className="w-32">Méthode</TableHead>
                      <TableHead className="w-32">Réf.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map((r) => (
                      <TableRow key={r.id} className="text-xs">
                        <TableCell>
                          <Checkbox
                            checked={r.status === "paye"}
                            onCheckedChange={() => togglePaid(r)}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{r.no_cheque}</TableCell>
                        <TableCell className="font-mono">
                          {r.code_employe}<br />
                          <span className="text-muted-foreground">{r.nif}</span>
                          {r.profile_id && <Badge variant="outline" className="ml-1 text-[10px] h-4">lié</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{r.nom_complet}</div>
                          <div className="text-muted-foreground text-[10px]">{r.poste}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.montant_brut)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.isr)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.cas_fdu)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.pension)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.cfgdct)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.aval)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.remboursement)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(r.autres_retenues)}</TableCell>
                        <TableCell className="text-right tabular-nums font-bold">{fmt(r.montant_net)}</TableCell>
                        <TableCell>
                          <Input
                            value={r.payment_method || ""}
                            onChange={(e) => updateField(r.id, "payment_method", e.target.value)}
                            placeholder="Chèque/Cash..."
                            className="h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={r.payment_reference || ""}
                            onChange={(e) => updateField(r.id, "payment_reference", e.target.value)}
                            placeholder="Référence"
                            className="h-7 text-xs"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PayrollDetail;
