import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_LEAVE_POLICY, normalizePolicy, type LeavePolicy, type LeaveTier } from "@/lib/leavePolicy";
import { Trash2, Plus, Save, RotateCcw } from "lucide-react";

interface Props {
  organizationId: string;
}

export function LeavePolicySettings({ organizationId }: Props) {
  const { toast } = useToast();
  const [policy, setPolicy] = useState<LeavePolicy>(DEFAULT_LEAVE_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organizations")
      .select("leave_policy")
      .eq("id", organizationId)
      .maybeSingle();
    setPolicy(normalizePolicy((data as any)?.leave_policy));
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ leave_policy: policy as any })
      .eq("id", organizationId);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Politique enregistrée", description: "Les nouveaux soldes seront appliqués automatiquement." });
    }
  };

  const resetDefault = () => setPolicy(DEFAULT_LEAVE_POLICY);

  const updateTier = (i: number, patch: Partial<LeaveTier>) => {
    setPolicy({
      ...policy,
      tiers: policy.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    });
  };
  const addTier = () =>
    setPolicy({ ...policy, tiers: [...policy.tiers, { min_years: 0, max_years: 0, days: 0 }] });
  const removeTier = (i: number) =>
    setPolicy({ ...policy, tiers: policy.tiers.filter((_, idx) => idx !== i) });

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Politique de congés</CardTitle>
        <CardDescription>
          Personnalisez les règles de calcul des soldes pour votre organisation. Par défaut : barème
          de la fonction publique haïtienne (15 / 20 / 25 jours selon l'ancienneté).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Mode de calcul du congé annuel</Label>
          <RadioGroup
            value={policy.mode}
            onValueChange={(v) => setPolicy({ ...policy, mode: v as LeavePolicy["mode"] })}
            className="space-y-2"
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem value="seniority_haiti" id="m-haiti" className="mt-1" />
              <div>
                <Label htmlFor="m-haiti" className="cursor-pointer">Barème par ancienneté</Label>
                <p className="text-xs text-muted-foreground">
                  Jours alloués selon les années de service (basé sur la date d'entrée en fonction).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="fixed" id="m-fixed" className="mt-1" />
              <div>
                <Label htmlFor="m-fixed" className="cursor-pointer">Nombre fixe de jours</Label>
                <p className="text-xs text-muted-foreground">
                  Le même nombre de jours pour tous les employés.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {policy.mode === "fixed" ? (
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            <div>
              <Label>Jours annuels</Label>
              <Input
                type="number"
                min={0}
                value={policy.fixed_annual_days}
                onChange={(e) => setPolicy({ ...policy, fixed_annual_days: Number(e.target.value) })}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Paliers d'ancienneté</Label>
            <div className="space-y-2">
              {policy.tiers.map((t, i) => (
                <div key={i} className="flex items-end gap-2 flex-wrap">
                  <div>
                    <Label className="text-xs">Années min.</Label>
                    <Input
                      type="number"
                      className="w-24"
                      min={0}
                      value={t.min_years}
                      onChange={(e) => updateTier(i, { min_years: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Années max.</Label>
                    <Input
                      type="number"
                      className="w-24"
                      min={0}
                      value={t.max_years}
                      onChange={(e) => updateTier(i, { max_years: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Jours ouvrables</Label>
                    <Input
                      type="number"
                      className="w-24"
                      min={0}
                      value={t.days}
                      onChange={(e) => updateTier(i, { days: Number(e.target.value) })}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeTier(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTier} className="gap-1">
                <Plus className="h-4 w-4" /> Ajouter un palier
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Autres types de congés (jours par défaut)</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Maladie</Label>
              <Input type="number" min={0} value={policy.sick_days}
                onChange={(e) => setPolicy({ ...policy, sick_days: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Maternité</Label>
              <Input type="number" min={0} value={policy.maternity_days}
                onChange={(e) => setPolicy({ ...policy, maternity_days: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Paternité</Label>
              <Input type="number" min={0} value={policy.paternity_days}
                onChange={(e) => setPolicy({ ...policy, paternity_days: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Exceptionnel</Label>
              <Input type="number" min={0} value={policy.exceptional_days}
                onChange={(e) => setPolicy({ ...policy, exceptional_days: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Études</Label>
              <Input type="number" min={0} value={policy.study_days}
                onChange={(e) => setPolicy({ ...policy, study_days: Number(e.target.value) })} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
          <Button variant="outline" onClick={resetDefault} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Barème haïtien par défaut
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
