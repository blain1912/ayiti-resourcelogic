export type UnitType =
  | "direction_generale"
  | "direction_technique"
  | "service"
  | "section"
  | "departement";

export interface StructureRow {
  name: string;
  type: UnitType;
  parent: string;
}

export type IssueLevel = "error" | "warning";

export interface RowIssue {
  level: IssueLevel;
  message: string;
}

export interface ValidatedRow extends StructureRow {
  issues: RowIssue[];
  skip: boolean; // ligne non importée
}

export const normalize = (v: string) =>
  (v ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

const HIERARCHY: Record<UnitType, number> = {
  direction_generale: 0,
  direction_technique: 1,
  departement: 2,
  service: 3,
  section: 4,
};

const TYPE_LABEL: Record<UnitType, string> = {
  direction_generale: "Direction Générale",
  direction_technique: "Direction Technique",
  departement: "Département",
  service: "Service",
  section: "Section",
};

export interface ExistingUnit {
  id: string;
  name: string;
  type: UnitType;
  parent_id: string | null;
}

/**
 * Contrôles automatiques de cohérence des dépendances.
 * - error   : la ligne n'est pas importée
 * - warning : la ligne est importée mais signalée
 */
export const validateStructures = (
  rows: StructureRow[],
  existingUnits: ExistingUnit[]
): { rows: ValidatedRow[]; errorCount: number; warningCount: number } => {
  const existingByKey = new Map(existingUnits.map((u) => [normalize(u.name), u]));
  const fileByKey = new Map<string, StructureRow>();
  const seen = new Map<string, number>();

  rows.forEach((r) => {
    const key = normalize(r.name);
    seen.set(key, (seen.get(key) || 0) + 1);
    if (!fileByKey.has(key)) fileByKey.set(key, r);
  });

  const parentKeyOf = (key: string): string | null => {
    const fromFile = fileByKey.get(key);
    if (fromFile) return fromFile.parent ? normalize(fromFile.parent) : null;
    const existing = existingByKey.get(key);
    if (existing?.parent_id) {
      const p = existingUnits.find((u) => u.id === existing.parent_id);
      return p ? normalize(p.name) : null;
    }
    return null;
  };

  const detectCycle = (startKey: string): string[] | null => {
    const path: string[] = [startKey];
    let current: string | null = parentKeyOf(startKey);
    let guard = 0;
    while (current && guard++ < 50) {
      if (path.includes(current)) return [...path, current];
      path.push(current);
      current = parentKeyOf(current);
    }
    return null;
  };

  const validated: ValidatedRow[] = rows.map((r) => {
    const issues: RowIssue[] = [];
    const key = normalize(r.name);
    const parentKey = r.parent ? normalize(r.parent) : "";

    if (!r.name) issues.push({ level: "error", message: "Nom manquant" });

    if ((seen.get(key) || 0) > 1)
      issues.push({ level: "error", message: "Nom en double dans le fichier" });

    if (existingByKey.has(key))
      issues.push({ level: "error", message: "Structure déjà existante — ignorée" });

    if (parentKey) {
      if (parentKey === key)
        issues.push({ level: "error", message: "Une unité ne peut pas dépendre d'elle-même" });
      else {
        const parentRow = fileByKey.get(parentKey);
        const parentExisting = existingByKey.get(parentKey);
        if (!parentRow && !parentExisting) {
          issues.push({
            level: "error",
            message: `Parent introuvable : « ${r.parent} »`,
          });
        } else {
          const parentType = parentRow?.type ?? parentExisting!.type;
          if (HIERARCHY[parentType] >= HIERARCHY[r.type]) {
            issues.push({
              level: "warning",
              message: `Hiérarchie incohérente : ${TYPE_LABEL[r.type]} rattaché à ${TYPE_LABEL[parentType]}`,
            });
          }
          const cycle = detectCycle(key);
          if (cycle)
            issues.push({
              level: "error",
              message: `Dépendance circulaire : ${cycle.join(" → ")}`,
            });
        }
      }
    } else if (r.type !== "direction_generale") {
      issues.push({
        level: "warning",
        message: "Aucun rattachement — sera créée au niveau racine",
      });
    }

    return { ...r, issues, skip: issues.some((i) => i.level === "error") };
  });

  // Plusieurs racines de type Direction Générale
  const dgRoots = validated.filter((r) => r.type === "direction_generale" && !r.skip);
  const existingDg = existingUnits.filter((u) => u.type === "direction_generale");
  if (dgRoots.length + existingDg.length > 1) {
    dgRoots.forEach((r) =>
      r.issues.push({
        level: "warning",
        message: "Plusieurs Directions Générales détectées",
      })
    );
  }

  return {
    rows: validated,
    errorCount: validated.filter((r) => r.skip).length,
    warningCount: validated.filter((r) => !r.skip && r.issues.length > 0).length,
  };
};

export const typeLabel = (t: UnitType) => TYPE_LABEL[t];
