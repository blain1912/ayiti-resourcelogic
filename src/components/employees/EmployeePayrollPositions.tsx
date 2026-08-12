import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Briefcase, Loader2, FileDown, FileSpreadsheet } from "lucide-react";
import { fiscalYearLabel, fiscalYearOptions, fiscalYearOf, MONTH_NAMES } from "@/lib/fiscalYear";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  nif?: string | null;
  profileId: string;
  organizationId?: string | null;
}

interface PaymentRow {
  id: string;
  poste: string | null;
  period: string;
  montant_brut: number;
  montant_net: number;
  status: string;
  nif: string | null;
  profile_id: string | null;
  nom_complet: string | null;
}

const fmt = (n: number) =>
  `${(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG`;

const ALL_YEARS = "all";

function parsePeriodYear(period?: string | null): number | null {
  if (!period) return null;
  const match = period.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function parsePeriodMonth(period?: string | null): number | null {
  if (!period) return null;
  const lower = period.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const idx = MONTH_NAMES.findIndex((m) =>
    lower.includes(
      m.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    )
  );
  return idx >= 0 ? idx + 1 : null;
}

function fiscalYearFromPeriod(period?: string | null): number | null {
  const year = parsePeriodYear(period);
  const month = parsePeriodMonth(period);
  if (!year || !month) return null;
  return fiscalYearOf(year, month);
}

export function EmployeePayrollPositions({ nif, profileId, organizationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(ALL_YEARS);

  const yearOptions = useMemo(() => fiscalYearOptions(6), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("payroll_payments")
          .select("id, poste, period, montant_brut, montant_net, status, nif, profile_id, nom_complet")
          .order("period", { ascending: false });

        if (organizationId) query = query.eq("organization_id", organizationId);

        query = nif ? query.or(`nif.eq.${nif},profile_id.eq.${profileId}`) : query.eq("profile_id", profileId);

        const { data, error } = await query;
        if (error) throw error;
        setRows((data as PaymentRow[]) || []);

        // Default to current fiscal year if data exists for it
        const currentStart = fiscalYearOf(new Date().getFullYear(), new Date().getMonth() + 1);
        const hasCurrent = (data as PaymentRow[])?.some((r) => fiscalYearFromPeriod(r.period) === currentStart);
        setSelectedFiscalYear(hasCurrent ? String(currentStart) : ALL_YEARS);
      } catch (e) {
        console.error("Erreur chargement paie employé:", e);
        setRows([]);
        setSelectedFiscalYear(ALL_YEARS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [nif, profileId, organizationId]);

  const filteredRows = useMemo(() => {
    if (selectedFiscalYear === ALL_YEARS) return rows;
    const target = Number(selectedFiscalYear);
    return rows.filter((r) => fiscalYearFromPeriod(r.period) === target);
  }, [rows, selectedFiscalYear]);

  const byPoste = filteredRows.reduce<Record<string, { count: number; brut: number; net: number; paid: number }>>(
    (acc, r) => {
      const key = r.poste?.trim() || "Poste non précisé";
      acc[key] = acc[key] || { count: 0, brut: 0, net: 0, paid: 0 };
      acc[key].count += 1;
      acc[key].brut += Number(r.montant_brut) || 0;
      acc[key].net += Number(r.montant_net) || 0;
      if (r.status === "paid" || r.status === "paye" || r.status === "confirmed") acc[key].paid += 1;
      return acc;
    },
    {}
  );

  const postes = Object.entries(byPoste);
  const totalNet = filteredRows.reduce((s, r) => s + (Number(r.montant_net) || 0), 0);
  const totalBrut = filteredRows.reduce((s, r) => s + (Number(r.montant_brut) || 0), 0);

  const employeeName = rows[0]?.nom_complet || "Employé";
  const periodLabel =
    selectedFiscalYear === ALL_YEARS ? "Tous les exercices" : fiscalYearLabel(Number(selectedFiscalYear));
  const fileBase = `paie_${employeeName.replace(/\s+/g, "_")}_${periodLabel.replace(/\s+/g, "_")}`;

  const handleExportCsv = () => {
    const sep = ";";
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines: string[] = [];
    lines.push(esc(`Lignes de paie — ${employeeName}${nif ? ` (NIF ${nif})` : ""} — ${periodLabel}`));
    lines.push("");
    lines.push(["Poste", "Lignes", "Payées", "Total brut", "Total net"].map(esc).join(sep));
    postes.forEach(([poste, s]) =>
      lines.push([poste, s.count, s.paid, s.brut.toFixed(2), s.net.toFixed(2)].map(esc).join(sep))
    );
    lines.push(
      ["Total cumulé", filteredRows.length, "", totalBrut.toFixed(2), totalNet.toFixed(2)].map(esc).join(sep)
    );
    lines.push("");
    lines.push(["Période", "Poste", "Brut", "Net", "Statut"].map(esc).join(sep));
    filteredRows.forEach((r) =>
      lines.push(
        [
          r.period,
          r.poste || "-",
          Number(r.montant_brut || 0).toFixed(2),
          Number(r.montant_net || 0).toFixed(2),
          r.status,
        ]
          .map(esc)
          .join(sep)
      )
    );

    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    doc.setFontSize(14);
    doc.text("Lignes de paie par poste", 40, 45);
    doc.setFontSize(10);
    doc.text(`${employeeName}${nif ? ` — NIF ${nif}` : ""}`, 40, 62);
    doc.text(`Exercice : ${periodLabel}`, 40, 76);

    autoTable(doc, {
      startY: 95,
      head: [["Poste", "Lignes", "Payées", "Total brut", "Total net"]],
      body: postes.map(([poste, s]) => [poste, String(s.count), String(s.paid), fmt(s.brut), fmt(s.net)]),
      foot: [["Total cumulé", String(filteredRows.length), "", fmt(totalBrut), fmt(totalNet)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 120] },
      footStyles: { fillColor: [235, 238, 245], textColor: 20 },
    });

    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 25,
      head: [["Période", "Poste", "Brut", "Net", "Statut"]],
      body: filteredRows.map((r) => [
        r.period,
        r.poste || "-",
        fmt(Number(r.montant_brut)),
        fmt(Number(r.montant_net)),
        r.status,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 120] },
    });

    doc.save(`${fileBase}.pdf`);
  };

  if (loading) {

    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement des lignes de paie...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Postes rattachés au NIF
                {postes.length > 1 && <Badge variant="secondary">Cumul de postes</Badge>}
              </CardTitle>
              <CardDescription>
                {nif ? `NIF ${nif} — ` : ""}
                {postes.length} poste(s) détecté(s) sur {filteredRows.length} ligne(s) de paie
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedFiscalYear} onValueChange={setSelectedFiscalYear}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Exercice fiscal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_YEARS}>Tous les exercices</SelectItem>
                  {yearOptions.map((start) => (
                    <SelectItem key={start} value={String(start)}>
                      {fiscalYearLabel(start)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={filteredRows.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={filteredRows.length === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>

          </div>
        </CardHeader>
        <CardContent>
          {postes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Aucune ligne de paie associée à cet employé pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Poste</TableHead>
                    <TableHead className="text-right">Lignes</TableHead>
                    <TableHead className="text-right">Payées</TableHead>
                    <TableHead className="text-right">Total brut</TableHead>
                    <TableHead className="text-right">Total net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postes.map(([poste, s]) => (
                    <TableRow key={poste}>
                      <TableCell className="font-medium">{poste}</TableCell>
                      <TableCell className="text-right">{s.count}</TableCell>
                      <TableCell className="text-right">{s.paid}</TableCell>
                      <TableCell className="text-right">{fmt(s.brut)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(s.net)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-semibold">Total cumulé</TableCell>
                    <TableCell className="text-right font-semibold">{filteredRows.length}</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-semibold">{fmt(totalBrut)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(totalNet)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Détail des lignes de paie</CardTitle>
            <CardDescription>
              Par période et par poste
              {selectedFiscalYear !== ALL_YEARS && (
                <span className="ml-1">— {fiscalYearLabel(Number(selectedFiscalYear))}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Période</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead className="text-right">Brut</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.period}</TableCell>
                      <TableCell>{r.poste || "-"}</TableCell>
                      <TableCell className="text-right">{fmt(Number(r.montant_brut))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(r.montant_net))}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
