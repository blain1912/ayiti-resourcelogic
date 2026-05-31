import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, Loader2 } from "lucide-react";

interface Props {
  organizationId: string;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin", label: "Administrateur" },
  { value: "directeur_general", label: "Directeur Général (DG)" },
  { value: "directeur_administratif", label: "Directeur Administratif (DA)" },
  { value: "directeur_rh", label: "Directeur RH (DRH)" },
  { value: "chef_service", label: "Chef de service" },
  { value: "secretaire", label: "Secrétaire" },
];

const DEFAULT_ROLES = ROLE_OPTIONS.map((r) => r.value);

export const LateNotificationSettings = ({ organizationId }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [roles, setRoles] = useState<string[]>(DEFAULT_ROLES);
  const [extras, setExtras] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    load();
  }, [organizationId]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: settings }, { data: pf }] = await Promise.all([
        (supabase as any)
          .from("late_notification_settings")
          .select("*")
          .eq("organization_id", organizationId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id, full_name")
          .eq("organization_id", organizationId)
          .order("full_name"),
      ]);

      if (settings) {
        setEnabled(!!settings.enabled);
        setRoles(settings.enabled_roles || DEFAULT_ROLES);
        setExtras(settings.extra_recipient_ids || []);
      }
      setProfiles((pf as any) || []);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: string, checked: boolean) => {
    setRoles((prev) => (checked ? [...new Set([...prev, role])] : prev.filter((r) => r !== role)));
  };

  const toggleExtra = (id: string, checked: boolean) => {
    setExtras((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((r) => r !== id)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("late_notification_settings")
        .upsert(
          {
            organization_id: organizationId,
            enabled,
            enabled_roles: roles,
            extra_recipient_ids: extras,
          },
          { onConflict: "organization_id" }
        );
      if (error) throw error;
      toast({ title: "Paramètres enregistrés" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" /> Notifications de retard
        </CardTitle>
        <CardDescription>
          Choisissez qui reçoit une notification lorsqu'un employé pointe après l'heure limite.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base">Activer les notifications de retard</Label>
                <p className="text-sm text-muted-foreground">
                  Désactivez pour ne plus envoyer aucune notification de retard.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className={enabled ? "" : "opacity-50 pointer-events-none"}>
              <h4 className="font-medium mb-3">Rôles destinataires</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((r) => (
                  <label
                    key={r.value}
                    className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent/40"
                  >
                    <Checkbox
                      checked={roles.includes(r.value)}
                      onCheckedChange={(c) => toggleRole(r.value, !!c)}
                    />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={enabled ? "" : "opacity-50 pointer-events-none"}>
              <h4 className="font-medium mb-3">Destinataires supplémentaires</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Sélectionnez des employés spécifiques à notifier en plus des rôles ci-dessus.
              </p>
              <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                {profiles.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">Aucun employé.</p>
                )}
                {profiles.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 p-3 cursor-pointer hover:bg-accent/40">
                    <Checkbox
                      checked={extras.includes(p.id)}
                      onCheckedChange={(c) => toggleExtra(p.id, !!c)}
                    />
                    <span className="text-sm">{p.full_name || "(sans nom)"}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LateNotificationSettings;
