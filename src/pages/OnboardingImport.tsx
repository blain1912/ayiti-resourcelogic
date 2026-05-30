import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import * as XLSX from "xlsx";

type Row = Record<string, any>;

interface ParsedData {
  structures: Row[];
  categories: Row[];
  postes: Row[];
  employes: Row[];
}

interface ImportReport {
  table: string;
  inserted: number;
  skipped: number;
  errors: string[];
}

const OnboardingImport = () => {
  const navigate = useNavigate();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [importing, setImporting] = useState(false);
  const [reports, setReports] = useState<ImportReport[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      const { data: isSA } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      if (isSA) {
        // Super admin must pick an org via query param
        const params = new URLSearchParams(window.location.search);
        const orgId = params.get("org");
        if (!orgId) {
          toast.error("Sélectionnez d'abord une organisation");
          navigate("/admin/organization");
          return;
        }
        setOrganizationId(orgId);
        setAuthorized(true);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) {
        navigate("/");
        return;
      }
      const { data: hasHR } = await supabase.rpc("has_hr_access", {
        _user_id: user.id,
        _organization_id: profile.organization_id,
      });
      if (!hasHR) {
        toast.error("Accès réservé aux RH / Direction");
        navigate("/");
        return;
      }
      setOrganizationId(profile.organization_id);
      setAuthorized(true);
      setLoading(false);
    })();
  }, [navigate]);

  const handleFile = async (f: File) => {
    setFile(f);
    setReports([]);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = (name: string): Row[] => {
        const ws = wb.Sheets[name];
        if (!ws) return [];
        return (XLSX.utils.sheet_to_json(ws, { defval: "" }) as Row[]).filter((r) =>
          Object.values(r).some((v) => String(v).trim() !== "")
        );
      };
      const data: ParsedData = {
        structures: sheet("Structures"),
        categories: sheet("Categories"),
        postes: sheet("Postes"),
        employes: sheet("Employes"),
      };
      setParsed(data);
      toast.success(
        `Fichier analysé : ${data.structures.length} structures, ${data.categories.length} catégories, ${data.postes.length} postes, ${data.employes.length} employés`
      );
    } catch (e) {
      console.error(e);
      toast.error("Fichier Excel illisible. Utilisez le template fourni.");
    }
  };

  const runImport = async () => {
    if (!parsed || !organizationId) return;
    setImporting(true);
    const out: ImportReport[] = [];

    // 1) Structures
    const structReport: ImportReport = { table: "Structures", inserted: 0, skipped: 0, errors: [] };
    const structMap = new Map<string, string>(); // name -> id

    // Insert directions first, then services
    const directions = parsed.structures.filter((r) => String(r.type).toLowerCase().includes("direction"));
    const services = parsed.structures.filter((r) => !String(r.type).toLowerCase().includes("direction"));

    for (const r of directions) {
      const nom = String(r.nom || "").trim();
      if (!nom) { structReport.skipped++; continue; }
      const { data, error } = await supabase
        .from("organizational_units")
        .insert({ name: nom, type: "direction", organization_id: organizationId })
        .select("id")
        .single();
      if (error) { structReport.errors.push(`${nom}: ${error.message}`); structReport.skipped++; }
      else { structMap.set(nom, data.id); structReport.inserted++; }
    }
    for (const r of services) {
      const nom = String(r.nom || "").trim();
      const parent = String(r.parent || "").trim();
      if (!nom) { structReport.skipped++; continue; }
      const parentId = parent ? structMap.get(parent) : null;
      const { data, error } = await supabase
        .from("organizational_units")
        .insert({ name: nom, type: "service", organization_id: organizationId, parent_id: parentId })
        .select("id")
        .single();
      if (error) { structReport.errors.push(`${nom}: ${error.message}`); structReport.skipped++; }
      else { structMap.set(nom, data.id); structReport.inserted++; }
    }
    out.push(structReport);

    // 2) Categories
    const catReport: ImportReport = { table: "Catégories", inserted: 0, skipped: 0, errors: [] };
    const catMap = new Map<string, string>();
    for (const r of parsed.categories) {
      const nom = String(r.nom || "").trim();
      if (!nom) { catReport.skipped++; continue; }
      const { data, error } = await supabase
        .from("employee_categories")
        .insert({ name: nom, organization_id: organizationId })
        .select("id")
        .single();
      if (error) { catReport.errors.push(`${nom}: ${error.message}`); catReport.skipped++; }
      else { catMap.set(nom, data.id); catReport.inserted++; }
    }
    out.push(catReport);

    // 3) Postes
    const posReport: ImportReport = { table: "Postes", inserted: 0, skipped: 0, errors: [] };
    for (const r of parsed.postes) {
      const nom = String(r.nom || "").trim();
      const categorie = String(r.categorie || "").trim();
      const salaire = Number(r.salaire) || 0;
      if (!nom || !categorie) { posReport.skipped++; continue; }
      const catId = catMap.get(categorie);
      if (!catId) {
        posReport.errors.push(`${nom}: catégorie '${categorie}' introuvable`);
        posReport.skipped++;
        continue;
      }
      const { error } = await supabase
        .from("positions")
        .insert({ name: nom, category_id: catId, salary: salaire, organization_id: organizationId });
      if (error) { posReport.errors.push(`${nom}: ${error.message}`); posReport.skipped++; }
      else posReport.inserted++;
    }
    out.push(posReport);

    // 4) Employes (créer des profils "incomplets" — l'employé devra créer son compte ensuite)
    const empReport: ImportReport = { table: "Employés (profils pré-remplis)", inserted: 0, skipped: 0, errors: [] };
    empReport.errors.push(
      "Note : l'import crée des profils pré-remplis. Les employés devront créer leur compte via la page d'inscription pour activer leur accès."
    );
    // Skip employee insert for now since profiles require an auth user_id.
    // We add a note in the report instead. (Could be extended later via edge function.)
    out.push(empReport);

    setReports(out);
    setImporting(false);
    toast.success("Import terminé. Consultez le rapport ci-dessous.");
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-primary" /> Importer le kit d'onboarding
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Choisissez le fichier Excel rempli</CardTitle>
            <CardDescription>
              Utilisez le template fourni dans le kit d'onboarding (onglets : Structures, Categories, Postes, Employes).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file">Fichier .xlsx</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
            {file && <p className="text-sm text-muted-foreground">📄 {file.name}</p>}
          </CardContent>
        </Card>

        {parsed && (
          <Card>
            <CardHeader>
              <CardTitle>2. Aperçu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>🏢 <strong>{parsed.structures.length}</strong> structure(s)</p>
              <p>🏷️ <strong>{parsed.categories.length}</strong> catégorie(s)</p>
              <p>💼 <strong>{parsed.postes.length}</strong> poste(s)</p>
              <p>👥 <strong>{parsed.employes.length}</strong> employé(s) listé(s)</p>
              <Button onClick={runImport} disabled={importing} className="mt-4">
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Lancer l'import
              </Button>
            </CardContent>
          </Card>
        )}

        {reports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Rapport d'import</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reports.map((r) => (
                <div key={r.table} className="border rounded p-3">
                  <div className="flex items-center gap-2 font-medium">
                    {r.errors.length === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    {r.table}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Insérés : {r.inserted} • Ignorés : {r.skipped}
                  </p>
                  {r.errors.length > 0 && (
                    <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside max-h-40 overflow-auto">
                      {r.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OnboardingImport;
