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
import { Upload, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type UnitType = "direction_generale" | "direction_technique" | "service" | "section" | "departement";

interface ParsedRow {
  name: string;
  type: UnitType;
  parent: string;
  issue?: string;
}

const normalize = (v: string) =>
  v
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

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
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setRows([]);
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
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" }) as Record<string, any>[];

      const pick = (r: Record<string, any>, keys: string[]) => {
        const entry = Object.entries(r).find(([k]) => keys.includes(normalize(k)));
        return entry ? String(entry[1]).trim() : "";
      };

      const parsed: ParsedRow[] = raw
        .map((r) => ({
          name: pick(r, ["nom", "name", "nom de l'unite", "nom exact de l'unite", "structure"]),
          type: detectType(pick(r, ["type", "type d'unite"])),
          parent: pick(r, ["parent", "rattachee a", "rattache a", "unite parente", "depend de"]),
        }))
        .filter((r) => r.name && normalize(r.name) !== "exemple")
        .filter((r) => !normalize(r.parent).startsWith("—"));

      const names = new Set(parsed.map((r) => normalize(r.name)));
      existingUnits.forEach((u) => names.add(normalize(u.name)));

      const withIssues = parsed.map((r) => {
        if (existingUnits.some((u) => normalize(u.name) === normalize(r.name)))
          return { ...r, issue: "Existe déjà — sera ignorée" };
        if (r.parent && !names.has(normalize(r.parent)))
          return { ...r, issue: "Parent introuvable — sera créée sans rattachement" };
        return r;
      });

      setRows(withIssues);
      if (withIssues.length === 0) toast.error("Aucune structure valide trouvée dans le fichier");
      else toast.success(`${withIssues.length} structure(s) détectée(s)`);
    } catch (err) {
      console.error(err);
      toast.error("Fichier Excel illisible. Utilisez la fiche de collecte fournie.");
      reset();
    } finally {
      e.target.value = "";
    }
  };

  const runImport = async () => {
    setImporting(true);
    const idByName = new Map<string, string>();
    existingUnits.forEach((u) => idByName.set(normalize(u.name), u.id));

    const pending = rows.filter(
      (r) => !existingUnits.some((u) => normalize(u.name) === normalize(r.name))
    );
    let inserted = 0;
    const errors: string[] = [];
    let remaining = [...pending];

    // Plusieurs passes pour résoudre la hiérarchie parent -> enfant
    for (let pass = 0; pass < 6 && remaining.length; pass++) {
      const next: ParsedRow[] = [];
      for (const r of remaining) {
        const parentKey = normalize(r.parent);
        if (r.parent && !idByName.has(parentKey) && pass < 5) {
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
            dépendances sont recréées automatiquement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="structure-file">Fichier Excel (.xlsx)</Label>
            <Input id="structure-file" type="file" accept=".xlsx,.xls" onChange={handleFile} />
            {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
          </div>

          {rows.length > 0 && (
            <div className="max-h-72 overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Nom</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Rattachée à</th>
                    <th className="text-left p-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 text-muted-foreground">{r.type}</td>
                      <td className="p-2 text-muted-foreground">{r.parent || "—"}</td>
                      <td className="p-2">
                        {r.issue ? (
                          <Badge variant="secondary" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {r.issue}
                          </Badge>
                        ) : (
                          <Badge>Prêt</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
            Annuler
          </Button>
          <Button onClick={runImport} disabled={importing || rows.length === 0}>
            {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importer {rows.length > 0 ? `(${rows.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StructureImportDialog;
