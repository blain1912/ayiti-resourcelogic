import jsPDF from "jspdf";

const PAGE_W = 215.9;
const PAGE_H = 279.4;
const ML = 20;
const MR = 20;
const MT = 20;
const MB = 20;
const CW = PAGE_W - ML - MR;
const LINE_H = 7;
const SECTION_GAP = 4;

interface FieldDef {
  label: string;
  width?: "full" | "half";
}

interface SectionDef {
  title: string;
  fields: FieldDef[];
}

const buildSections = (cap: OrganizationCapabilities): SectionDef[] => {
  const sections: SectionDef[] = [];

  sections.push({
    title: "INFORMATIONS PERSONNELLES",
    fields: [
      ...(cap.supports_budget_code ? [{ label: "Code budgétaire", width: "half" as const }] : []),
      { label: "Photo", width: "half" },
      { label: "Nom", width: "half" },
      { label: "Prénom", width: "half" },
      { label: "Date de naissance (JJ/MM/AAAA)", width: "half" },
      { label: "Lieu de naissance", width: "half" },
      { label: "Sexe (M / F)", width: "half" },
      { label: "Nationalité", width: "half" },
      { label: "État civil", width: "half" },
      { label: "Groupe sanguin", width: "half" },
      { label: "Religion", width: "half" },
      { label: "NIF", width: "half" },
      { label: "CIN", width: "half" },
    ],
  });

  const adresseFields: FieldDef[] = [];
  if (cap.supports_mission_address) {
    adresseFields.push({ label: "Adresse dans le pays de mission", width: "full" });
  }
  if (cap.supports_home_address) {
    adresseFields.push(
      { label: "Rue / Adresse", width: "full" },
      { label: "Ville", width: "half" },
      { label: "Département", width: "half" },
      { label: "Code postal", width: "half" },
    );
  }
  if (adresseFields.length) sections.push({ title: "ADRESSE", fields: adresseFields });

  sections.push({
    title: "CONTACT",
    fields: [
      { label: "Téléphone 1", width: "half" },
      { label: "Téléphone 2", width: "half" },
      { label: "WhatsApp", width: "half" },
      { label: "Email", width: "half" },
    ],
  });

  sections.push({
    title: "INFORMATIONS PROFESSIONNELLES",
    fields: [
      { label: `${cap.entry_date_label} (JJ/MM/AAAA)`, width: "half" },
      ...(cap.supports_years_of_service
        ? [{ label: "Ancienneté (années)", width: "half" as const }]
        : []),
      { label: "Structure d'affectation", width: "half" },
      { label: "Catégorie d'employé", width: "half" },
      { label: "Poste", width: "half" },
      ...(cap.supports_function_title
        ? [{ label: "Fonction / responsabilité", width: "half" as const }]
        : []),
      ...(cap.supports_staff_status
        ? [{ label: "Statut administratif", width: "full" as const }]
        : []),
      ...(cap.supports_employment_type
        ? [{
            label: "Type d'emploi (Permanent / Contractuel / Journalier / Professeur)",
            width: "full" as const,
          }]
        : []),
      { label: "Statut (Actif / Inactif)", width: "half" },
      { label: "Salaire", width: "half" },
    ],
  });

  if (cap.supports_education_fields) {
    sections.push({
      title: "FORMATION ET QUALIFICATIONS",
      fields: [{ label: "Niveau d'études", width: "half" }],
    });
  }

  if (cap.supports_teaching_role) {
    sections.push({
      title: "POSTE CUMULÉ — PROFESSEUR (si applicable)",
      fields: [
        { label: "Grade", width: "half" },
        { label: "Code budgétaire (prof.)", width: "half" },
        { label: "Salaire professoral", width: "half" },
        { label: "Date d'entrée en fonction (prof.)", width: "half" },
      ],
    });
  }

  sections.push({
    title: "CONTACT D'URGENCE",
    fields: [
      { label: "Nom", width: "half" },
      { label: "Prénom", width: "half" },
      { label: "Lien de parenté", width: "half" },
      { label: "Téléphone", width: "half" },
      { label: "WhatsApp", width: "half" },
    ],
  });

  return sections;
};

export const generateBlankEmployeeForm = (
  organizationName?: string,
  capabilities: OrganizationCapabilities = DEFAULT_CAPABILITIES,
) => {
  const sections = buildSections(capabilities);

  const pdf = new jsPDF("p", "mm", "letter");
  let y = MT;

  const checkPageBreak = (needed: number) => {
    if (y + needed > PAGE_H - MB) {
      pdf.addPage();
      y = MT;
    }
  };

  // Title
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  const title = organizationName
    ? `${organizationName.toUpperCase()}`
    : "FICHE EMPLOYÉ";
  pdf.text(title, PAGE_W / 2, y, { align: "center" });
  y += 8;

  pdf.setFontSize(13);
  pdf.text("FICHE EMPLOYÉ", PAGE_W / 2, y, { align: "center" });
  y += 4;

  // Subtitle line
  pdf.setDrawColor(50, 50, 50);
  pdf.setLineWidth(0.5);
  pdf.line(ML, y, PAGE_W - MR, y);
  y += 6;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(120, 120, 120);
  pdf.text("Veuillez remplir tous les champs marqués. Ce formulaire doit être complété et remis au service des Ressources Humaines.", ML, y);
  pdf.setTextColor(0, 0, 0);
  y += 8;

  for (const section of sections) {
    // Section header needs at least 20mm
    checkPageBreak(20);

    // Section title
    pdf.setFillColor(230, 235, 245);
    pdf.rect(ML, y, CW, LINE_H, "F");
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(section.title, ML + 3, y + 5);
    y += LINE_H + 2;

    // Fields
    let col = 0; // 0 = left, 1 = right
    const halfW = (CW - 4) / 2;

    for (const field of section.fields) {
      const isHalf = field.width === "half";
      const fieldW = isHalf ? halfW : CW;
      const fieldH = LINE_H + 2;

      if (isHalf && col === 0) {
        checkPageBreak(fieldH);
        // Left column
        drawField(pdf, ML, y, fieldW, fieldH, field.label);
        col = 1;
      } else if (isHalf && col === 1) {
        // Right column (same y)
        drawField(pdf, ML + halfW + 4, y, fieldW, fieldH, field.label);
        col = 0;
        y += fieldH;
      } else {
        // Full width
        if (col === 1) {
          // Previous half was left-only, move down
          y += fieldH;
          col = 0;
        }
        checkPageBreak(fieldH);
        drawField(pdf, ML, y, fieldW, fieldH, field.label);
        y += fieldH;
      }
    }

    // If last field was left-half only
    if (col === 1) {
      y += LINE_H + 2;
      col = 0;
    }

    y += SECTION_GAP;
  }

  // Signature area
  checkPageBreak(30);
  y += 6;
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);

  const sigW = (CW - 10) / 2;
  // Left: employee
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Signature de l'employé", ML, y);
  pdf.line(ML, y + 15, ML + sigW, y + 15);
  pdf.text("Date : ____/____/________", ML, y + 22);

  // Right: HR
  const rx = ML + sigW + 10;
  pdf.text("Signature RH", rx, y);
  pdf.line(rx, y + 15, rx + sigW, y + 15);
  pdf.text("Date : ____/____/________", rx, y + 22);

  // Page numbers
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Page ${p} / ${totalPages}`, PAGE_W / 2, PAGE_H - 10, { align: "center" });
    pdf.setTextColor(0, 0, 0);
  }

  pdf.save("Fiche_Employe_Vierge.pdf");
};

function drawField(pdf: jsPDF, x: number, y: number, w: number, h: number, label: string) {
  // Label
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(80, 80, 80);
  pdf.text(label, x + 1, y + 3);
  pdf.setTextColor(0, 0, 0);

  // Underline for writing
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.2);
  pdf.line(x, y + h - 1, x + w, y + h - 1);
}
