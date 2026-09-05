import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useAssignProfileSite,
  useCloseProfileSite,
  useProfileWorkSites,
  useWorkSites,
} from "@/hooks/useWorkSites";
import { SITE_ROLES, siteRoleLabel, siteTypeLabel } from "@/lib/worksites";
import { formatFrShortDate } from "@/lib/hr";

interface Props {
  organizationId: string;
  profileId: string;
  canManage?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export const ProfileWorkSitesCard = ({ organizationId, profileId, canManage }: Props) => {
  const { data: sites = [] } = useWorkSites(organizationId, true);
  const { data: history = [], isLoading } = useProfileWorkSites(profileId);
  const assign = useAssignProfileSite();
  const close = useCloseProfileSite();

  const [form, setForm] = useState({
    site_id: "",
    site_role: "principal",
    start_date: today(),
    end_date: "",
    comment: "",
  });

  const submit = () => {
    if (!form.site_id) {
      toast({ title: "Sélectionnez un site", variant: "destructive" });
      return;
    }
    assign.mutate(
      {
        organization_id: organizationId,
        profile_id: profileId,
        site_id: form.site_id,
        site_role: form.site_role,
        start_date: form.start_date,
        end_date: form.end_date || null,
        comment: form.comment || null,
      },
      {
        onSuccess: () => {
          toast({ title: "Site rattaché à l'agent" });
          setForm({ site_id: "", site_role: "principal", start_date: today(), end_date: "", comment: "" });
        },
        onError: (e: any) =>
          toast({ title: "Erreur", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Sites de pointage de l'agent
        </CardTitle>
        <CardDescription>
          Le site principal détermine le lieu attendu au pointage. Un site temporaire (détachement,
          renfort) ou un site autorisé s'ajoute sans supprimer l'historique.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : !history.length ? (
          <p className="text-sm text-muted-foreground">
            Aucun site rattaché : le pointage utilisera le site du QR code ou restera sans contrôle
            de lieu.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  {canManage && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.work_sites?.name || "—"}
                      {row.work_sites && (
                        <span className="block text-xs text-muted-foreground">
                          {siteTypeLabel(row.work_sites.site_type)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{siteRoleLabel(row.site_role)}</TableCell>
                    <TableCell>{formatFrShortDate(row.start_date)}</TableCell>
                    <TableCell>{row.end_date ? formatFrShortDate(row.end_date) : "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.is_current ? "default" : "secondary"}>
                        {row.is_current ? "En cours" : "Clôturé"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {row.is_current && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              close.mutate({ id: row.id, endDate: today() })
                            }
                          >
                            Clôturer
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {canManage && (
          <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
            <div className="space-y-2">
              <Label>Site</Label>
              <Select
                value={form.site_id}
                onValueChange={(value) => setForm({ ...form, site_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rôle du site</Label>
              <Select
                value={form.site_role}
                onValueChange={(value) => setForm({ ...form, site_role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de fin (facultative)</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Commentaire</Label>
              <Input
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Référence de décision, motif du détachement…"
              />
            </div>
            <div>
              <Button onClick={submit} disabled={assign.isPending}>
                <Plus className="h-4 w-4 mr-2" /> Rattacher le site
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
