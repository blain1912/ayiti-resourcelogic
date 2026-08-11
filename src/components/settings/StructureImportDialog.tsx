import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  normalize,
  validateStructures,
  typeLabel,
  type StructureRow,
  type UnitType,
  type ValidatedRow,
} from "@/lib/structureValidation";

const detectType = (raw: string): UnitType => {
  const t = normalize(raw);
  if (t.includes("generale") || t === "dg") return "direction_generale";
  if (t.includes("direction")) return "direction_technique";
  if (t.includes("departement")) return "departement";
  if (t.includes("section")) return "section";
  return "service";
};

interface Props {
  organizationId: string;
  existingUnits: any[];
  onImported: () => void;
}

const StructureImportDialog = ({ organizationId, existingUnits, onImported }: Props) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [counts, setCounts] = useState({ errorCount: 0, warningCount: 0 });
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setRows([]);
    setCounts({ errorCount: 0, warningCount: 0 });
    setFileName("");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheetName =
        wb.SheetNames.find((n) => normalize(n).includes("structure")) || wb.SheetNames[0];
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" }) as Record<
        string,
        any
      >[];

      const pick = (r: Record<string, any>, keys: string[]) => {
        const entry = Object.entries(r).find(([k]) => keys.includes(normalize(k)));
        return entry ? String(entry[1]).trim() : "";
      };

      const parsed: StructureRow[] = raw
        .map((r) => ({
          name: pick(r, ["nom", "name", "nom de l'unite", "nom exact de l'unite", "structure"]),
          type: detectType(pick(r, ["type", "type d'unite"])),
          parent: pick(r, ["parent", "rattachee a", "rattache a", "unite parente", "depend de"]),
        }))
        .filter((r) => r.name)
        .map((r) => ({ ...r, parent: r.parent.replace(/^[—–-]$/, "") }))
        .filter((r) => !normalize(r.name).startsWith("exemple"));

      const result = validateStructures(parsed, existingUnits);
      setRows(result.rows);
      setCounts({ errorCount: result.errorCount, warningCount: result.warningCount });

      if (result.rows.length === 0) toast.error("Aucune structure trouvée dans le fichier");
      else if (result.errorCount)
        toast.warning(
          `${result.rows.length - result.errorCount} ligne(s) valide(s), ${result.errorCount} bloquée(s)`
        );
      else toast.success(`${result.rows.length} structure(s) prête(s) à importer`);
    } catch (err) {
      console.error(err);
      toast.error("Fichier Excel illisible. Utilisez la fiche de collecte fournie.");
      reset();
    } finally {
      e.target.value = "";
    }
  };

  const importable = rows.filter((r) => !r.skip);

  const runImport = async () => {
    setImporting(true);
    const idByName = new Map<string, string>();
    existingUnits.forEach((u) => idByName.set(normalize(u.name), u.id));

    let inserted = 0;
    const errors: string[] = [];
    let remaining = [...importable];

    for (let pass = 0; pass < 8 && remaining.length; pass++) {
      const next: ValidatedRow[] = [];
      for (const r of remaining) {
        const parentKey = normalize(r.parent);
        if (r.parent && !idByName.has(parentKey) && pass < 7) {
          next.push(r);
          continue;
        }
        const { data, error } = await supabase
          .from("organizational_units")
          .insert({
            name: r.name,
            type: r.type,
            organization_id: organizationId,
            parent_id: r.parent ? idByName.get(parentKey) ?? null : null,
          })
          .select("id")
          .single();
        if (error) errors.push(`${r.name}: ${error.message}`);
        else {
          idByName.set(normalize(r.name), data.id);
          inserted++;
        }
      }
      remaining = next;
    }

    setImporting(false);
    if (inserted) toast.success(`${inserted} structure(s) importée(s)`);
    if (errors.length) {
      console.error(errors);
      toast.error(`${errors.length} erreur(s) : ${errors[0]}`);
    }
    setOpen(false);
    reset();
    onImported();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importer Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importer les structures administratives</DialogTitle>
          <DialogDescription>
            Chargez la fiche de collecte Excel remplie (colonnes : nom, type, parent). Les
            dépendances sont vérifiées puis recréées automatiquement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 p-3">
            <p className="text-sm text-muted-foreground">
              Utilisez le modèle officiel (colonnes attendues + exemple rempli) pour éviter les
              erreurs d'import.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => downloadOfficialStructureTemplate()}
            >
              <Download className="h-4 w-4 mr-2" />
              Modèle Excel officiel
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="structure-file">Fichier Excel (.xlsx)</Label>
            <Input id="structure-file" type="file" accept=".xlsx,.xls" onChange={handleFile} />
            {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
          </div>


          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {importable.length} importable(s)
                </Badge>
                {counts.warningCount > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {counts.warningCount} avertissement(s)
                  </Badge>
                )}
                {counts.errorCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {counts.errorCount} bloquée(s)
                  </Badge>
                )}
              </div>

              <div className="max-h-72 overflow-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Nom</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Rattachée à</th>
                      <th className="text-left p-2">Contrôles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t align-top">
                        <td className="p-2">{r.name}</td>
                        <td className="p-2 text-muted-foreground">{typeLabel(r.type)}</td>
                        <td className="p-2 text-muted-foreground">{r.parent || "—"}</td>
                        <td className="p-2 space-y-1">
                          {r.issues.length === 0 ? (
                            <Badge className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              OK
                            </Badge>
                          ) : (
                            r.issues.map((issue, k) => (
                              <Badge
                                key={k}
                                variant={issue.level === "error" ? "destructive" : "secondary"}
                                className="gap-1 whitespace-normal text-left"
                              >
                                {issue.level === "error" ? (
                                  <XCircle className="h-3 w-3 shrink-0" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                )}
                                {issue.message}
                              </Badge>
                            ))
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {counts.errorCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Les lignes en rouge ne seront pas importées. Corrigez le fichier Excel puis
                  rechargez-le pour les inclure.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
            Annuler
          </Button>
          <Button onClick={runImport} disabled={importing || importable.length === 0}>
            {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importer {importable.length > 0 ? `(${importable.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StructureImportDialog;
