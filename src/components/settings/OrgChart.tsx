import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Building2 } from "lucide-react";
import { structureTypeLabel } from "@/lib/institutionTypes";
import { exportToPdf } from "@/lib/exportPdf";

interface UnitNode {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  code?: string | null;
  is_active?: boolean | null;
  display_order?: number | null;
  manager_name?: string | null;
}

interface OrgChartProps {
  units: UnitNode[];
  organizationName?: string | null;
  organizationType?: string | null;
}

const buildTree = (units: UnitNode[], parentId: string | null): UnitNode[] =>
  units
    .filter((u) => (u.parent_id ?? null) === parentId)
    .sort(
      (a, b) =>
        (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name)
    );

const NodeCard = ({ unit }: { unit: UnitNode }) => (
  <div
    className={`inline-block min-w-[180px] rounded-lg border bg-card px-4 py-2 text-center shadow-sm ${
      unit.is_active === false ? "opacity-50 border-dashed" : ""
    }`}
  >
    <p className="font-medium text-sm leading-tight">{unit.name}</p>
    <p className="text-xs text-muted-foreground">{structureTypeLabel(unit.type)}</p>
    {unit.code && (
      <Badge variant="outline" className="mt-1 text-[10px]">
        {unit.code}
      </Badge>
    )}
    {unit.manager_name && (
      <p className="text-[11px] text-muted-foreground mt-1">{unit.manager_name}</p>
    )}
  </div>
);

const Branch = ({ units, parentId }: { units: UnitNode[]; parentId: string | null }) => {
  const children = buildTree(units, parentId);
  if (children.length === 0) return null;

  return (
    <ul className="ml-4 border-l border-border pl-4 space-y-3">
      {children.map((child) => (
        <li key={child.id} className="relative">
          <span className="absolute -left-4 top-5 w-4 border-t border-border" aria-hidden />
          <NodeCard unit={child} />
          <Branch units={units} parentId={child.id} />
        </li>
      ))}
    </ul>
  );
};

const OrgChart = ({ units, organizationName, organizationType }: OrgChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const roots = useMemo(() => buildTree(units, null), [units]);

  if (units.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-10">
        Aucune structure enregistrée. Créez-en une pour afficher l'organigramme.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            exportToPdf({
              elementId: "org-chart-export",
              fileName: `organigramme-${(organizationName || "institution")
                .toLowerCase()
                .replace(/\s+/g, "-")}.pdf`,
              orientation: "landscape",
            })
          }
        >
          <Download className="h-4 w-4 mr-2" />
          Exporter l'organigramme (PDF)
        </Button>
      </div>

      <div
        id="org-chart-export"
        ref={chartRef}
        data-pdf-section
        className="overflow-x-auto rounded-lg border bg-background p-6"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{organizationName || "Institution"}</p>
            {organizationType && (
              <p className="text-xs text-muted-foreground">{organizationType}</p>
            )}
          </div>
        </div>

        <div className="space-y-6 min-w-[600px]">
          {roots.map((root) => (
            <div key={root.id}>
              <NodeCard unit={root} />
              <Branch units={units} parentId={root.id} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrgChart;
