import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type GroupBy = "none" | "category" | "position" | "unit" | "sexe";
type Format = "pdf" | "xlsx";

interface Props {
  organizationId: string;
  organizationName?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const GROUP_LABELS: Record<GroupBy, string> = {
  none: "Liste complète",
  category: "Par catégorie",
  position: "Par poste",
  unit: "Par structure",
  sexe: "Par sexe",
};

const SEXE_LABEL = (v?: string | null) =>
  v === "M" ? "Masculin" : v === "F" ? "Féminin" : "Non renseigné";

export function EmployeeListExport({
  organizationId,
  organizationName,
  open,
  onOpenChange,
}: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [format, setFormat] = useState<Format>("pdf");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `id, full_name, sexe, employee_category, tel_1, tel_2, email,
           position:positions(name, salary),
           unit:organizational_units(name)`
        )
        .eq("organization_id", organizationId)
        .order("full_name");

      if (error) throw error;

      const rows = (data || []).map((p: any) => ({
        name: p.full_name || "Non renseigné",
        sexe: SEXE_LABEL(p.sexe),
        category: p.employee_category || "Non renseigné",
        position: p.position?.name || "—",
        salary: p.position?.salary || null,
        unit: p.unit?.name || "—",
        phone: p.telephone || "—",
        email: p.email || "—",
      }));

      // Group
      const keyFn = (r: typeof rows[number]) => {
        switch (groupBy) {
          case "category":
            return r.category;
          case "position":
            return r.position;
          case "unit":
            return r.unit;
          case "sexe":
            return r.sexe;
          default:
            return "";
        }
      };

      const groups = new Map<string, typeof rows>();
      for (const r of rows) {
        const k = keyFn(r);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(r);
      }
      const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) =>
        a.localeCompare(b, "fr")
      );

      const title = `Liste des employés — ${GROUP_LABELS[groupBy]}`;
      const dateStr = new Date().toLocaleDateString("fr-FR");

      if (format === "pdf") {
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        doc.setFontSize(14);
        doc.text(organizationName || "Organisation", 14, 15);
        doc.setFontSize(11);
        doc.text(title, 14, 22);
        doc.setFontSize(9);
        doc.text(`Généré le ${dateStr} — Total: ${rows.length}`, 14, 28);

        let startY = 34;
        const head = [["Nom", "Sexe", "Catégorie", "Poste", "Salaire (HTG)", "Structure", "Téléphone"]];

        if (groupBy === "none") {
          autoTable(doc, {
            startY,
            head,
            body: rows.map((r) => [
              r.name,
              r.sexe,
              r.category,
              r.position,
              r.salary ? r.salary.toLocaleString("fr-FR") : "—",
              r.unit,
              r.phone,
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [30, 64, 175] },
          });
        } else {
          for (const [groupName, items] of sortedGroups) {
            if (startY > 180) {
              doc.addPage();
              startY = 20;
            }
            doc.setFontSize(11);
            doc.setFont(undefined, "bold");
            doc.text(`${groupName} (${items.length})`, 14, startY);
            doc.setFont(undefined, "normal");
            autoTable(doc, {
              startY: startY + 3,
              head,
              body: items.map((r) => [
                r.name,
                r.sexe,
                r.category,
                r.position,
                r.salary ? r.salary.toLocaleString("fr-FR") : "—",
                r.unit,
                r.phone,
              ]),
              styles: { fontSize: 8 },
              headStyles: { fillColor: [30, 64, 175] },
            });
            // @ts-ignore
            startY = (doc as any).lastAutoTable.finalY + 8;
          }
        }

        doc.save(
          `liste-employes-${groupBy}-${new Date().toISOString().slice(0, 10)}.pdf`
        );
      } else {
        const wb = XLSX.utils.book_new();
        const buildSheet = (items: typeof rows) =>
          XLSX.utils.json_to_sheet(
            items.map((r) => ({
              Nom: r.name,
              Sexe: r.sexe,
              Catégorie: r.category,
              Poste: r.position,
              "Salaire (HTG)": r.salary || "",
              Structure: r.unit,
              Téléphone: r.phone,
              Email: r.email,
            }))
          );

        if (groupBy === "none") {
          XLSX.utils.book_append_sheet(wb, buildSheet(rows), "Employés");
        } else {
          // Summary sheet
          const summary = sortedGroups.map(([g, items]) => ({
            [GROUP_LABELS[groupBy]]: g,
            Effectif: items.length,
          }));
          XLSX.utils.book_append_sheet(
            wb,
            XLSX.utils.json_to_sheet(summary),
            "Résumé"
          );
          for (const [groupName, items] of sortedGroups) {
            const safe = groupName.replace(/[\\/?*[\]:]/g, "").slice(0, 28) || "Sans";
            XLSX.utils.book_append_sheet(wb, buildSheet(items), safe);
          }
        }

        XLSX.writeFile(
          wb,
          `liste-employes-${groupBy}-${new Date().toISOString().slice(0, 10)}.xlsx`
        );
      }

      toast({
        title: "Export réussi",
        description: `${rows.length} employé(s) exporté(s).`,
      });
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erreur d'export",
        description: e.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exporter la liste des employés</DialogTitle>
          <DialogDescription>
            Choisissez le type de regroupement et le format de sortie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Regroupement</Label>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Liste complète</SelectItem>
                <SelectItem value="category">Par catégorie</SelectItem>
                <SelectItem value="position">Par poste</SelectItem>
                <SelectItem value="unit">Par structure</SelectItem>
                <SelectItem value="sexe">Par sexe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as Format)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="pdf" id="fmt-pdf" />
                <Label htmlFor="fmt-pdf" className="font-normal cursor-pointer">PDF</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="xlsx" id="fmt-xlsx" />
                <Label htmlFor="fmt-xlsx" className="font-normal cursor-pointer">Excel</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={loading} className="gap-2">
            <Download className="h-4 w-4" />
            {loading ? "Génération..." : "Générer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
