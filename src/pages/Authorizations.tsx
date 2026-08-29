import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, Plus, XCircle } from "lucide-react";
import { useHrProfile, hrProfileName } from "@/hooks/useHrProfile";
import {
  useAbsenceAuthorizations,
  useCreateAuthorization,
  useReviewAuthorization,
} from "@/hooks/useAbsenceAuthorizations";
import {
  AUTHORIZATION_TYPES,
  authorizationStatusLabel,
  authorizationStatusVariant,
  authorizationTypeLabel,
  formatFrDate,
  isFullDayAuthorization,
} from "@/lib/hr";

const today = () => new Date().toISOString().slice(0, 10);

const Authorizations = () => {
  const { toast } = useToast();
  const { data: profile, isLoading: loadingProfile } = useHrProfile();
  const orgId = profile?.organization_id ?? null;
  const canReview = !!profile?.isHr || !!profile?.canApprove;

  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    date: today(),
    authorization_type: "sortie_temporaire",
    start_time: "",
    end_time: "",
    reason: "",
    comment: "",
  });

  const mine = useAbsenceAuthorizations(orgId, { scope: "mine", profileId: profile?.id, status: statusFilter });
  const all = useAbsenceAuthorizations(orgId, { scope: "organization", status: statusFilter });
  const createAuth = useCreateAuthorization(orgId);
  const reviewAuth = useReviewAuthorization();

  const pendingCount = useMemo(
    () => (all.data || []).filter((a) => a.status === "requested").length,
    [all.data]
  );

  const fullDay = isFullDayAuthorization(form.authorization_type);

  const handleSubmit = async () => {
    if (!profile?.id || !orgId) return;
    if (!form.reason.trim()) {
      toast({ title: "Motif requis", description: "Indiquez le motif de l'autorisation.", variant: "destructive" });
      return;
    }
    if (!fullDay && (!form.start_time || !form.end_time)) {
      toast({
        title: "Horaires requis",
        description: "Une autorisation partielle nécessite une heure de début et de fin.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createAuth.mutateAsync({
        organization_id: orgId,
        profile_id: profile.id,
        date: form.date,
        authorization_type: form.authorization_type,
        start_time: fullDay ? null : form.start_time,
        end_time: fullDay ? null : form.end_time,
        reason: form.reason.trim(),
        comment: form.comment || null,
      });
      toast({ title: "Demande envoyée", description: "Votre autorisation est en attente de validation." });
      setOpen(false);
      setForm({ date: today(), authorization_type: "sortie_temporaire", start_time: "", end_time: "", reason: "", comment: "" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Envoi impossible",
        variant: "destructive",
      });
    }
  };

  const review = async (id: string, status: "approved" | "rejected") => {
    try {
      await reviewAuth.mutateAsync({ id, status });
      toast({ title: status === "approved" ? "Autorisation approuvée" : "Autorisation refusée" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Action impossible",
        variant: "destructive",
      });
    }
  };

  const renderList = (items: typeof mine.data, showEmployee: boolean) => {
    if (!items || items.length === 0) {
      return <p className="text-sm text-muted-foreground">Aucune autorisation.</p>;
    }
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {showEmployee && (
                    <span className="font-medium">{hrProfileName(item.employee)}</span>
                  )}
                  <Badge variant={authorizationStatusVariant(item.status)}>
                    {authorizationStatusLabel(item.status)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatFrDate(item.date)} · {authorizationTypeLabel(item.authorization_type)}
                  {item.start_time && item.end_time
                    ? ` · ${item.start_time.slice(0, 5)} → ${item.end_time.slice(0, 5)}`
                    : ""}
                </div>
                <div className="text-sm">{item.reason}</div>
              </div>
              {canReview && item.status === "requested" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => review(item.id, "approved")}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approuver
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => review(item.id, "rejected")}>
                    <XCircle className="h-4 w-4 mr-1" /> Refuser
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loadingProfile) {
    return <div className="container mx-auto p-6 text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Autorisations d'absence</h1>
            <p className="text-muted-foreground">
              Retards autorisés, départs anticipés, sorties temporaires et absences d'une journée.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nouvelle demande
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-sm">Statut</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="requested">En attente</SelectItem>
              <SelectItem value="approved">Approuvées</SelectItem>
              <SelectItem value="rejected">Refusées</SelectItem>
              <SelectItem value="cancelled">Annulées</SelectItem>
            </SelectContent>
          </Select>
          {canReview && pendingCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" /> {pendingCount} en attente
            </Badge>
          )}
        </div>

        <Tabs defaultValue="mine">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="mine">Mes autorisations</TabsTrigger>
            {canReview && <TabsTrigger value="all">Toute l'institution</TabsTrigger>}
          </TabsList>
          <TabsContent value="mine" className="mt-4">
            {renderList(mine.data, false)}
          </TabsContent>
          {canReview && (
            <TabsContent value="all" className="mt-4">
              {renderList(all.data, true)}
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demande d'autorisation d'absence</DialogTitle>
            <DialogDescription>
              Une autorisation approuvée ajuste automatiquement l'heure attendue dans le module Présences.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Type d'autorisation</Label>
              <Select
                value={form.authorization_type}
                onValueChange={(value) => setForm({ ...form, authorization_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTHORIZATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!fullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Heure de début</Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Heure de fin</Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Motif</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Commentaire (facultatif)</Label>
              <Textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={createAuth.isPending}>
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Authorizations;
