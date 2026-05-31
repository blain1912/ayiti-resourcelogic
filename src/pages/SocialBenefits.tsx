import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Gift, CreditCard, Save, Loader2, Calculator, Download } from "lucide-react";

type GratificationKey = "fete_meres" | "paques" | "rentree_scolaire" | "fin_annee";

interface Gratification {
  enabled: boolean;
  label: string;
  mode: "fixed" | "percentage";
  value: number;
}

interface Settings {
  organization_id: string;
  ti_kat_enabled: boolean;
  ti_kat_percentage: number;
  ti_kat_label: string;
  gratifications: Record<GratificationKey, Gratification>;
}

interface EmployeeRow {
  id: string;
  full_name: string;
  salaire_brut: number | null;
  poste: string | null;
}

interface PaymentRow {
  id: string;
  profile_id: string;
  benefit_type: string;
  period: string;
  base_amount: number;
  amount: number;
  status: string;
  payment_date: string | null;
  payment_method: string | null;
}

const DEFAULT_GRATIFS: Record<GratificationKey, Gratification> = {
  fete_meres: { enabled: true, label: "Fête des Mères", mode: "percentage", value: 0 },
  paques: { enabled: true, label: "Pâques", mode: "percentage", value: 0 },
  rentree_scolaire: { enabled: true, label: "Rentrée scolaire", mode: "percentage", value: 0 },
  fin_annee: { enabled: true, label: "Fin d'année", mode: "percentage", value: 0 },
};

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

const fmt = (n: number) => new Intl.NumberFormat("fr-HT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const SocialBenefits = () => {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const now = new Date();
  const [tiKatMonth, setTiKatMonth] = useState(String(now.getMonth() + 1));
  const [tiKatYear, setTiKatYear] = useState(String(now.getFullYear()));
  const [gratifYear, setGratifYear] = useState(String(now.getFullYear()));
  const [activeGratif, setActiveGratif] = useState<GratificationKey>("fete_meres");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("organization_id").eq("user_id", user.id).single();
      if (!profile?.organization_id) return;
      setOrgId(profile.organization_id);

      const { data: roles } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("organization_id", profile.organization_id);
      setIsAdmin(!!roles?.some(r => ["admin","directeur_general","directeur_administratif","directeur_rh"].includes(r.role)));
    })();
  }, []);

  useEffect(() => { if (orgId) loadAll(); }, [orgId]);

  const loadAll = async () => {
    if (!orgId) return;
    setLoading(true);
    const [{ data: s }, { data: emps }] = await Promise.all([
      supabase.from("social_benefits_settings").select("*").eq("organization_id", orgId).maybeSingle(),
      supabase.from("profiles").select("id, full_name, salaire_brut, poste")
        .eq("organization_id", orgId).eq("approval_status", "approved")
        .order("full_name"),
    ]);

    if (s) {
      setSettings({
        organization_id: s.organization_id,
        ti_kat_enabled: s.ti_kat_enabled,
        ti_kat_percentage: Number(s.ti_kat_percentage) || 0,
        ti_kat_label: s.ti_kat_label || "Ti Kat",
        gratifications: { ...DEFAULT_GRATIFS, ...(s.gratifications as any || {}) },
      });
    } else {
      setSettings({
        organization_id: orgId,
        ti_kat_enabled: true,
        ti_kat_percentage: 0,
        ti_kat_label: "Ti Kat",
        gratifications: DEFAULT_GRATIFS,
      });
    }
    setEmployees((emps as any) || []);
    setLoading(false);
  };

  const loadPayments = async (benefit_type: string, period: string) => {
    if (!orgId) return;
    const { data } = await supabase
      .from("social_benefits_payments")
      .select("id, profile_id, benefit_type, period, base_amount, amount, status, payment_date, payment_method")
      .eq("organization_id", orgId)
      .eq("benefit_type", benefit_type)
      .eq("period", period);
    setPayments((data as any) || []);
  };

  const saveSettings = async () => {
    if (!orgId || !settings) return;
    setSaving(true);
    const { error } = await supabase.from("social_benefits_settings").upsert({
      organization_id: orgId,
      ti_kat_enabled: settings.ti_kat_enabled,
      ti_kat_percentage: settings.ti_kat_percentage,
      ti_kat_label: settings.ti_kat_label,
      gratifications: settings.gratifications as any,
    });
    setSaving(false);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Configuration enregistrée" });
  };

  // -------- Ti Kat --------
  const tiKatPeriod = `${tiKatYear}-${tiKatMonth.padStart(2, "0")}`;
  useEffect(() => { if (orgId && settings) loadPayments("ti_kat", tiKatPeriod); }, [orgId, tiKatPeriod, settings?.ti_kat_percentage]);

  const tiKatRows = useMemo(() => {
    if (!settings) return [];
    const pct = Number(settings.ti_kat_percentage) || 0;
    return employees.map((e) => {
      const base = Number(e.salaire_brut) || 0;
      const amount = +(base * pct / 100).toFixed(2);
      const pay = payments.find((p) => p.profile_id === e.id && p.benefit_type === "ti_kat" && p.period === tiKatPeriod);
      return { emp: e, base, amount, pay };
    });
  }, [employees, settings?.ti_kat_percentage, payments, tiKatPeriod, settings]);

  const tiKatTotals = useMemo(() => ({
    count: tiKatRows.length,
    total: tiKatRows.reduce((s, r) => s + r.amount, 0),
    paid: tiKatRows.filter((r) => r.pay?.status === "paye").reduce((s, r) => s + (r.pay?.amount || 0), 0),
    paidCount: tiKatRows.filter((r) => r.pay?.status === "paye").length,
  }), [tiKatRows]);

  const initTiKat = async () => {
    if (!orgId || !settings) return;
    const pct = Number(settings.ti_kat_percentage) || 0;
    if (pct <= 0) return toast({ title: "Définissez d'abord un pourcentage", variant: "destructive" });
    const toUpsert = employees.map((e) => {
      const base = Number(e.salaire_brut) || 0;
      return {
        organization_id: orgId,
        profile_id: e.id,
        benefit_type: "ti_kat",
        period: tiKatPeriod,
        base_amount: base,
        percentage: pct,
        amount: +(base * pct / 100).toFixed(2),
      };
    });
    const { error } = await supabase.from("social_benefits_payments")
      .upsert(toUpsert, { onConflict: "organization_id,profile_id,benefit_type,period" });
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    toast({ title: "Ti Kat initialisé", description: `${toUpsert.length} employés pour ${MONTHS[+tiKatMonth - 1]} ${tiKatYear}` });
    loadPayments("ti_kat", tiKatPeriod);
  };

  const togglePaid = async (row: typeof tiKatRows[number], benefit_type: string, period: string) => {
    if (!orgId) return;
    const newStatus = row.pay?.status === "paye" ? "non_paye" : "paye";
    if (row.pay) {
      await supabase.from("social_benefits_payments").update({
        status: newStatus,
        payment_date: newStatus === "paye" ? new Date().toISOString().slice(0, 10) : null,
      }).eq("id", row.pay.id);
    } else {
      await supabase.from("social_benefits_payments").insert({
        organization_id: orgId,
        profile_id: row.emp.id,
        benefit_type,
        period,
        base_amount: row.base,
        amount: row.amount,
        status: newStatus,
        payment_date: newStatus === "paye" ? new Date().toISOString().slice(0, 10) : null,
      });
    }
    loadPayments(benefit_type, period);
  };

  // -------- Gratifications --------
  useEffect(() => { if (orgId && settings) loadPayments(activeGratif, gratifYear); }, [orgId, activeGratif, gratifYear, settings]);

  const gratifConf = settings?.gratifications[activeGratif];

  const gratifRows = useMemo(() => {
    if (!settings || !gratifConf) return [];
    return employees.map((e) => {
      const base = Number(e.salaire_brut) || 0;
      const amount = gratifConf.mode === "fixed"
        ? Number(gratifConf.value) || 0
        : +(base * (Number(gratifConf.value) || 0) / 100).toFixed(2);
      const pay = payments.find((p) => p.profile_id === e.id && p.benefit_type === activeGratif && p.period === gratifYear);
      return { emp: e, base, amount, pay };
    });
  }, [employees, settings, gratifConf, payments, activeGratif, gratifYear]);

  const gratifTotals = useMemo(() => ({
    count: gratifRows.length,
    total: gratifRows.reduce((s, r) => s + r.amount, 0),
    paid: gratifRows.filter((r) => r.pay?.status === "paye").reduce((s, r) => s + (r.pay?.amount || 0), 0),
    paidCount: gratifRows.filter((r) => r.pay?.status === "paye").length,
  }), [gratifRows]);

  const initGratif = async () => {
    if (!orgId || !settings || !gratifConf) return;
    if (!gratifConf.enabled) return toast({ title: "Cet avantage est désactivé", variant: "destructive" });
    if (!Number(gratifConf.value)) return toast({ title: "Définissez d'abord une valeur", variant: "destructive" });
    const toUpsert = employees.map((e) => {
      const base = Number(e.salaire_brut) || 0;
      const amount = gratifConf.mode === "fixed"
        ? Number(gratifConf.value) || 0
        : +(base * (Number(gratifConf.value) || 0) / 100).toFixed(2);
      return {
        organization_id: orgId,
        profile_id: e.id,
        benefit_type: activeGratif,
        period: gratifYear,
        base_amount: base,
        percentage: gratifConf.mode === "percentage" ? Number(gratifConf.value) : null,
        amount,
      };
    });
    const { error } = await supabase.from("social_benefits_payments")
      .upsert(toUpsert, { onConflict: "organization_id,profile_id,benefit_type,period" });
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    toast({ title: "Gratification initialisée", description: `${gratifConf.label} ${gratifYear}` });
    loadPayments(activeGratif, gratifYear);
  };

  const exportCsv = (rows: { emp: EmployeeRow; base: number; amount: number; pay?: PaymentRow }[], label: string) => {
    const header = ["Employé", "Poste", "Brut", "Montant", "Statut", "Date paiement"];
    const lines = rows.map((r) => [
      `"${r.emp.full_name}"`, `"${r.emp.poste || ""}"`, r.base.toFixed(2), r.amount.toFixed(2),
      r.pay?.status === "paye" ? "Payé" : "Non payé", r.pay?.payment_date || "",
    ].join(","));
    const blob = new Blob([header.join(",") + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${label}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const years = Array.from({ length: 6 }, (_, i) => String(now.getFullYear() - i));

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Avantages sociaux</h1>
          </div>
          <p className="text-muted-foreground">
            Gérez la carte de débit (Ti Kat) et les gratifications (Fête des Mères, Pâques, Rentrée, Fin d'année).
          </p>
        </div>

        <Tabs defaultValue="ti-kat" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList>
              <TabsTrigger value="ti-kat" className="gap-2"><CreditCard className="h-4 w-4" /> Ti Kat</TabsTrigger>
              <TabsTrigger value="gratifications" className="gap-2"><Gift className="h-4 w-4" /> Gratifications</TabsTrigger>
              {isAdmin && <TabsTrigger value="config">Configuration</TabsTrigger>}
            </TabsList>
          </div>

          {/* ---------------- Configuration ---------------- */}
          {isAdmin && (
            <TabsContent value="config">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de l'organisation</CardTitle>
                  <CardDescription>Chaque organisation fixe son propre pourcentage Ti Kat et ses gratifications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Ti Kat config */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" /> Ti Kat (carte de débit)</h3>
                      <Switch checked={settings.ti_kat_enabled}
                        onCheckedChange={(v) => setSettings({ ...settings, ti_kat_enabled: v })} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Libellé</Label>
                        <Input value={settings.ti_kat_label}
                          onChange={(e) => setSettings({ ...settings, ti_kat_label: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Pourcentage du brut (%)</Label>
                        <Input type="number" step="0.01" min="0" max="100"
                          value={settings.ti_kat_percentage}
                          onChange={(e) => setSettings({ ...settings, ti_kat_percentage: Number(e.target.value) })} />
                        <p className="text-xs text-muted-foreground">Calculé au prorata du salaire brut de chaque employé.</p>
                      </div>
                    </div>
                  </div>

                  {/* Gratifications config */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2"><Gift className="h-4 w-4" /> Gratifications</h3>
                    {(Object.keys(settings.gratifications) as GratificationKey[]).map((k) => {
                      const g = settings.gratifications[k];
                      return (
                        <div key={k} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <Input value={g.label} className="max-w-xs font-medium"
                              onChange={(e) => setSettings({
                                ...settings,
                                gratifications: { ...settings.gratifications, [k]: { ...g, label: e.target.value } },
                              })} />
                            <Switch checked={g.enabled}
                              onCheckedChange={(v) => setSettings({
                                ...settings,
                                gratifications: { ...settings.gratifications, [k]: { ...g, enabled: v } },
                              })} />
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Mode de calcul</Label>
                              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={g.mode}
                                onChange={(e) => setSettings({
                                  ...settings,
                                  gratifications: { ...settings.gratifications, [k]: { ...g, mode: e.target.value as any } },
                                })}>
                                <option value="percentage">% du brut</option>
                                <option value="fixed">Montant fixe (HTG)</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>{g.mode === "fixed" ? "Montant (HTG)" : "Pourcentage (%)"}</Label>
                              <Input type="number" step="0.01" min="0" value={g.value}
                                onChange={(e) => setSettings({
                                  ...settings,
                                  gratifications: { ...settings.gratifications, [k]: { ...g, value: Number(e.target.value) } },
                                })} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Button onClick={saveSettings} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Enregistrer la configuration
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ---------------- Ti Kat ---------------- */}
          <TabsContent value="ti-kat">
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" /> {settings.ti_kat_label}
                      <Badge variant="secondary">{settings.ti_kat_percentage}% du brut</Badge>
                    </CardTitle>
                    <CardDescription>Suivi mensuel par employé.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={tiKatMonth} onChange={(e) => setTiKatMonth(e.target.value)}>
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={tiKatYear} onChange={(e) => setTiKatYear(e.target.value)}>
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {isAdmin && (
                      <Button size="sm" variant="outline" onClick={initTiKat} className="gap-1">
                        <Calculator className="h-4 w-4" /> Initialiser
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => exportCsv(tiKatRows, `ti-kat-${tiKatPeriod}`)} className="gap-1">
                      <Download className="h-4 w-4" /> CSV
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Stat label="Employés" value={tiKatTotals.count.toString()} />
                  <Stat label="Total à verser" value={`${fmt(tiKatTotals.total)} HTG`} />
                  <Stat label="Payés" value={`${tiKatTotals.paidCount} / ${tiKatTotals.count}`} />
                  <Stat label="Total payé" value={`${fmt(tiKatTotals.paid)} HTG`} accent />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Payé</TableHead>
                        <TableHead>Employé</TableHead>
                        <TableHead className="hidden md:table-cell">Poste</TableHead>
                        <TableHead className="text-right">Brut</TableHead>
                        <TableHead className="text-right">Ti Kat</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tiKatRows.map((r) => (
                        <TableRow key={r.emp.id}>
                          <TableCell>
                            <Checkbox checked={r.pay?.status === "paye"}
                              disabled={!isAdmin}
                              onCheckedChange={() => togglePaid(r, "ti_kat", tiKatPeriod)} />
                          </TableCell>
                          <TableCell className="font-medium">{r.emp.full_name}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.emp.poste || "—"}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(r.base)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(r.amount)}</TableCell>
                          <TableCell>
                            {r.pay?.status === "paye"
                              ? <Badge className="bg-green-600">Payé</Badge>
                              : <Badge variant="outline">Non payé</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!tiKatRows.length && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun employé.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- Gratifications ---------------- */}
          <TabsContent value="gratifications">
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Gratifications</CardTitle>
                    <CardDescription>Primes saisonnières et de fin d'année.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={activeGratif} onChange={(e) => setActiveGratif(e.target.value as GratificationKey)}>
                      {(Object.keys(settings.gratifications) as GratificationKey[]).map((k) => (
                        <option key={k} value={k}>{settings.gratifications[k].label}</option>
                      ))}
                    </select>
                    <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={gratifYear} onChange={(e) => setGratifYear(e.target.value)}>
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {isAdmin && (
                      <Button size="sm" variant="outline" onClick={initGratif} className="gap-1">
                        <Calculator className="h-4 w-4" /> Initialiser
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => exportCsv(gratifRows, `${activeGratif}-${gratifYear}`)} className="gap-1">
                      <Download className="h-4 w-4" /> CSV
                    </Button>
                  </div>
                </div>
                {gratifConf && (
                  <div className="text-sm text-muted-foreground">
                    Mode : <span className="font-medium text-foreground">
                      {gratifConf.mode === "fixed" ? `${fmt(gratifConf.value)} HTG fixe` : `${gratifConf.value}% du brut`}
                    </span>
                    {!gratifConf.enabled && <Badge variant="destructive" className="ml-2">Désactivé</Badge>}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Stat label="Employés" value={gratifTotals.count.toString()} />
                  <Stat label="Total à verser" value={`${fmt(gratifTotals.total)} HTG`} />
                  <Stat label="Payés" value={`${gratifTotals.paidCount} / ${gratifTotals.count}`} />
                  <Stat label="Total payé" value={`${fmt(gratifTotals.paid)} HTG`} accent />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Payé</TableHead>
                        <TableHead>Employé</TableHead>
                        <TableHead className="hidden md:table-cell">Poste</TableHead>
                        <TableHead className="text-right">Brut</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gratifRows.map((r) => (
                        <TableRow key={r.emp.id}>
                          <TableCell>
                            <Checkbox checked={r.pay?.status === "paye"}
                              disabled={!isAdmin}
                              onCheckedChange={() => togglePaid(r, activeGratif, gratifYear)} />
                          </TableCell>
                          <TableCell className="font-medium">{r.emp.full_name}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.emp.poste || "—"}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(r.base)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(r.amount)}</TableCell>
                          <TableCell>
                            {r.pay?.status === "paye"
                              ? <Badge className="bg-green-600">Payé</Badge>
                              : <Badge variant="outline">Non payé</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!gratifRows.length && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun employé.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className={`rounded-lg border p-3 ${accent ? "bg-primary/5 border-primary/30" : ""}`}>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold">{value}</div>
  </div>
);

export default SocialBenefits;
