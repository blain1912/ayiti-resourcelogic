import jsPDF from "jspdf";
import type { LeaveRequest } from "@/hooks/useLeaveRequests";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  conge_annuel: "Congé annuel",
  conge_maladie: "Congé maladie",
  conge_maternite: "Congé maternité",
  conge_paternite: "Congé paternité",
  conge_sans_solde: "Congé sans solde",
  conge_exceptionnel: "Congé exceptionnel",
  conge_etudes: "Congé d'études / formation",
};

interface OrgInfo {
  name?: string | null;
  city?: string | null;
  logo_url?: string | null;
}

interface EmployeeInfo {
  full_name?: string | null;
  prenom?: string | null;
  nom?: string | null;
  matricule?: string | null;
  poste?: string | null;
  unite?: string | null;
  date_entree_fonction?: string | null;
}

function fmtDate(d?: string | null) {
  if (!d) return "..............................";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return d;
  }
}

export function generateLeaveRequestPdf(
  request: Partial<LeaveRequest>,
  employee: EmployeeInfo,
  org: OrgInfo
) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text((org.name || "ORGANISATION").toUpperCase(), pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Direction des Ressources Humaines", pageW / 2, y, { align: "center" });
  y += 8;

  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("DEMANDE DE CONGÉ", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("(Formulaire réglementaire — à transmettre par voie hiérarchique)", pageW / 2, y, { align: "center" });
  y += 10;

  // Body helper
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const employeeName =
    employee.full_name ||
    `${employee.prenom || ""} ${employee.nom || ""}`.trim() ||
    "..............................";

  const line = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 55, y);
    y += 7;
  };

  line("Nom et prénom :", employeeName);
  line("Matricule :", employee.matricule || "..............................");
  line("Fonction / Poste :", employee.poste || "..............................");
  line("Direction / Service :", employee.unite || "..............................");
  line("Date d'entrée en fonction :", fmtDate(employee.date_entree_fonction));
  y += 3;

  line(
    "Nature du congé :",
    LEAVE_TYPE_LABELS[request.leave_type || ""] || ".............................."
  );
  line("Date de départ :", fmtDate(request.start_date));
  line("Date de reprise :", fmtDate(request.end_date));
  y += 3;

  doc.setFont("helvetica", "bold");
  doc.text("Motif :", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const reason = request.reason || "";
  const reasonLines = doc.splitTextToSize(
    reason || "...........................................................................................................................................\n...........................................................................................................................................\n...........................................................................................................................................",
    pageW - 2 * margin
  );
  doc.text(reasonLines, margin, y);
  y += reasonLines.length * 5 + 6;

  // Signature blocks
  const sigY = Math.max(y, 180);
  const colW = (pageW - 2 * margin) / 3;

  const sigBlock = (x: number, title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, x + colW / 2, sigY, { align: "center" });
    doc.setLineWidth(0.3);
    doc.line(x + 5, sigY + 25, x + colW - 5, sigY + 25);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text("Date et signature", x + colW / 2, sigY + 30, { align: "center" });
  };
  sigBlock(margin, "L'INTÉRESSÉ(E)");
  sigBlock(margin + colW, "SUPÉRIEUR HIÉRARCHIQUE");
  sigBlock(margin + colW * 2, "DIRECTION RH");

  // Footer note
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text(
    "Conformément au Statut Général de la Fonction Publique, l'administration peut reporter ou échelonner le congé en raison des nécessités de service.",
    pageW / 2,
    footerY,
    { align: "center", maxWidth: pageW - 2 * margin }
  );

  const fileName = `demande-conge-${(employee.nom || employeeName).replace(/\s+/g, "-")}.pdf`;
  doc.save(fileName);
}
