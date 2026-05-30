import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import * as XLSX from "xlsx";

interface OrgInfo {
  name: string;
  type?: string | null;
  logo_url?: string | null;
}

// ===== PDF helpers =====
const addHeader = (doc: jsPDF, org: OrgInfo, title: string) => {
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(org.name.toUpperCase(), 14, 12);
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(title, 14, 22);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    "Kit d'onboarding — à remplir puis transmettre au service informatique pour saisie",
    14,
    28
  );
  doc.setDrawColor(200);
  doc.line(14, 31, doc.internal.pageSize.getWidth() - 14, 31);
};

const buildStructuresPdf = (org: OrgInfo): ArrayBuffer => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  addHeader(doc, org, "1. Structures organisationnelles");
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(
    "Listez toutes les Directions, puis les Services rattachés à chaque Direction.",
    14,
    38
  );

  const emptyRows = Array.from({ length: 18 }, () => ["", "", "", ""]);
  autoTable(doc, {
    startY: 44,
    head: [["#", "Type (Direction / Service)", "Nom de la structure", "Rattachée à (si Service)"]],
    body: emptyRows.map((r, i) => [String(i + 1), ...r.slice(1)]),
    theme: "grid",
    headStyles: { fillColor: [40, 70, 120] },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 60 },
      2: { cellWidth: 110 },
      3: { cellWidth: 90 },
    },
    styles: { minCellHeight: 10, fontSize: 10 },
  });
  return doc.output("arraybuffer");
};

const buildCategoriesPdf = (org: OrgInfo): ArrayBuffer => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  addHeader(doc, org, "2. Catégories d'employés");
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(
    "Listez les catégories d'employés utilisées dans votre organisation (ex: Cadre, Technicien, Agent, Professeur).",
    14,
    38
  );

  const emptyRows = Array.from({ length: 14 }, () => ["", "", ""]);
  autoTable(doc, {
    startY: 44,
    head: [["#", "Nom de la catégorie", "Niveau d'études requis", "Salaire de base mensuel (HTG)"]],
    body: emptyRows.map((r, i) => [String(i + 1), ...r]),
    theme: "grid",
    headStyles: { fillColor: [40, 70, 120] },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 90 },
      2: { cellWidth: 90 },
      3: { cellWidth: 80 },
    },
    styles: { minCellHeight: 11, fontSize: 10 },
  });
  return doc.output("arraybuffer");
};

const buildPostesPdf = (org: OrgInfo): ArrayBuffer => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  addHeader(doc, org, "3. Postes / Fonctions");
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(
    "Listez tous les postes/fonctions, leur rattachement (direction ou service) et la catégorie associée.",
    14,
    38
  );

  const emptyRows = Array.from({ length: 18 }, () => ["", "", "", ""]);
  autoTable(doc, {
    startY: 44,
    head: [["#", "Intitulé du poste", "Rattaché à (direction/service)", "Catégorie", "Salaire (HTG)"]],
    body: emptyRows.map((r, i) => [String(i + 1), ...r]),
    theme: "grid",
    headStyles: { fillColor: [40, 70, 120] },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 80 },
      2: { cellWidth: 80 },
      3: { cellWidth: 60 },
      4: { cellWidth: 40 },
    },
    styles: { minCellHeight: 10, fontSize: 10 },
  });
  return doc.output("arraybuffer");
};

const buildEmployesTablePdf = (org: OrgInfo): ArrayBuffer => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  addHeader(doc, org, "4a. Employés — Listing compact");
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text("Tableau récapitulatif des employés. Pour les détails complets, utilisez les fiches individuelles.", 14, 38);

  const cols = ["#", "Nom", "Prénom", "Sexe", "Date naiss.", "NIF", "CIN", "Téléphone", "Email", "Poste", "Catégorie", "Date entrée"];
  const emptyRows = Array.from({ length: 16 }, (_, i) => [String(i + 1), ...Array(cols.length - 1).fill("")]);
  autoTable(doc, {
    startY: 44,
    head: [cols],
    body: emptyRows,
    theme: "grid",
    headStyles: { fillColor: [40, 70, 120], fontSize: 8 },
    styles: { minCellHeight: 9, fontSize: 8 },
  });
  return doc.output("arraybuffer");
};

const buildEmployeFichePdf = (org: OrgInfo): ArrayBuffer => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  addHeader(doc, org, "4b. Fiche employé");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Une fiche par employé. Imprimez en plusieurs exemplaires si besoin.", 14, 38);

  let y = 46;
  const field = (label: string, lines = 1) => {
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(label, 14, y);
    y += 3;
    doc.setDrawColor(150);
    for (let i = 0; i < lines; i++) {
      doc.line(14, y + i * 7, 196, y + i * 7);
    }
    y += lines * 7 + 3;
  };
  const section = (title: string) => {
    y += 2;
    doc.setFillColor(40, 70, 120);
    doc.rect(14, y, 182, 6, "F");
    doc.setFontSize(10);
    doc.setTextColor(255);
    doc.text(title, 16, y + 4.2);
    doc.setTextColor(20);
    y += 10;
  };

  section("Identité");
  field("Nom de famille");
  field("Prénom(s)");
  field("Sexe (M/F)              Date de naissance (JJ/MM/AAAA)              Lieu de naissance");
  field("Nationalité              État civil              Groupe sanguin");
  field("NIF                                                  CIN");

  section("Coordonnées");
  field("Adresse (rue, ville, département)", 2);
  field("Téléphone 1              Téléphone 2              WhatsApp");
  field("Email");

  section("Fonction");
  field("Direction / Service de rattachement");
  field("Poste / Fonction              Catégorie              Date d'entrée en fonction");
  field("Type d'emploi (titulaire/contractuel)              Code budgétaire");

  section("Contact d'urgence");
  field("Nom et prénom              Lien de parenté");
  field("Téléphone              WhatsApp");

  return doc.output("arraybuffer");
};

// ===== Excel template =====
const buildExcelTemplate = (org: OrgInfo): ArrayBuffer => {
  const wb = XLSX.utils.book_new();

  const readme = [
    ["KIT D'IMPORT — " + org.name],
    [],
    ["Instructions :"],
    ["1. Remplissez les 4 onglets : Structures, Categories, Postes, Employes"],
    ["2. Respectez exactement l'orthographe entre les onglets (noms de structures, catégories)"],
    ["3. Ne modifiez PAS les en-têtes (première ligne)"],
    ["4. Une fois rempli, importez ce fichier via 'Importer le kit' dans l'application"],
    [],
    ["Format des dates : AAAA-MM-JJ (ex: 1985-03-15)"],
    ["Format des salaires : nombre entier sans symbole (ex: 45000)"],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), "LISEZ-MOI");

  const structures = [["nom", "type", "parent"]];
  for (let i = 0; i < 30; i++) structures.push(["", "", ""]);
  const wsStruct = XLSX.utils.aoa_to_sheet(structures);
  (wsStruct as any)["!cols"] = [{ wch: 40 }, { wch: 18 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsStruct, "Structures");

  const categories = [["nom", "niveau_etudes", "salaire_base"]];
  for (let i = 0; i < 20; i++) categories.push(["", "", ""]);
  const wsCat = XLSX.utils.aoa_to_sheet(categories);
  (wsCat as any)["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsCat, "Categories");

  const postes = [["nom", "structure", "categorie", "salaire"]];
  for (let i = 0; i < 30; i++) postes.push(["", "", "", ""]);
  const wsPos = XLSX.utils.aoa_to_sheet(postes);
  (wsPos as any)["!cols"] = [{ wch: 35 }, { wch: 35 }, { wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsPos, "Postes");

  const employes = [[
    "nom", "prenom", "sexe", "date_naissance", "lieu_naissance",
    "nif", "cin", "tel_1", "email",
    "adresse", "structure", "poste", "categorie",
    "date_entree", "code_budgetaire", "contact_urgence_nom", "contact_urgence_tel",
  ]];
  for (let i = 0; i < 50; i++) employes.push(Array(employes[0].length).fill("") as string[]);
  const wsEmp = XLSX.utils.aoa_to_sheet(employes);
  (wsEmp as any)["!cols"] = employes[0].map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsEmp, "Employes");

  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
};

// ===== Main entry =====
export const generateOnboardingKit = async (org: OrgInfo): Promise<Blob> => {
  const zip = new JSZip();

  const readme =
    `KIT D'ONBOARDING — ${org.name}\n` +
    `Généré le : ${new Date().toLocaleDateString("fr-FR")}\n\n` +
    `Contenu :\n` +
    `  • 01-Structures.pdf         → Lister Directions et Services\n` +
    `  • 02-Categories.pdf         → Lister les catégories d'employés\n` +
    `  • 03-Postes.pdf             → Lister les postes/fonctions\n` +
    `  • 04a-Employes-Listing.pdf  → Tableau compact des employés\n` +
    `  • 04b-Employes-Fiche.pdf    → Fiche individuelle (1 par employé)\n` +
    `  • Import-Employes.xlsx      → Template Excel pour import direct\n\n` +
    `WORKFLOW :\n` +
    `1. Imprimer ou remplir les PDF à l'écran\n` +
    `2. OU remplir directement le fichier Excel\n` +
    `3. Transmettre au service informatique pour saisie\n` +
    `4. Le fichier Excel peut être importé directement via la page "Importer le kit"\n`;

  zip.file("LISEZ-MOI.txt", readme);
  zip.file("01-Structures.pdf", buildStructuresPdf(org));
  zip.file("02-Categories.pdf", buildCategoriesPdf(org));
  zip.file("03-Postes.pdf", buildPostesPdf(org));
  zip.file("04a-Employes-Listing.pdf", buildEmployesTablePdf(org));
  zip.file("04b-Employes-Fiche.pdf", buildEmployeFichePdf(org));
  zip.file("Import-Employes.xlsx", buildExcelTemplate(org));

  return zip.generateAsync({ type: "blob" });
};

export const downloadKit = async (org: OrgInfo) => {
  const blob = await generateOnboardingKit(org);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = org.name.replace(/[^a-z0-9]+/gi, "_");
  a.download = `Kit-Onboarding-${safeName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
