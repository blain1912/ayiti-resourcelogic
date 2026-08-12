import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Loader2 } from "lucide-react";
import { fiscalYearLabel, fiscalYearOptions, fiscalYearOf, MONTH_NAMES } from "@/lib/fiscalYear";

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
            <Select value={selectedFiscalYear} onValueChange={setSelectedFiscalYear}>
              <SelectTrigger className="w-[220px]">
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
                    <TableCell className="text-right font-semibold">{rows.length}</TableCell>
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

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Détail des lignes de paie</CardTitle>
            <CardDescription>Par période et par poste</CardDescription>
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
                  {rows.map((r) => (
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
