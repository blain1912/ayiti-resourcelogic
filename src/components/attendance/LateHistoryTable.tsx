import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, Download, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface LateRecord {
  id: string;
  date: string;
  time: string | null;
  notes: string | null;
  employee_name: string;
  unit_name: string;
}

interface Props {
  organizationId: string;
  lateThresholdTime?: string | null;
}

export const LateHistoryTable = ({ organizationId, lateThresholdTime }: Props) => {
  const [records, setRecords] = useState<LateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const today = new Date();
  const defaultFrom = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");
  const defaultTo = format(today, "yyyy-MM-dd");
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  const threshold = (lateThresholdTime || "08:30:00").slice(0, 5);

  useEffect(() => {
    if (!organizationId) return;
    fetchLateRecords();
  }, [organizationId, fromDate, toDate]);

  const fetchLateRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id, date, time, notes,
          profiles!attendance_profile_id_fkey (full_name, organizational_units (name))
        `)
        .eq("organization_id", organizationId)
        .eq("status", "retard")
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      if (error) {
        // Fallback without FK alias if the relationship name differs
        const { data: data2, error: err2 } = await supabase
          .from("attendance")
          .select("id, date, time, notes, profile_id")
          .eq("organization_id", organizationId)
          .eq("status", "retard")
          .gte("date", fromDate)
          .lte("date", toDate)
          .order("date", { ascending: false });
        if (err2) throw err2;

        const ids = Array.from(new Set((data2 || []).map((r: any) => r.profile_id)));
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, organizational_units (name)")
          .in("id", ids);
        const map = new Map((profs || []).map((p: any) => [p.id, p]));
        setRecords(
          (data2 || []).map((r: any) => ({
            id: r.id,
            date: r.date,
            time: r.time,
            notes: r.notes,
            employee_name: map.get(r.profile_id)?.full_name || "—",
            unit_name: (map.get(r.profile_id) as any)?.organizational_units?.name || "—",
          }))
        );
      } else {
        setRecords(
          (data || []).map((r: any) => ({
            id: r.id,
            date: r.date,
            time: r.time,
            notes: r.notes,
            employee_name: r.profiles?.full_name || "—",
            unit_name: r.profiles?.organizational_units?.name || "—",
          }))
        );
      }
    } catch (e) {
      console.error("Error fetching late records", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter((r) =>
    r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
    r.unit_name.toLowerCase().includes(search.toLowerCase())
  );

  const minutesLate = (timeStr: string | null) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    const [th, tm] = threshold.split(":").map(Number);
    return Math.max(0, h * 60 + m - (th * 60 + tm));
  };

  const exportCSV = () => {
    const headers = ["Employé", "Structure", "Date", "Heure pointage", "Heure limite", "Minutes de retard", "Notes"];
    const rows = filtered.map((r) => [
      r.employee_name,
      r.unit_name,
      format(parseISO(r.date), "dd/MM/yyyy"),
      (r.time || "").slice(0, 5),
      threshold,
      String(minutesLate(r.time) ?? ""),
      (r.notes || "").replace(/[\r\n]+/g, " "),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historique-retards_${fromDate}_au_${toDate}.csv`;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Clock className="h-5 w-5 text-orange-600" />
              Historique des retards
            </CardTitle>
            <CardDescription>
              Heure limite configurée : <strong>{threshold}</strong> — tout pointage au-delà est marqué comme retard.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher employé / structure"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead className="hidden md:table-cell">Structure</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Heure pointage</TableHead>
                <TableHead className="hidden sm:table-cell">Heure limite</TableHead>
                <TableHead>Retard</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Aucun retard sur la période sélectionnée.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const mins = minutesLate(r.time);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employee_name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{r.unit_name}</TableCell>
                      <TableCell>{format(parseISO(r.date), "dd MMM yyyy", { locale: fr })}</TableCell>
                      <TableCell>
                        <span className="font-mono">{(r.time || "—").slice(0, 5)}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-muted-foreground">{threshold}</TableCell>
                      <TableCell>
                        {mins !== null ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                            +{mins} min
                          </Badge>
                        ) : (
                          <Badge variant="outline">—</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
