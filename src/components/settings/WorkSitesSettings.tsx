import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Plus, Trash2, Pencil, LocateFixed } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useWorkSites,
  useSaveWorkSite,
  useDeleteWorkSite,
  type WorkSiteRow,
} from "@/hooks/useWorkSites";
import { SITE_TYPES, siteTypeLabel, COMMON_TIME_ZONES } from "@/lib/worksites";

interface Props {
  organizationId: string;
}

const emptySite = {
  id: undefined as string | undefined,
  name: "",
  code: "",
  site_type: "bureau",
  address: "",
  country: "",
  city: "",
  latitude: "",
  longitude: "",
  radius_meters: 150,
  time_zone: "",
  is_active: true,
  observations: "",
};

export const WorkSitesSettings = ({ organizationId }: Props) => {
  const { data: sites, isLoading } = useWorkSites(organizationId);
  const saveSite = useSaveWorkSite(organizationId);
  const deleteSite = useDeleteWorkSite();
  const [form, setForm] = useState(emptySite);

  const edit = (site: WorkSiteRow) =>
    setForm({
      id: site.id,
      name: site.name,
      code: site.code || "",
      site_type: site.site_type,
      address: site.address || "",
      country: site.country || "",
      city: site.city || "",
      latitude: site.latitude !== null ? String(site.latitude) : "",
      longitude: site.longitude !== null ? String(site.longitude) : "",
      radius_meters: site.radius_meters,
      time_zone: site.time_zone || "",
      is_active: site.is_active,
      observations: site.observations || "",
    });

  const useCurrentPosition = () => {
    if (!("geolocation" in navigator)) {
      toast({ title: "Localisation indisponible sur cet appareil", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        })),
      () => toast({ title: "Position non obtenue", variant: "destructive" }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast({ title: "Le nom du site est obligatoire", variant: "destructive" });
      return;
    }
    saveSite.mutate(
      {
        id: form.id,
        name: form.name.trim(),
        code: form.code.trim() || null,
        site_type: form.site_type,
        address: form.address.trim() || null,
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        radius_meters: Number(form.radius_meters) || 150,
        time_zone: form.time_zone || null,
        is_active: form.is_active,
        observations: form.observations.trim() || null,
      },
      {
        onSuccess: () => {
          toast({ title: form.id ? "Site mis à jour" : "Site créé" });
          setForm(emptySite);
        },
        onError: (e: any) =>
          toast({ title: "Erreur", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Sites de travail et de pointage
          </CardTitle>
          <CardDescription>
            Un site est un lieu physique (siège, bureau, représentation, annexe…). Il est distinct
            d'une structure administrative : plusieurs structures peuvent partager un même site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : !sites?.length ? (
            <p className="text-sm text-muted-foreground">Aucun site enregistré pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Localité</TableHead>
                    <TableHead className="text-center">Rayon</TableHead>
                    <TableHead>Fuseau</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">
                        {site.name}
                        {site.code && (
                          <span className="text-muted-foreground text-xs ml-2">{site.code}</span>
                        )}
                      </TableCell>
                      <TableCell>{siteTypeLabel(site.site_type)}</TableCell>
                      <TableCell>
                        {[site.city, site.country].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {site.latitude !== null && site.longitude !== null
                          ? `${site.radius_meters} m`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{site.time_zone || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={site.is_active ? "default" : "secondary"}>
                          {site.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => edit(site)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            deleteSite.mutate(site.id, {
                              onSuccess: () => toast({ title: "Site supprimé" }),
                              onError: (e: any) =>
                                toast({
                                  title: "Suppression impossible",
                                  description: e.message,
                                  variant: "destructive",
                                }),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Modifier le site" : "Ajouter un site"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom du site *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Consulat d'Haïti à Dajabón"
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="DAJ-01"
              />
            </div>
            <div className="space-y-2">
              <Label>Type de site</Label>
              <Select
                value={form.site_type}
                onValueChange={(value) => setForm({ ...form, site_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fuseau horaire</Label>
              <Select
                value={form.time_zone || "none"}
                onValueChange={(value) =>
                  setForm({ ...form, time_zone: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Celui de l'organisation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Celui de l'organisation</SelectItem>
                  {COMMON_TIME_ZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Adresse</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ville / localité</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                placeholder="19.5501"
              />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                placeholder="-71.7085"
              />
            </div>
            <div className="space-y-2">
              <Label>Rayon autorisé (mètres)</Label>
              <Input
                type="number"
                min={20}
                value={form.radius_meters}
                onChange={(e) =>
                  setForm({ ...form, radius_meters: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={useCurrentPosition}>
                <LocateFixed className="h-4 w-4 mr-2" />
                Utiliser ma position actuelle
              </Button>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Observations</Label>
              <Textarea
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between gap-4 sm:col-span-2">
              <Label htmlFor="site-active">Site actif</Label>
              <Switch
                id="site-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={submit} disabled={saveSite.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              {form.id ? "Enregistrer" : "Ajouter le site"}
            </Button>
            {form.id && (
              <Button variant="outline" onClick={() => setForm(emptySite)}>
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
