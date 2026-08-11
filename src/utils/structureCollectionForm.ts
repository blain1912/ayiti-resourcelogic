import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const TYPES = [
  "Direction Générale",
  "Direction Technique",
  "Département",
  "Service",
  "Section",
];

const EXAMPLES: string[][] = [
  ["1", "Direction Générale", "Direction Générale", "—", "Ex: Coordination générale"],
  ["2", "Direction Technique", "Direction des Ressources Humaines", "Direction Générale", ""],
  ["3", "Service", "Service du Personnel", "Direction des Ressources Humaines", ""],
  ["4", "Section", "Section Paie", "Service du Personnel", ""],
];

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadStructureFormPdf = (orgName?: string | null) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();

  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text((orgName || "INSTITUTION").toUpperCase(), 14, 12);
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text("Fiche de collecte — Structures administratives", 14, 22);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    "À remplir par l'institution, puis à retourner pour la mise en place de l'organigramme dans AYITI RH.",
    14,
    28
  );
  doc.setDrawColor(200);
  doc.line(14, 31, width - 14, 31);

  doc.setFontSize(9.5);
  doc.setTextColor(60);
  doc.text("Consignes :", 14, 38);
  const consignes = [
    "1. Listez d'abord les Directions, puis les Départements, Services et Sections.",
    "2. Pour chaque unité, indiquez OBLIGATOIREMENT l'unité dont elle dépend (colonne « Rattachée à »). Mettre « — » si aucune.",
    `3. Types acceptés : ${TYPES.join(" / ")}.`,
    "4. Un nom d'unité doit être unique et écrit exactement de la même manière partout.",
  ];
  consignes.forEach((c, i) => doc.text(c, 18, 43.5 + i * 5));

  autoTable(doc, {
    startY: 66,
    head: [["#", "Type d'unité", "Nom exact de l'unité", "Rattachée à (unité parente)", "Responsable / Observations"]],
    body: [
      ...EXAMPLES,
      ...Array.from({ length: 22 }, (_, i) => [String(i + 5), "", "", "", ""]),
    ],
    theme: "grid",
    headStyles: { fillColor: [40, 70, 120] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 45 },
      2: { cellWidth: 85 },
      3: { cellWidth: 75 },
      4: { cellWidth: 54 },
    },
    styles: { minCellHeight: 9, fontSize: 9 },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index < EXAMPLES.length) {
        data.cell.styles.textColor = [140, 140, 140];
        data.cell.styles.fontStyle = "italic";
      }
    },
    margin: { left: 14, right: 14 },
  });

  const endY = (doc as any).lastAutoTable?.finalY ?? 200;
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text("Rempli par : ______________________________", 14, Math.min(endY + 10, 200));
  doc.text("Fonction : ______________________________", 110, Math.min(endY + 10, 200));
  doc.text("Date : ____ / ____ / ________", 210, Math.min(endY + 10, 200));

  triggerDownload(doc.output("blob"), "Fiche-collecte-structures.pdf");
};

export const downloadStructureFormExcel = (orgName?: string | null) => {
  const wb = XLSX.utils.book_new();

  const readme = [
    ["FICHE DE COLLECTE — STRUCTURES ADMINISTRATIVES"],
    ["Institution :", orgName || ""],
    [],
    ["Instructions :"],
    ["1. Remplissez l'onglet « Structures » : une ligne par unité administrative."],
    ["2. Colonne « type » : " + TYPES.join(" / ")],
    ["3. Colonne « parent » : nom exact de l'unité dont dépend cette unité (laisser vide pour une unité au sommet)."],
    ["4. N'ajoutez pas de colonne et ne modifiez pas la première ligne."],
    ["5. Retournez le fichier rempli pour import dans AYITI RH."],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), "LISEZ-MOI");

  const rows: (string | number)[][] = [["nom", "type", "parent", "responsable", "observations"]];
  rows.push(["Direction Générale", "Direction Générale", "", "", "Exemple — à supprimer"]);
  rows.push(["Direction des Ressources Humaines", "Direction Technique", "Direction Générale", "", "Exemple — à supprimer"]);
  rows.push(["Service du Personnel", "Service", "Direction des Ressources Humaines", "", "Exemple — à supprimer"]);
  for (let i = 0; i < 40; i++) rows.push(["", "", "", "", ""]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  (ws as any)["!cols"] = [{ wch: 42 }, { wch: 22 }, { wch: 42 }, { wch: 26 }, { wch: 34 }];
  XLSX.utils.book_append_sheet(wb, ws, "Structures");

  const help = [["types_autorises"], ...TYPES.map((t) => [t])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(help), "Types");

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  triggerDownload(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    "Fiche-collecte-structures.xlsx"
  );
};

// Modèle officiel : structure des colonnes + exemple complet rempli
export const downloadOfficialStructureTemplate = (orgName?: string | null) => {
  const wb = XLSX.utils.book_new();

  const readme = [
    ["MODÈLE OFFICIEL — IMPORT DES STRUCTURES ADMINISTRATIVES (AYITI RH)"],
    ["Institution :", orgName || ""],
    [],
    ["Règles à respecter impérativement :"],
    ["• Onglet à remplir : « Structures » (ne pas le renommer)."],
    ["• Ligne 1 = en-têtes des colonnes : ne pas la modifier, ne pas ajouter de colonne."],
    ["• nom : obligatoire, unique, écrit exactement de la même façon partout."],
    ["• type : une valeur parmi " + TYPES.join(" / ") + "."],
    ["• parent : nom exact d'une unité déjà listée (vide pour l'unité au sommet)."],
    ["• responsable / observations : facultatifs."],
    ["• Une seule Direction Générale ; les autres unités doivent avoir un parent."],
    ["• Pas de dépendance circulaire (A dépend de B qui dépend de A)."],
    [],
    ["Astuce : consultez l'onglet « Exemple rempli » avant de saisir vos données."],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), "LISEZ-MOI");

  const header = ["nom", "type", "parent", "responsable", "observations"];
  const example: (string | number)[][] = [
    header,
    ["Direction Générale", "Direction Générale", "", "Jean Baptiste", "Unité au sommet"],
    ["Direction Administrative", "Direction Technique", "Direction Générale", "Marie Pierre", ""],
    ["Direction des Ressources Humaines", "Direction Technique", "Direction Générale", "Natacha Lamande", ""],
    ["Département du Personnel", "Département", "Direction des Ressources Humaines", "", ""],
    ["Service de la Paie", "Service", "Département du Personnel", "Paul Joseph", ""],
    ["Section Archives", "Section", "Service de la Paie", "", ""],
  ];
  const wsEx = XLSX.utils.aoa_to_sheet(example);
  (wsEx as any)["!cols"] = [{ wch: 42 }, { wch: 22 }, { wch: 42 }, { wch: 26 }, { wch: 34 }];
  XLSX.utils.book_append_sheet(wb, wsEx, "Exemple rempli");

  const rows: (string | number)[][] = [header];
  for (let i = 0; i < 60; i++) rows.push(["", "", "", "", ""]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  (ws as any)["!cols"] = [{ wch: 42 }, { wch: 22 }, { wch: 42 }, { wch: 26 }, { wch: 34 }];
  XLSX.utils.book_append_sheet(wb, ws, "Structures");

  const help = [["types_autorises"], ...TYPES.map((t) => [t])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(help), "Types");

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  triggerDownload(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    "Modele-officiel-structures-AYITI-RH.xlsx"
  );
};

