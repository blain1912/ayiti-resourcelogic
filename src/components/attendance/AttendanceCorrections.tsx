import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PUNCH_TYPE_LABELS, type PunchType } from "@/lib/attendance";

interface Props {
  organizationId: string;
  profileId?: string | null;
  /** RH / responsable : peut approuver ou refuser */
  canReview?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée",
};

export const AttendanceCorrections = ({ organizationId, profileId, canReview = false }: Props) => {
  const qc = useQueryClient();
  const [names, setNames] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    punch_type: "arrivee" as PunchType,
    proposed_time: "",
    reason: "oubli",
    justification: "",
  });

  const { data: requests } = useQuery({
    queryKey: ["attendance-corrections", organizationId, canReview ? "all" : profileId],
    enabled: !!organizationId,
    queryFn: async () => {
      let query = supabase
        .from("attendance_correction_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (!canReview && profileId) query = query.eq("profile_id", profileId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const profileIds = useMemo(
    () => Array.from(new Set((requests || []).map((r) => r.profile_id))),
    [requests]
  );

  useEffect(() => {
    if (!profileIds.length) return;
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((p) => (map[p.id] = p.full_name || "Agent"));
        setNames(map);
      });
  }, [profileIds]);

  const submit = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("attendance_correction_requests").insert({
        organization_id: organizationId,
        profile_id: profileId!,
        date: form.date,
        punch_type: form.punch_type,
        proposed_time: form.proposed_time || null,
        reason: form.reason,
        justification: form.justification || null,
        requested_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Demande envoyée", description: "Le service RH examinera votre demande." });
      setForm({ ...form, proposed_time: "", justification: "" });
      qc.invalidateQueries({ queryKey: ["attendance-corrections"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const request = (requests || []).find((r) => r.id === id);
      const { error } = await supabase
        .from("attendance_correction_requests")
        .update({
          status,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      if (status === "approved" && request?.proposed_time) {
        await supabase.from("attendance_punches").insert({
          organization_id: organizationId,
          profile_id: request.profile_id,
          date: request.date,
          punch_time: request.proposed_time,
          punch_type: request.punch_type,
          method: "correction",
          recorded_by: user?.id ?? null,
          server_recorded_at: new Date().toISOString(),
          location_status: "exception_validee",
        });
      }

      await supabase.from("attendance_audit_log").insert({
        organization_id: organizationId,
        profile_id: request?.profile_id ?? null,
        actor_user_id: user?.id ?? null,
        action: `correction_${status}`,
        method: "correction",
        reason: request?.reason ?? null,
      });
    },
    onSuccess: () => {
      toast({ title: "Demande traitée" });
      qc.invalidateQueries({ queryKey: ["attendance-corrections"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      {!canReview && profileId && (
        <Card>
          <CardHeader>
            <CardTitle>Demander une correction</CardTitle>
            <CardDescription>
              Oubli de pointage, panne technique ou erreur : votre demande sera examinée par le
              service RH.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.punch_type} onValueChange={(v) => setForm({ ...form, punch_type: v as PunchType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PUNCH_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Heure proposée</Label>
                <Input type="time" value={form.proposed_time} onChange={(e) => setForm({ ...form, proposed_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Motif</Label>
                <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oubli">Oubli de pointage</SelectItem>
                    <SelectItem value="panne">Panne technique</SelectItem>
                    <SelectItem value="mission">Mission extérieure</SelectItem>
                    <SelectItem value="erreur">Erreur d'enregistrement</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Justification</Label>
              <Textarea
                value={form.justification}
                onChange={(e) => setForm({ ...form, justification: e.target.value })}
                placeholder="Précisez le contexte de la demande"
              />
            </div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              <Send className="h-4 w-4 mr-2" /> Envoyer la demande
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{canReview ? "Demandes de correction" : "Mes demandes"}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {canReview && <TableHead>Agent</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Statut</TableHead>
                {canReview && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(requests || []).map((r) => (
                <TableRow key={r.id}>
                  {canReview && <TableCell>{names[r.profile_id] || "—"}</TableCell>}
                  <TableCell>{new Date(`${r.date}T00:00:00`).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>{PUNCH_TYPE_LABELS[r.punch_type as PunchType] || r.punch_type}</TableCell>
                  <TableCell>{r.proposed_time?.slice(0, 5) || "—"}</TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"
                      }
                    >
                      {STATUS_LABELS[r.status] || r.status}
                    </Badge>
                  </TableCell>
                  {canReview && (
                    <TableCell className="whitespace-nowrap">
                      {r.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Approuver"
                            onClick={() => review.mutate({ id: r.id, status: "approved" })}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Refuser"
                            onClick={() => review.mutate({ id: r.id, status: "rejected" })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {!requests?.length && (
                <TableRow>
                  <TableCell colSpan={canReview ? 7 : 5} className="text-center text-muted-foreground">
                    Aucune demande.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceCorrections;
