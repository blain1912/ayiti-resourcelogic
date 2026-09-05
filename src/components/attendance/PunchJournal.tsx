import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { locationStatusLabel } from "@/lib/worksites";

interface Props {
  organizationId: string;
  date: string;
}

const METHOD_LABELS: Record<string, string> = {
  manuel: "Saisie RH",
  qr_central: "QR central",
  qr_individuel: "QR individuel",
  correction: "Correction validée",
};

const statusVariant = (status?: string | null) => {
  if (status === "sur_site" || status === "hors_site_autorise" || status === "exception_validee")
    return "default" as const;
  if (status === "hors_zone") return "destructive" as const;
  return "secondary" as const;
};

export const PunchJournal = ({ organizationId, date }: Props) => {
  const { data: punches = [], isLoading } = useQuery({
    queryKey: ["punch-journal", organizationId, date],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_punches")
        .select(
          "id, punch_time, punch_type, method, location_status, distance_meters, device_drift_seconds, server_recorded_at, profiles(full_name), work_sites(name)"
        )
        .eq("organization_id", organizationId)
        .eq("date", date)
        .order("punch_time", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" /> Journal des pointages
        </CardTitle>
        <CardDescription>
          Heure officielle enregistrée par le serveur, avec le site et le résultat du contrôle de
          lieu lorsque celui-ci est activé.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : !punches.length ? (
          <p className="text-sm text-muted-foreground">Aucun pointage enregistré pour cette date.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Sens</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Contrôle de lieu</TableHead>
                  <TableHead className="text-right">Écart appareil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {punches.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.profiles?.full_name || "—"}
                    </TableCell>
                    <TableCell>{p.punch_time?.slice(0, 5)}</TableCell>
                    <TableCell>{p.punch_type === "out" ? "Sortie" : "Entrée"}</TableCell>
                    <TableCell>{METHOD_LABELS[p.method] || p.method}</TableCell>
                    <TableCell>{p.work_sites?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.location_status)}>
                        {locationStatusLabel(p.location_status)}
                      </Badge>
                      {p.distance_meters !== null && p.distance_meters !== undefined && (
                        <span className="block text-xs text-muted-foreground">
                          {Math.round(p.distance_meters)} m du site
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {p.device_drift_seconds !== null && p.device_drift_seconds !== undefined
                        ? `${p.device_drift_seconds} s`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
