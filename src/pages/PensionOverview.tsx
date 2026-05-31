import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Loader2, Search, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const MIN_AGE = 55;
const MIN_YEARS = 25;
const HORIZON_MONTHS = 60; // employés à suivre dans les 5 prochaines années

const yearsBetween = (from?: string | null, to: Date = new Date()) => {
  if (!from) return 0;
  const d = new Date(from);
  if (Number.isNaN(d.getTime())) return 0;
  return (to.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
};

type Row = {
  id: string;
  full_name: string;
  photo_url: string | null;
  poste: string | null;
  unit: string | null;
  age: number;
  service: number;
  ageOk: boolean;
  serviceOk: boolean;
  eligible: boolean;
  monthsToEligible: number; // 0 si éligible
  status: "accordee" | "en_cours" | "eligible" | "approche" | "loin";
  requestStatus?: string | null;
};

const STATUS_META: Record<Row["status"], { label: string; className: string }> = {
  accordee: { label: "Pension accordée", className: "bg-emerald-600" },
  en_cours: { label: "Dossier en cours", className: "bg-blue-600" },
  eligible: { label: "Éligible", className: "bg-green-600" },
  approche: { label: "S'approche", className: "bg-amber-500" },
  loin: { label: "À long terme", className: "bg-muted text-foreground" },
};

export default function PensionOverview() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: me } = await supabase.from("profiles")
        .select("organization_id").eq("user_id", user.id).maybeSingle();
      if (!me?.organization_id) { setRows([]); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,full_name,photo_url,poste,date_naissance,date_entree_fonction,professor_date_entree_fonction,organization_id,organizational_unit_id")
        .eq("organization_id", me.organization_id)
        .eq("approval_status", "approved");

      const { data: units } = await supabase
        .from("organizational_units")
        .select("id,name")
        .eq("organization_id", me.organization_id);
      const unitMap = new Map((units || []).map((u: any) => [u.id, u.name]));

      const { data: requests } = await supabase
        .from("pension_requests")
        .select("employee_id,status")
        .eq("organization_id", me.organization_id);
      const reqMap = new Map((requests || []).map((r: any) => [r.employee_id, r.status]));

      const computed: Row[] = (profiles || []).map((p: any) => {
        const entryDates = [p.date_entree_fonction, p.professor_date_entree_fonction]
          .filter(Boolean).map((d: string) => new Date(d).getTime()).filter((t) => !Number.isNaN(t));
        const earliest = entryDates.length ? new Date(Math.min(...entryDates)).toISOString().slice(0, 10) : null;
        const ageY = yearsBetween(p.date_naissance);
        const servY = yearsBetween(earliest);
        const age = Math.floor(ageY);
        const service = Math.floor(servY * 10) / 10;
        const ageOk = age >= MIN_AGE;
        const serviceOk = service >= MIN_YEARS;
        const eligible = ageOk || serviceOk;
        const monthsToAge = ageOk ? 0 : Math.max(0, Math.ceil((MIN_AGE - ageY) * 12));
        const monthsToService = serviceOk ? 0 : Math.max(0, Math.ceil((MIN_YEARS - servY) * 12));
        const monthsToEligible = eligible ? 0 : Math.min(monthsToAge, monthsToService);
        const rs = reqMap.get(p.id) as string | undefined;
        let status: Row["status"] = "loin";
        if (rs === "accordee") status = "accordee";
        else if (rs && !["brouillon", "rejetee"].includes(rs)) status = "en_cours";
        else if (eligible) status = "eligible";
        else if (monthsToEligible <= HORIZON_MONTHS) status = "approche";
        return {
          id: p.id,
          full_name: p.full_name || "—",
          photo_url: p.photo_url,
          poste: p.poste,
          unit: p.organizational_unit_id ? (unitMap.get(p.organizational_unit_id) as string) || null : null,
          age, service, ageOk, serviceOk, eligible, monthsToEligible, status, requestStatus: rs || null,
        };
      });

      computed.sort((a, b) => {
        const order = { accordee: 0, en_cours: 1, eligible: 2, approche: 3, loin: 4 } as const;
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return a.monthsToEligible - b.monthsToEligible;
      });

      setRows(computed);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.full_name.toLowerCase().includes(q) ||
      (r.poste || "").toLowerCase().includes(q) ||
      (r.unit || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const counts = useMemo(() => ({
    total: rows.length,
    eligible: rows.filter(r => r.status === "eligible" || r.status === "en_cours").length,
    approche: rows.filter(r => r.status === "approche").length,
    accordee: rows.filter(r => r.status === "accordee").length,
  }), [rows]);

  const byTab = (tab: string) => {
    switch (tab) {
      case "eligible": return filtered.filter(r => r.status === "eligible" || r.status === "en_cours");
      case "approche": return filtered.filter(r => r.status === "approche");
      case "accordee": return filtered.filter(r => r.status === "accordee");
      default: return filtered;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          Suivi des départs à la retraite
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Visualisez la progression de vos employés vers l'éligibilité à la pension
          (âge ≥ {MIN_AGE} ans <em>ou</em> ancienneté ≥ {MIN_YEARS} ans).
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total employés" value={counts.total} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard label="Éligibles / en cours" value={counts.eligible} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
        <StatCard label="Bientôt éligibles (≤5 ans)" value={counts.approche} icon={<Clock className="h-4 w-4 text-amber-600" />} />
        <StatCard label="Pensions accordées" value={counts.accordee} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher par nom, poste, unité..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="approche" className="w-full">
        <TabsList className="w-full overflow-x-auto justify-start">
          <TabsTrigger value="approche">S'approchent ({counts.approche})</TabsTrigger>
          <TabsTrigger value="eligible">Éligibles ({counts.eligible})</TabsTrigger>
          <TabsTrigger value="accordee">Accordées ({counts.accordee})</TabsTrigger>
          <TabsTrigger value="all">Tous ({rows.length})</TabsTrigger>
        </TabsList>
        {["approche", "eligible", "accordee", "all"].map(tab => (
          <TabsContent key={tab} value={tab}>
            <PensionTable rows={byTab(tab)} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardDescription className="flex items-center gap-2 text-xs">{icon}{label}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function PensionTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
        <AlertTriangle className="h-8 w-8" />Aucun employé dans cette catégorie.
      </CardContent></Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employé</TableHead>
              <TableHead>Âge</TableHead>
              <TableHead>Ancienneté</TableHead>
              <TableHead className="min-w-[180px]">Progression</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => {
              const ageProg = Math.min(100, Math.round((r.age / MIN_AGE) * 100));
              const servProg = Math.min(100, Math.round((r.service / MIN_YEARS) * 100));
              const overall = Math.max(ageProg, servProg);
              const meta = STATUS_META[r.status];
              const initials = r.full_name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
              const monthsLabel = r.eligible
                ? "Atteinte"
                : r.monthsToEligible >= 12
                  ? `Dans ${Math.round(r.monthsToEligible / 12)} an${r.monthsToEligible >= 24 ? "s" : ""}`
                  : `Dans ${r.monthsToEligible} mois`;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link to={`/employee/${r.id}`} className="flex items-center gap-3 hover:underline">
                      <Avatar className="h-9 w-9">
                        {r.photo_url ? <AvatarImage src={r.photo_url} /> : null}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.poste || "—"}{r.unit ? ` · ${r.unit}` : ""}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{r.age} ans</div>
                    <div className="text-xs text-muted-foreground">/ {MIN_AGE}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{r.service} ans</div>
                    <div className="text-xs text-muted-foreground">/ {MIN_YEARS}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 min-w-[160px]">
                      <Progress value={overall} className="h-2" />
                      <div className="text-xs text-muted-foreground">Âge {ageProg}% · Service {servProg}%</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{monthsLabel}</TableCell>
                  <TableCell><Badge className={meta.className}>{meta.label}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
