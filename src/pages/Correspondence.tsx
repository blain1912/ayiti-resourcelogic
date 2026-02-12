import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Trash2, FileText, Send, Edit, Eye, Search, Mail, Archive, Filter,
  Check, ChevronRight, ChevronLeft, User, PenTool, Download, CheckCircle2,
  FileDown, Clock, XCircle, ShieldCheck, MessageSquare, Lock, History, Hash,
  Settings2, Minus, RotateCcw
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";

// ──── Constants ────
const CATEGORIES = [
  { value: "recrutement", label: "Recrutement" },
  { value: "discipline", label: "Discipline" },
  { value: "carriere", label: "Carrière" },
  { value: "administration", label: "Administration" },
  { value: "conges", label: "Congés" },
  { value: "remuneration", label: "Rémunération" },
  { value: "formation", label: "Formation" },
  { value: "evaluation", label: "Évaluation" },
  { value: "depart", label: "Départ" },
  { value: "contrat_service", label: "Contrat de service" },
  { value: "autre", label: "Autre" },
];

const DOCUMENT_TYPES = [
  { value: "lettre", label: "Lettre" },
  { value: "decision", label: "Décision" },
  { value: "note", label: "Note de service" },
  { value: "circulaire", label: "Circulaire" },
  { value: "attestation", label: "Attestation" },
  { value: "certificat", label: "Certificat" },
  { value: "convocation", label: "Convocation" },
  { value: "rapport", label: "Rapport" },
  { value: "contrat", label: "Contrat de service" },
];

const CATEGORY_COLORS: Record<string, string> = {
  recrutement: "bg-blue-100 text-blue-800", discipline: "bg-red-100 text-red-800",
  carriere: "bg-purple-100 text-purple-800", administration: "bg-slate-100 text-slate-800",
  conges: "bg-green-100 text-green-800", remuneration: "bg-amber-100 text-amber-800",
  formation: "bg-cyan-100 text-cyan-800", evaluation: "bg-orange-100 text-orange-800",
  depart: "bg-rose-100 text-rose-800", contrat_service: "bg-violet-100 text-violet-800",
  autre: "bg-gray-100 text-gray-800",
};

const TYPE_COLORS: Record<string, string> = {
  lettre: "bg-indigo-100 text-indigo-800", decision: "bg-red-100 text-red-800",
  note: "bg-yellow-100 text-yellow-800", circulaire: "bg-teal-100 text-teal-800",
  attestation: "bg-emerald-100 text-emerald-800", certificat: "bg-green-100 text-green-800",
  convocation: "bg-orange-100 text-orange-800", rapport: "bg-blue-100 text-blue-800",
  contrat: "bg-violet-100 text-violet-800",
};

const VARIABLE_SUGGESTIONS = [
  { key: "{{nom}}", label: "Nom complet" }, { key: "{{prenom}}", label: "Prénom" },
  { key: "{{nom_famille}}", label: "Nom de famille" }, { key: "{{civilite}}", label: "Monsieur/Madame" },
  { key: "{{matricule}}", label: "Matricule" },
  { key: "{{poste}}", label: "Poste" }, { key: "{{service}}", label: "Service/Unité" },
  { key: "{{date}}", label: "Date du jour" }, { key: "{{date_embauche}}", label: "Date d'embauche" },
  { key: "{{organisation}}", label: "Nom de l'institution" }, { key: "{{en_tete}}", label: "En-tête document" },
  { key: "{{ville}}", label: "Ville" }, { key: "{{signataire}}", label: "Nom du signataire" },
  { key: "{{titre_signataire}}", label: "Titre du signataire" },
  { key: "{{cin_signataire}}", label: "CIN du signataire" },
  { key: "{{nif_signataire}}", label: "NIF du signataire" },
  { key: "{{civilite_signataire}}", label: "Monsieur/Madame (signataire)" },
  { key: "{{email}}", label: "Email" },
  { key: "{{telephone}}", label: "Téléphone" }, { key: "{{nif}}", label: "NIF" },
  { key: "{{cin}}", label: "CIN" },
  { key: "{{salaire_mensuel}}", label: "Salaire mensuel" }, { key: "{{salaire_annuel}}", label: "Salaire annuel" },
  { key: "{{adresse}}", label: "Adresse complète" }, { key: "{{annee_en_cours}}", label: "Année en cours" },
  { key: "{{nif_employe}}", label: "NIF de l'employé" },
  { key: "{{organisation_court}}", label: "Sigle/Nom court de l'org." },
  { key: "{{organisation_avec_article}}", label: "Le/La/L' + Nom de l'org." },
  { key: "{{date_debut_contrat}}", label: "Date début contrat" },
  { key: "{{date_fin_contrat}}", label: "Date fin contrat" },
];

const GENERATION_STEPS = [
  { id: 1, label: "Modèle", icon: FileText },
  { id: 2, label: "Destinataire", icon: User },
  { id: 3, label: "Contenu", icon: Edit },
  { id: 4, label: "Signature", icon: PenTool },
  { id: 5, label: "Aperçu & PDF", icon: FileDown },
];

const APPROVAL_WORKFLOW_STEPS = [
  { role: "directeur_rh", label: "Direction RH", order: 1 },
  { role: "directeur_administratif", label: "Direction Administrative", order: 2 },
  { role: "directeur_general", label: "Directeur Général", order: 3 },
];

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", pending_validation: "En validation", generated: "Généré",
  validated: "Validé", rejected: "Rejeté", signed: "Signé", archived: "Archivé",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800", pending_validation: "bg-amber-100 text-amber-800",
  generated: "bg-blue-100 text-blue-800", validated: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800", signed: "bg-emerald-100 text-emerald-800",
  archived: "bg-slate-100 text-slate-800",
};

const APPROVAL_STATUS_ICONS: Record<string, any> = {
  pending: Clock, approved: CheckCircle2, rejected: XCircle,
};

// ──── Types ────
interface Template {
  id: string; title: string; category: string; category_label: string | null;
  document_type: string; subject: string | null; body: string; variables: string[];
  is_active: boolean; created_at: string;
}

interface Approval {
  id: string; record_id: string; step_order: number; step_role: string;
  step_label: string; approver_id: string | null; status: string;
  comment: string | null; decided_at: string | null; created_at: string;
  approver?: { full_name: string | null; prenom: string | null; nom: string | null } | null;
}

interface CorrespondenceRecord {
  id: string; title: string; category: string; subject: string | null; body: string;
  sent_at: string; status: string; signature_name: string | null; signature_title: string | null;
  signed_at: string | null; document_type: string | null; category_label: string | null;
  is_locked: boolean; reference_number: string | null;
  recipient: { id: string; full_name: string | null; prenom: string | null; nom: string | null };
  approvals?: Approval[];
}

interface AuditLogEntry {
  id: string; record_id: string; action: string; performed_by: string;
  details: any; created_at: string;
  performer?: { full_name: string | null; prenom: string | null; nom: string | null };
}

// ──── Role check helper ────
type UserRole = string;

function canCreateTemplates(roles: UserRole[]) {
  return roles.some(r => ["admin", "directeur_general", "directeur_administratif", "directeur_rh"].includes(r));
}
function canGenerateCorrespondence(roles: UserRole[]) {
  return roles.some(r => ["admin", "directeur_general", "directeur_administratif", "directeur_rh"].includes(r));
}
function canValidate(roles: UserRole[], stepRole: string) {
  const hierarchy: Record<string, string[]> = {
    directeur_rh: ["admin", "directeur_general", "directeur_rh"],
    directeur_administratif: ["admin", "directeur_general", "directeur_administratif"],
    directeur_general: ["admin", "directeur_general"],
  };
  return roles.some(r => (hierarchy[stepRole] || []).includes(r));
}

// ════════════════════════════════════════
export default function Correspondence() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [records, setRecords] = useState<CorrespondenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [orgDocumentHeader, setOrgDocumentHeader] = useState("");
  const [orgCity, setOrgCity] = useState("Port-au-Prince");
  const [orgSignerName, setOrgSignerName] = useState("");
  const [orgSignerTitle, setOrgSignerTitle] = useState("");
  const [orgLetterheadUrl, setOrgLetterheadUrl] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);

  // Template form
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [title, setTitle] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("administration");
  const [documentType, setDocumentType] = useState("lettre");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Generation wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [signatureTitle, setSignatureTitle] = useState("");
  const [signatureCin, setSignatureCin] = useState("");
  const [signatureNif, setSignatureNif] = useState("");
  const [civiliteSignataire, setCiviliteSignataire] = useState("MONSIEUR");
  const [articleOrganisation, setArticleOrganisation] = useState("L'");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [enableValidation, setEnableValidation] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // Text adjustment settings
  const [pdfFontSize, setPdfFontSize] = useState(13);
  const [pdfLineHeight, setPdfLineHeight] = useState(1.7);
  const [pdfMargin, setPdfMargin] = useState(2.5);
  const [pdfVerticalAlign, setPdfVerticalAlign] = useState<"top" | "center" | "bottom">("bottom");
  const [showAdjustments, setShowAdjustments] = useState(false);

  // Preview & approval
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<CorrespondenceRecord | null>(null);
  const [approvalComment, setApprovalComment] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  // Audit log
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditRecordId, setAuditRecordId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  // ──── Data loading ────
  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase.from("profiles").select("id, organization_id").eq("user_id", user.id).maybeSingle();
      if (!profile?.organization_id) return;
      setOrganizationId(profile.organization_id);
      setProfileId(profile.id);

      const [orgRes, tplRes, recRes, empRes, unitRes, posRes, rolesRes] = await Promise.all([
        supabase.from("organizations").select("name, document_header_text, document_city, default_signer_name, default_signer_title, pdf_font_size, pdf_line_height, pdf_margin, pdf_vertical_align, letterhead_url").eq("id", profile.organization_id).maybeSingle(),
        (supabase.from("correspondence_templates") as any).select("*").eq("organization_id", profile.organization_id).order("created_at", { ascending: false }),
        (supabase.from("correspondence_records") as any).select("id, title, category, subject, body, sent_at, status, signature_name, signature_title, signed_at, document_type, category_label, recipient_id, is_locked, reference_number").eq("organization_id", profile.organization_id).order("sent_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, prenom, nom, email, tel_1, nif, cin, date_entree_fonction, unit_id, position_id, sexe").eq("organization_id", profile.organization_id).eq("approval_status", "approved"),
        supabase.from("organizational_units").select("id, name").eq("organization_id", profile.organization_id),
        supabase.from("positions").select("id, name, salary").eq("organization_id", profile.organization_id),
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("organization_id", profile.organization_id),
      ]);

      setOrganizationName(orgRes.data?.name || "");
      setOrgDocumentHeader((orgRes.data as any)?.document_header_text || "");
      setOrgCity((orgRes.data as any)?.document_city || "Port-au-Prince");
      setOrgSignerName((orgRes.data as any)?.default_signer_name || "");
      setOrgSignerTitle((orgRes.data as any)?.default_signer_title || "");
      setOrgLetterheadUrl((orgRes.data as any)?.letterhead_url || null);
      // Load saved PDF preferences
      const orgData = orgRes.data as any;
      if (orgData?.pdf_font_size != null) setPdfFontSize(orgData.pdf_font_size);
      if (orgData?.pdf_line_height != null) setPdfLineHeight(orgData.pdf_line_height);
      if (orgData?.pdf_margin != null) setPdfMargin(orgData.pdf_margin);
      if (orgData?.pdf_vertical_align) setPdfVerticalAlign(orgData.pdf_vertical_align);
      setTemplates((tplRes.data as any[]) || []);
      setEmployees(empRes.data || []);
      setUnits(unitRes.data || []);
      setPositions(posRes.data || []);
      setUserRoles((rolesRes.data || []).map((r: any) => r.role));

      // Load records with recipients and approvals
      const recs = (recRes.data as any[]) || [];
      if (recs.length > 0) {
        const recipientIds = [...new Set(recs.map((r: any) => r.recipient_id))];
        const recordIds = recs.map((r: any) => r.id);

        const [recipientRes, approvalsRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name, prenom, nom").in("id", recipientIds),
          (supabase.from("correspondence_approvals") as any).select("*").in("record_id", recordIds).order("step_order", { ascending: true }),
        ]);

        const profileMap = new Map((recipientRes.data || []).map(p => [p.id, p]));
        const approvals = (approvalsRes.data as any[]) || [];

        // Load approver names
        const approverIds = [...new Set(approvals.filter(a => a.approver_id).map(a => a.approver_id))];
        let approverMap = new Map<string, any>();
        if (approverIds.length > 0) {
          const { data: approverProfiles } = await supabase.from("profiles").select("id, full_name, prenom, nom").in("id", approverIds);
          approverMap = new Map((approverProfiles || []).map(p => [p.id, p]));
        }

        setRecords(recs.map((r: any) => ({
          ...r,
          recipient: profileMap.get(r.recipient_id) || { id: r.recipient_id, full_name: null, prenom: null, nom: null },
          approvals: approvals.filter(a => a.record_id === r.id).map(a => ({
            ...a,
            approver: a.approver_id ? approverMap.get(a.approver_id) : null,
          })),
        })));
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ──── Load audit logs ────
  const loadAuditLogs = async (recordId: string) => {
    setAuditRecordId(recordId);
    const { data } = await (supabase.from("correspondence_audit_log") as any)
      .select("*")
      .eq("record_id", recordId)
      .order("created_at", { ascending: true });
    
    const logs = (data || []) as AuditLogEntry[];
    if (logs.length > 0) {
      const performerIds = [...new Set(logs.map(l => l.performed_by))];
      const { data: performers } = await supabase.from("profiles").select("user_id, full_name, prenom, nom").in("user_id", performerIds);
      const perfMap = new Map((performers || []).map(p => [p.user_id, p]));
      setAuditLogs(logs.map(l => ({ ...l, performer: perfMap.get(l.performed_by) || null })));
    } else {
      setAuditLogs([]);
    }
  };

  // ──── Send notification ────
  const sendNotification = async (type: string, recordId: string, targetUserIds: string[], refNum?: string, docTitle?: string, stepLabel?: string) => {
    if (!organizationId || targetUserIds.length === 0) return;
    try {
      await supabase.functions.invoke("send-correspondence-notification", {
        body: { type, record_id: recordId, organization_id: organizationId, target_user_ids: targetUserIds, reference_number: refNum, document_title: docTitle, step_label: stepLabel },
      });
    } catch (e) { console.error("Notification error:", e); }
  };

  // ──── Template CRUD ────
  const handleSaveTemplate = async () => {
    if (!organizationId || !profileId) return;
    const detectedVars = VARIABLE_SUGGESTIONS.filter(v => body.includes(v.key)).map(v => v.key);
    // Map categoryLabel to DB enum when it matches a valid correspondence_category
    const DB_CATEGORY_ENUMS = [
      "attestation_travail", "certificat_travail", "lettre_recommandation", "note_service",
      "decision", "convocation", "mise_en_demeure", "avertissement", "felicitations", "contrat_service", "autre"
    ];
    const dbCategory = DB_CATEGORY_ENUMS.includes(categoryLabel) ? categoryLabel : "autre";
    const templateData = {
      title, category: dbCategory, category_label: categoryLabel, document_type: documentType,
      subject: subject || null, body, variables: detectedVars, is_active: isActive,
      organization_id: organizationId, created_by: profileId,
    } as any;
    let error;
    if (editingTemplate) {
      ({ error } = await (supabase.from("correspondence_templates") as any).update(templateData).eq("id", editingTemplate.id));
    } else {
      ({ error } = await (supabase.from("correspondence_templates") as any).insert(templateData));
    }
    if (error) { toast({ variant: "destructive", title: "Erreur", description: error.message }); return; }
    toast({ title: editingTemplate ? "Modèle mis à jour" : "Modèle créé" });
    setTemplateOpen(false); resetTemplateForm(); loadData();
  };

  const resetTemplateForm = () => {
    setTitle(""); setCategoryLabel("administration"); setDocumentType("lettre");
    setSubject(""); setBody(""); setIsActive(true); setEditingTemplate(null);
  };

  const handleEditTemplate = (tpl: Template) => {
    setEditingTemplate(tpl); setTitle(tpl.title); setCategoryLabel(tpl.category_label || "administration");
    setDocumentType(tpl.document_type || "lettre"); setSubject(tpl.subject || "");
    setBody(tpl.body); setIsActive(tpl.is_active); setTemplateOpen(true);
  };

  const handleToggleActive = async (tpl: Template) => {
    const { error } = await (supabase.from("correspondence_templates") as any).update({ is_active: !tpl.is_active }).eq("id", tpl.id);
    if (error) { toast({ variant: "destructive", title: "Erreur", description: error.message }); return; }
    toast({ title: tpl.is_active ? "Modèle archivé" : "Modèle réactivé" }); loadData();
  };

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await (supabase.from("correspondence_templates") as any).delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Erreur", description: error.message }); return; }
    toast({ title: "Modèle supprimé" }); loadData();
  };

  // ──── Variable replacement ────
  const replaceVariables = (text: string, employee: any) => {
    const unitName = units.find(u => u.id === employee?.unit_id)?.name || "";
    const pos = positions.find(p => p.id === employee?.position_id);
    const posName = pos?.name || "";
    const salaireMensuel = pos?.salary ? Number(pos.salary) : 0;
    const salaireAnnuel = salaireMensuel * 12;
    const civilite = employee?.sexe === "F" ? "Madame" : "Monsieur";
    return text
      .replace(/\{\{nom\}\}/g, `<strong>${employee?.prenom && employee?.nom ? `${employee.prenom} ${employee.nom}` : employee?.full_name || ""}</strong>`)
      .replace(/\{\{prenom\}\}/g, employee?.prenom || "")
      .replace(/\{\{nom_famille\}\}/g, employee?.nom || "")
      .replace(/\{\{civilite\}\}/g, civilite)
      .replace(/\{\{matricule\}\}/g, employee?.nif || "N/A")
      .replace(/\{\{email\}\}/g, employee?.email || "")
      .replace(/\{\{telephone\}\}/g, employee?.tel_1 || "")
      .replace(/\{\{nif\}\}/g, employee?.nif || "")
      .replace(/\{\{cin\}\}/g, `<strong>${employee?.cin || ""}</strong>`)
      .replace(/\{\{date\}\}/g, `<strong>${format(new Date(), "d MMMM yyyy", { locale: fr })}</strong>`)
      .replace(/\{\{date_embauche\}\}/g, employee?.date_entree_fonction ? `<strong>${format(new Date(employee.date_entree_fonction), "d MMMM yyyy", { locale: fr })}</strong>` : "N/A")
      .replace(/\{\{poste\}\}/g, `<strong>${posName}</strong>`)
      .replace(/\{\{service\}\}/g, unitName)
      .replace(/\{\{organisation\}\}/g, organizationName)
      .replace(/\{\{en_tete\}\}/g, `<strong>${orgDocumentHeader || organizationName}</strong>`)
      .replace(/\{\{ville\}\}/g, `<strong>${orgCity}</strong>`)
      .replace(/\{\{signataire\}\}/g, `<strong>${signatureName || orgSignerName}</strong>`)
      .replace(/\{\{titre_signataire\}\}/g, signatureTitle || orgSignerTitle)
      .replace(/\{\{civilite_signataire\}\}/g, civiliteSignataire)
      .replace(/\{\{salaire_mensuel\}\}/g, salaireMensuel ? `<strong>${salaireMensuel.toLocaleString("fr-FR")} HTG</strong>` : "N/A")
      .replace(/\{\{salaire_annuel\}\}/g, salaireAnnuel ? `<strong>${salaireAnnuel.toLocaleString("fr-FR")} HTG</strong>` : "N/A")
      .replace(/\{\{adresse\}\}/g, [employee?.adresse_rue, employee?.adresse_ville, employee?.adresse_departement].filter(Boolean).join(", ") || "N/A")
      .replace(/\{\{annee_en_cours\}\}/g, `<strong>${new Date().getFullYear()}</strong>`)
      .replace(/\{\{nif_employe\}\}/g, `<strong>${employee?.nif || ""}</strong>`)
      .replace(/\{\{cin_signataire\}\}/g, `<strong>${signatureCin || "___________"}</strong>`)
      .replace(/\{\{nif_signataire\}\}/g, `<strong>${signatureNif || "___________"}</strong>`)
      .replace(/\{\{organisation_court\}\}/g, `<strong>${organizationName}</strong>`)
      .replace(/\{\{organisation_avec_article\}\}/g, `<strong>${articleOrganisation}${organizationName}</strong>`)
      .replace(/\{\{date_debut_contrat\}\}/g, `<strong>${contractStartDate ? new Date(contractStartDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "___________"}</strong>`)
      .replace(/\{\{date_fin_contrat\}\}/g, `<strong>${contractEndDate ? new Date(contractEndDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "___________"}</strong>`);
  };

  // ──── Generation Wizard ────
  const openWizard = (tpl?: Template) => {
    setWizardStep(tpl ? 2 : 1);
    setSelectedTemplate(tpl || null);
    setSelectedRecipient(""); setSendBody(tpl?.body || ""); setSendSubject(tpl?.subject || "");
    setSignatureName(orgSignerName); setSignatureTitle(orgSignerTitle); setSignatureCin(""); setSignatureNif(""); setCiviliteSignataire("MONSIEUR"); setArticleOrganisation("L'"); setContractStartDate(""); setContractEndDate(""); setEnableValidation(true);
    setWizardOpen(true);
  };

  const onSelectRecipient = (empId: string) => {
    setSelectedRecipient(empId);
    const emp = employees.find(e => e.id === empId);
    if (emp && selectedTemplate) {
      setSendBody(replaceVariables(selectedTemplate.body, emp));
      setSendSubject(replaceVariables(selectedTemplate.subject || "", emp));
    }
  };

  const handleGenerate = async () => {
    if (!organizationId || !profileId || !selectedRecipient || !selectedTemplate) return;

    const status = enableValidation ? "pending_validation" : (signatureName ? "signed" : "generated");

    const { data: record, error } = await (supabase.from("correspondence_records") as any).insert({
      organization_id: organizationId, template_id: selectedTemplate.id,
      recipient_id: selectedRecipient, title: selectedTemplate.title,
      category: selectedTemplate.category, category_label: selectedTemplate.category_label,
      document_type: selectedTemplate.document_type, subject: sendSubject || null,
      body: sendBody, sent_by: profileId, status,
      signature_name: signatureName || null, signature_title: signatureTitle || null,
      signed_at: signatureName && !enableValidation ? new Date().toISOString() : null,
      is_locked: status === "signed",
    }).select("id, reference_number").single();

    if (error) { toast({ variant: "destructive", title: "Erreur", description: error.message }); return; }

    // Create approval workflow steps
    if (enableValidation && record) {
      const approvalSteps = APPROVAL_WORKFLOW_STEPS.map(step => ({
        record_id: record.id,
        organization_id: organizationId,
        step_order: step.order,
        step_role: step.role,
        step_label: step.label,
        status: "pending",
      }));
      await (supabase.from("correspondence_approvals") as any).insert(approvalSteps);

      // Notify first approver (Direction RH users)
      const firstStep = APPROVAL_WORKFLOW_STEPS[0];
      const { data: approverRoles } = await supabase.from("user_roles").select("user_id").eq("organization_id", organizationId).eq("role", firstStep.role as any);
      if (approverRoles?.length) {
        sendNotification("validation_required", record.id, approverRoles.map(r => r.user_id), record.reference_number, selectedTemplate.title, firstStep.label);
      }
    } else if (record) {
      // Notify recipient that document is available
      const emp = employees.find(e => e.id === selectedRecipient);
      if (emp?.user_id) {
        sendNotification("document_available", record.id, [emp.user_id], record.reference_number, selectedTemplate.title);
      }
    }

    toast({ title: enableValidation ? "Correspondance soumise pour validation" : "Correspondance générée et archivée" });
    setWizardOpen(false); loadData();
  };

  // ──── Approval actions ────
  const handleApproval = async (approval: Approval, action: "approved" | "rejected") => {
    if (!profileId) return;
    const { error } = await (supabase.from("correspondence_approvals") as any)
      .update({ status: action, approver_id: profileId, comment: approvalComment || null, decided_at: new Date().toISOString() })
      .eq("id", approval.id);
    if (error) { toast({ variant: "destructive", title: "Erreur", description: error.message }); return; }

    // Find the record for notification context
    const rec = records.find(r => r.id === approval.record_id);

    if (action === "rejected") {
      await (supabase.from("correspondence_records") as any).update({ status: "rejected" }).eq("id", approval.record_id);
      // Notify creator
      if (rec) {
        const { data: recData } = await (supabase.from("correspondence_records") as any).select("sent_by").eq("id", approval.record_id).single();
        if (recData?.sent_by) {
          const { data: creatorProfile } = await supabase.from("profiles").select("user_id").eq("id", recData.sent_by).single();
          if (creatorProfile) sendNotification("document_rejected", approval.record_id, [creatorProfile.user_id], rec.reference_number || undefined, rec.title, approval.step_label);
        }
      }
    } else {
      const { data: allSteps } = await (supabase.from("correspondence_approvals") as any)
        .select("id, status, step_order, step_role, step_label").eq("record_id", approval.record_id).order("step_order");
      const remaining = (allSteps || []).filter((s: any) => s.status === "pending" && s.id !== approval.id);
      if (remaining.length === 0) {
        await (supabase.from("correspondence_records") as any).update({ status: "validated" }).eq("id", approval.record_id);
        // Notify recipient
        if (rec?.recipient) {
          const { data: recipientProfile } = await supabase.from("profiles").select("user_id").eq("id", rec.recipient.id).single();
          if (recipientProfile) sendNotification("document_signed", approval.record_id, [recipientProfile.user_id], rec.reference_number || undefined, rec.title);
        }
      } else {
        // Notify next approver
        const nextStep = remaining[0];
        const { data: nextApprovers } = await supabase.from("user_roles").select("user_id").eq("organization_id", organizationId!).eq("role", nextStep.step_role as any);
        if (nextApprovers?.length && rec) {
          sendNotification("validation_required", approval.record_id, nextApprovers.map((r: any) => r.user_id), rec.reference_number || undefined, rec.title, nextStep.step_label);
        }
      }
    }

    setApprovalComment("");
    toast({ title: action === "approved" ? "Étape validée" : "Correspondance rejetée" });
    loadData();

    if (previewRecord?.id === approval.record_id) {
      const updated = records.find(r => r.id === approval.record_id);
      if (updated) setPreviewRecord(updated);
    }
  };

  // ──── QR Code verification data ────
  const getQRVerificationData = (rec?: CorrespondenceRecord) => {
    const refNum = rec?.reference_number || 'CORR-' + format(new Date(), "yyyyMMdd-HHmm");
    const docDate = rec ? format(new Date(rec.sent_at), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    const emp = rec ? rec.recipient : employees.find(e => e.id === selectedRecipient);
    const empName = getEmployeeName(emp);
    const docType = rec?.document_type || selectedTemplate?.document_type || "lettre";
    return JSON.stringify({
      ref: refNum,
      org: organizationName,
      type: getTypeLabel(docType),
      date: docDate,
      dest: empName,
      status: rec?.status || "generated",
      signed: rec?.signed_at ? format(new Date(rec.signed_at), "yyyy-MM-dd") : null,
    });
  };

  // ──── PDF / Print ────
  const handlePrintPDF = async (rec?: CorrespondenceRecord) => {
    const bodyText = rec?.body || sendBody;
    const subjectText = rec?.subject || sendSubject;
    const sigName = rec?.signature_name || signatureName;
    const sigTitle = rec?.signature_title || signatureTitle;
    const emp = rec ? rec.recipient : employees.find(e => e.id === selectedRecipient);
    const empName = getEmployeeName(emp);
    const docType = rec?.document_type || selectedTemplate?.document_type || "lettre";

    // Generate QR code data URL
    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL(getQRVerificationData(rec), { width: 100, margin: 1 });
    } catch (e) { console.error("QR generation error:", e); }

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${rec?.title || selectedTemplate?.title || "Correspondance"}</title>
      <style>
        @page { size: 8.5in 11in; margin: 0; }
        html, body { height: 100%; margin: 0; }
        body { font-family: 'Times New Roman', serif; font-size: ${pdfFontSize}pt; line-height: ${pdfLineHeight}; color: #000; position: relative; min-height: 100vh; }
        .letterhead-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; object-fit: cover; }
        .content-wrapper { position: relative; z-index: 1; padding: ${pdfMargin}cm; display: flex; flex-direction: column; justify-content: ${pdfVerticalAlign === "top" ? "flex-start" : pdfVerticalAlign === "center" ? "center" : "flex-end"}; min-height: calc(100vh - ${pdfMargin * 2}cm); box-sizing: border-box; }
        .header { display: none; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 11pt; }
        .recipient { margin-bottom: 20px; } .recipient strong { display: block; }
        .doc-title { font-weight: bold; text-align: center; margin: 35px 0 30px 0; font-size: 15pt; text-transform: uppercase; }
        .subject { font-weight: bold; text-align: center; margin: 20px 0; font-size: 14pt; text-decoration: underline; }
        .body-content { white-space: pre-wrap; text-align: justify; margin-bottom: 40px; margin-top: 15px; }
        .body-content b, .body-content strong { font-weight: bold; }
        .signature-block { margin-top: 50px; text-align: right; }
        .signature-block .name { font-weight: bold; font-size: 13pt; }
        .signature-block .title { font-style: italic; color: #555; }
        .signature-block .date { margin-top: 8px; font-size: 11pt; color: #555; }
        .footer { display: none; }
        .qr-verification { margin-top: 40px; padding-top: 15px; border-top: 1px solid #ddd; display: flex; align-items: center; gap: 12px; }
        .qr-verification img { width: 80px; height: 80px; }
        .qr-verification .qr-label { font-size: 8pt; color: #888; line-height: 1.4; }
        @media print { .letterhead-bg { position: fixed; print-color-adjust: exact; -webkit-print-color-adjust: exact; } body { padding: 0; } }
      </style></head><body>
      ${orgLetterheadUrl ? `<img class="letterhead-bg" src="${orgLetterheadUrl}" alt="" />` : ""}
      <div class="content-wrapper">
      <div class="header"><h1>${organizationName}</h1><div class="org">${getTypeLabel(docType)}</div></div>
      <div class="doc-title">${getTypeLabel(docType)}</div>
      <div class="meta"><div>Réf : ${rec?.reference_number || 'CORR-' + format(new Date(), "yyyyMMdd-HHmm")}</div><div>${format(new Date(), "d MMMM yyyy", { locale: fr })}</div></div>
      ${subjectText ? `<div class="subject">Objet : ${subjectText}</div>` : ""}
      <div class="body-content">${bodyText}</div>
      ${sigName ? `<div class="signature-block"><div class="name">${sigName}</div>${sigTitle ? `<div class="title">${sigTitle}</div>` : ""}<div class="date">Signé le ${format(new Date(), "d MMMM yyyy", { locale: fr })}</div></div>` : ""}
      ${qrDataUrl ? `<div class="qr-verification"><img src="${qrDataUrl}" alt="QR Code de vérification" /><div class="qr-label">QR Code d'authentification<br/>Réf : ${rec?.reference_number || 'CORR-' + format(new Date(), "yyyyMMdd-HHmm")}<br/>Scannez pour vérifier l'authenticité du document</div></div>` : ""}
      </div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  // ──── Helpers ────
  const getCategoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label || cat;
  const getTypeLabel = (type: string) => DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  const getEmployeeName = (e: any) => e?.prenom && e?.nom ? `${e.prenom} ${e.nom}` : e?.full_name || "Sans nom";

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || (t.category_label || "autre") === filterCategory;
    const matchesType = filterType === "all" || (t.document_type || "lettre") === filterType;
    const matchesStatus = showArchived ? !t.is_active : t.is_active;
    return matchesSearch && matchesCategory && matchesType && matchesStatus;
  });

  const filteredRecords = records.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.recipient?.prenom + " " + r.recipient?.nom).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pending validations for current user's role
  const pendingValidations = records.filter(r =>
    r.status === "pending_validation" &&
    r.approvals?.some(a => a.status === "pending" && canValidate(userRoles, a.step_role) &&
      // All previous steps must be approved
      !r.approvals!.some(prev => prev.step_order < a.step_order && prev.status !== "approved")
    )
  );

  const activeTemplates = templates.filter(t => t.is_active);
  const selectedEmployee = employees.find(e => e.id === selectedRecipient);

  const isReadOnly = !canGenerateCorrespondence(userRoles) && !canCreateTemplates(userRoles);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Correspondance Administrative</h1>
          <p className="text-muted-foreground">Bibliothèque de modèles, génération et validation de courriers</p>
        </div>
        <div className="flex gap-2">
          {canGenerateCorrespondence(userRoles) && (
            <Button onClick={() => openWizard()} variant="default">
              <Send className="h-4 w-4 mr-2" />Générer un courrier
            </Button>
          )}
          {canCreateTemplates(userRoles) && (
            <Dialog open={templateOpen} onOpenChange={(open) => { setTemplateOpen(open); if (!open) resetTemplateForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Nouveau modèle</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTemplate ? "Modifier le modèle" : "Créer un modèle"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nom du modèle <span className="text-destructive">*</span></Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex : Lettre de blâme, Attestation de travail..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Catégorie <span className="text-destructive">*</span></Label>
                      <Select value={categoryLabel} onValueChange={setCategoryLabel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Type de document <span className="text-destructive">*</span></Label>
                      <Select value={documentType} onValueChange={setDocumentType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{DOCUMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Objet (optionnel)</Label>
                    <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet du courrier" />
                  </div>
                  <div>
                    <Label>Contenu du modèle <span className="text-destructive">*</span></Label>
                    <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Rédigez le contenu du modèle..." className="min-h-[250px] font-mono text-sm" />
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <Label className="text-sm font-semibold mb-2 block">Variables dynamiques</Label>
                    <div className="flex flex-wrap gap-2">
                      {VARIABLE_SUGGESTIONS.map(v => (
                        <Badge key={v.key} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs" onClick={() => setBody(prev => prev + v.key)}>
                          {v.key} <span className="ml-1 opacity-60">({v.label})</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border rounded-lg p-4">
                    <div><Label>Statut</Label><p className="text-sm text-muted-foreground">{isActive ? "Actif" : "Archivé"}</p></div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                  <Button onClick={handleSaveTemplate} disabled={!title || !body} className="w-full">
                    {editingTemplate ? "Mettre à jour" : "Créer le modèle"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {DOCUMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived(!showArchived)} className="shrink-0">
          <Archive className="h-4 w-4 mr-2" />{showArchived ? "Archivés" : "Actifs"}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={pendingValidations.length > 0 ? "validations" : "templates"}>
        <TabsList className="flex-wrap">
          {canCreateTemplates(userRoles) && (
            <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-2" />Modèles ({filteredTemplates.length})</TabsTrigger>
          )}
          <TabsTrigger value="sent"><Mail className="h-4 w-4 mr-2" />Courriers ({records.length})</TabsTrigger>
          <TabsTrigger value="validations" className="relative">
            <ShieldCheck className="h-4 w-4 mr-2" />Validations
            {pendingValidations.length > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-xs font-bold">
                {pendingValidations.length}
              </span>
            )}
          </TabsTrigger>
          {canCreateTemplates(userRoles) && (
            <TabsTrigger value="audit"><History className="h-4 w-4 mr-2" />Journal d'audit</TabsTrigger>
          )}
        </TabsList>

        {/* ── Templates tab ── */}
        {canCreateTemplates(userRoles) && (
          <TabsContent value="templates" className="space-y-4">
            {filteredTemplates.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">{showArchived ? "Aucun modèle archivé" : "Aucun modèle actif"}</h3>
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map(tpl => (
                  <Card key={tpl.id} className={`flex flex-col ${!tpl.is_active ? 'opacity-60' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <Badge className={CATEGORY_COLORS[tpl.category_label || "autre"]}>{getCategoryLabel(tpl.category_label || "autre")}</Badge>
                        <Badge className={TYPE_COLORS[tpl.document_type || "lettre"]}>{getTypeLabel(tpl.document_type || "lettre")}</Badge>
                      </div>
                      <CardTitle className="text-base mt-2">{tpl.title}</CardTitle>
                      {tpl.subject && <CardDescription>Objet : {tpl.subject}</CardDescription>}
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3 font-mono">{tpl.body}</p>
                      {tpl.variables?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {tpl.variables.map(v => <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>)}
                        </div>
                      )}
                    </CardContent>
                    <div className="p-4 pt-0 flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => handleEditTemplate(tpl)}><Edit className="h-3 w-3 mr-1" />Modifier</Button>
                      {tpl.is_active && canGenerateCorrespondence(userRoles) && (
                        <Button size="sm" onClick={() => openWizard(tpl)}><Send className="h-3 w-3 mr-1" />Générer</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleToggleActive(tpl)}><Archive className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(tpl.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* ── Sent tab ── */}
        <TabsContent value="sent">
          {filteredRecords.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Aucun courrier</h3>
            </CardContent></Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Réf.</TableHead><TableHead>Date</TableHead><TableHead>Titre</TableHead><TableHead>Type</TableHead>
                  <TableHead>Destinataire</TableHead><TableHead>Statut</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map(rec => (
                  <TableRow key={rec.id}>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {rec.reference_number ? (
                        <div className="flex items-center gap-1"><Hash className="h-3 w-3" />{rec.reference_number}</div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(rec.sent_at), "dd/MM/yyyy", { locale: fr })}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {rec.is_locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                        {rec.title}
                      </div>
                    </TableCell>
                    <TableCell><Badge className={TYPE_COLORS[rec.document_type || "lettre"]} variant="outline">{getTypeLabel(rec.document_type || "lettre")}</Badge></TableCell>
                    <TableCell>{getEmployeeName(rec.recipient)}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[rec.status || "generated"]}>{STATUS_LABELS[rec.status || "generated"]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setPreviewRecord(rec); setPreviewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                        {canCreateTemplates(userRoles) && (
                          <Button size="sm" variant="ghost" onClick={() => loadAuditLogs(rec.id)} title="Journal d'audit"><History className="h-4 w-4" /></Button>
                        )}
                        {(rec.status === "validated" || rec.status === "signed") && (
                          <Button size="sm" variant="ghost" onClick={() => handlePrintPDF(rec)}><Download className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* ── Validations tab ── */}
        <TabsContent value="validations" className="space-y-4">
          {pendingValidations.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-12">
              <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Aucune validation en attente</h3>
              <p className="text-muted-foreground text-center mt-2">Les courriers en attente de votre approbation apparaîtront ici.</p>
            </CardContent></Card>
          ) : (
            pendingValidations.map(rec => {
              const currentStep = rec.approvals?.find(a =>
                a.status === "pending" && canValidate(userRoles, a.step_role) &&
                !rec.approvals!.some(prev => prev.step_order < a.step_order && prev.status !== "approved")
              );
              return (
                <Card key={rec.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <CardTitle className="text-base">{rec.title}</CardTitle>
                        <CardDescription>
                          Destinataire : {getEmployeeName(rec.recipient)} — {format(new Date(rec.sent_at), "dd/MM/yyyy", { locale: fr })}
                        </CardDescription>
                      </div>
                      <Badge className={STATUS_COLORS.pending_validation}>{STATUS_LABELS.pending_validation}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Approval timeline */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Circuit de validation</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {rec.approvals?.map((a, idx) => {
                          const StatusIcon = APPROVAL_STATUS_ICONS[a.status] || Clock;
                          return (
                            <div key={a.id} className="flex items-center gap-1">
                              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                a.status === "approved" ? "bg-green-100 text-green-800" :
                                a.status === "rejected" ? "bg-red-100 text-red-800" :
                                currentStep?.id === a.id ? "bg-primary text-primary-foreground" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                <StatusIcon className="h-3 w-3" />
                                {a.step_label}
                              </div>
                              {idx < (rec.approvals?.length || 0) - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          );
                        })}
                      </div>
                      {/* Show previous decisions */}
                      {rec.approvals?.filter(a => a.status !== "pending").map(a => (
                        <div key={a.id} className="text-xs text-muted-foreground flex items-center gap-2 ml-4">
                          {a.status === "approved" ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-600" />}
                          <span>{a.step_label} — {a.approver ? getEmployeeName(a.approver) : "—"}</span>
                          {a.decided_at && <span>le {format(new Date(a.decided_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</span>}
                          {a.comment && <span className="italic">« {a.comment} »</span>}
                        </div>
                      ))}
                    </div>

                    {/* Document preview */}
                    <div className="border rounded-lg p-4 bg-muted/20 max-h-[200px] overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">{rec.body}</p>
                    </div>

                    {/* Action area */}
                    {currentStep && (
                      <div className="border rounded-lg p-4 space-y-3 bg-card">
                        <Label className="font-semibold">Votre décision — {currentStep.step_label}</Label>
                        <Textarea
                          value={approvalComment}
                          onChange={e => setApprovalComment(e.target.value)}
                          placeholder="Commentaire (optionnel)..."
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => handleApproval(currentStep, "approved")} className="flex-1">
                            <CheckCircle2 className="h-4 w-4 mr-2" />Valider
                          </Button>
                          <Button variant="destructive" onClick={() => handleApproval(currentStep, "rejected")} className="flex-1">
                            <XCircle className="h-4 w-4 mr-2" />Rejeter
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── Audit trail tab ── */}
        {canCreateTemplates(userRoles) && (
          <TabsContent value="audit" className="space-y-4">
            {!auditRecordId ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Journal d'audit</h3>
                <p className="text-muted-foreground text-center mt-2">Sélectionnez un courrier dans l'onglet "Courriers" via l'icône <History className="h-4 w-4 inline" /> pour consulter son historique.</p>
              </CardContent></Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Historique — {records.find(r => r.id === auditRecordId)?.reference_number || records.find(r => r.id === auditRecordId)?.title || "Document"}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setAuditRecordId(null)}>
                      <XCircle className="h-4 w-4 mr-1" />Fermer
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {auditLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Aucune entrée dans le journal.</p>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log, idx) => {
                        const actionLabels: Record<string, string> = {
                          created: "Création", status_changed: "Changement de statut", locked: "Verrouillage",
                          signed: "Signature", modified: "Modification", approval_approved: "Validation approuvée",
                          approval_rejected: "Validation rejetée",
                        };
                        const actionColors: Record<string, string> = {
                          created: "bg-blue-100 text-blue-800", status_changed: "bg-amber-100 text-amber-800",
                          locked: "bg-slate-100 text-slate-800", signed: "bg-emerald-100 text-emerald-800",
                          modified: "bg-purple-100 text-purple-800", approval_approved: "bg-green-100 text-green-800",
                          approval_rejected: "bg-red-100 text-red-800",
                        };
                        return (
                          <div key={log.id} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full mt-1.5 ${log.action.includes("reject") ? "bg-destructive" : log.action.includes("approv") ? "bg-green-500" : "bg-primary"}`} />
                              {idx < auditLogs.length - 1 && <div className="w-0.5 h-full bg-border mt-1" />}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={actionColors[log.action] || "bg-muted text-muted-foreground"} variant="outline">
                                  {actionLabels[log.action] || log.action}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(log.created_at), "dd/MM/yyyy à HH:mm:ss", { locale: fr })}
                                </span>
                              </div>
                              {log.performer && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Par : {getEmployeeName(log.performer)}
                                </p>
                              )}
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div className="text-xs bg-muted/50 rounded p-2 mt-1 font-mono">
                                  {Object.entries(log.details).filter(([_, v]) => v != null).map(([k, v]) => (
                                    <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* ═══════ GENERATION WIZARD ═══════ */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Générer une correspondance</DialogTitle></DialogHeader>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-6">
            {GENERATION_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const active = wizardStep === step.id;
              const done = wizardStep > step.id;
              return (
                <div key={step.id} className="flex items-center gap-1">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {idx < GENERATION_STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
                </div>
              );
            })}
          </div>

          {/* Step 1 */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">1. Choisir un modèle</Label>
              {activeTemplates.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun modèle actif disponible.</p>
              ) : (
                <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                  {activeTemplates.map(tpl => (
                    <Card key={tpl.id} className={`cursor-pointer transition-all hover:border-primary ${selectedTemplate?.id === tpl.id ? "border-primary ring-2 ring-primary/20" : ""}`}
                      onClick={() => { setSelectedTemplate(tpl); setSendBody(tpl.body); setSendSubject(tpl.subject || ""); }}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium">{tpl.title}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge className={CATEGORY_COLORS[tpl.category_label || "autre"]} variant="outline">{getCategoryLabel(tpl.category_label || "autre")}</Badge>
                              <Badge className={TYPE_COLORS[tpl.document_type || "lettre"]} variant="outline">{getTypeLabel(tpl.document_type || "lettre")}</Badge>
                            </div>
                          </div>
                          {selectedTemplate?.id === tpl.id && <Check className="h-5 w-5 text-primary" />}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">2. Sélectionner l'agent</Label>
              <Select value={selectedRecipient} onValueChange={onSelectRecipient}>
                <SelectTrigger><SelectValue placeholder="Choisir un employé..." /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{getEmployeeName(e)} {e.nif ? `— ${e.nif}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedEmployee && (
                <Card className="bg-muted/30"><CardContent className="p-4 space-y-1 text-sm">
                  <p><strong>Nom :</strong> {getEmployeeName(selectedEmployee)}</p>
                  {selectedEmployee.email && <p><strong>Email :</strong> {selectedEmployee.email}</p>}
                  {selectedEmployee.nif && <p><strong>NIF :</strong> {selectedEmployee.nif}</p>}
                  {selectedEmployee.unit_id && <p><strong>Service :</strong> {units.find(u => u.id === selectedEmployee.unit_id)?.name || "—"}</p>}
                  {selectedEmployee.position_id && <p><strong>Poste :</strong> {positions.find(p => p.id === selectedEmployee.position_id)?.name || "—"}</p>}
                </CardContent></Card>
              )}
            </div>
          )}

          {/* Step 3 */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">3. Ajuster le contenu</Label>
              <p className="text-sm text-muted-foreground">Les variables ont été remplacées automatiquement.</p>
              <div><Label>Objet</Label><Input value={sendSubject} onChange={e => setSendSubject(e.target.value)} /></div>
              <div><Label>Contenu</Label><Textarea value={sendBody} onChange={e => setSendBody(e.target.value)} className="min-h-[300px] font-mono text-sm" /></div>
            </div>
          )}

          {/* Step 4 */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">4. Validation & Signature</Label>

              {/* Validation toggle */}
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <Label>Circuit de validation hiérarchique</Label>
                  <p className="text-sm text-muted-foreground">
                    {enableValidation
                      ? "Le courrier passera par le circuit de validation avant d'être finalisé."
                      : "Le courrier sera généré directement sans validation."}
                  </p>
                </div>
                <Switch checked={enableValidation} onCheckedChange={setEnableValidation} />
              </div>

              {enableValidation && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  <Label className="text-sm font-semibold">Circuit de validation prévu</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      <User className="h-3 w-3" />Rédacteur RH
                    </div>
                    {APPROVAL_WORKFLOW_STEPS.map((step, idx) => (
                      <div key={step.role} className="flex items-center gap-1">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          <ShieldCheck className="h-3 w-3" />{step.label}
                        </div>
                      </div>
                    ))}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      <PenTool className="h-3 w-3" />Signature finale
                    </div>
                  </div>
                </div>
              )}

              <Separator />
              <Label className="text-sm font-semibold">Informations de signature</Label>
              <p className="text-xs text-muted-foreground">
                {enableValidation ? "La signature sera apposée après validation complète." : "La signature sera apposée immédiatement."}
              </p>
              <div>
                <Label>Article de l'organisation (Le / La / L')</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={articleOrganisation} onChange={e => setArticleOrganisation(e.target.value)}>
                  <option value="L'">L' (ex: L'Ecole Nationale des Arts)</option>
                  <option value="Le ">Le (ex: Le Ministère des Finances)</option>
                  <option value="La ">La (ex: La Direction Générale)</option>
                </select>
              </div>
              <div>
                <Label>Civilité du signataire</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={civiliteSignataire} onChange={e => setCiviliteSignataire(e.target.value)}>
                  <option value="MONSIEUR">MONSIEUR</option>
                  <option value="MADAME">MADAME</option>
                </select>
              </div>
              <div><Label>Nom du signataire</Label><Input value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder="Ex : Jean DUPONT" /></div>
              <div><Label>Titre / Fonction</Label><Input value={signatureTitle} onChange={e => setSignatureTitle(e.target.value)} placeholder="Ex : Directeur Général" /></div>
              <div><Label>CIN du signataire</Label><Input value={signatureCin} onChange={e => setSignatureCin(e.target.value)} placeholder="Ex : 01-01-99-1234-56" /></div>
              <div><Label>NIF du signataire</Label><Input value={signatureNif} onChange={e => setSignatureNif(e.target.value)} placeholder="Ex : 000-000-000-0" /></div>
              <Separator />
              <Label className="text-sm font-semibold">Dates du contrat</Label>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Date de début</Label><Input type="date" value={contractStartDate} onChange={e => setContractStartDate(e.target.value)} /></div>
                <div><Label>Date de fin</Label><Input type="date" value={contractEndDate} onChange={e => setContractEndDate(e.target.value)} /></div>
              </div>
            </div>
          )}

          {/* Step 5 */}
          {wizardStep === 5 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">5. Aperçu final</Label>
              {enableValidation && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  <Clock className="h-4 w-4 shrink-0" />
                  Ce courrier sera soumis au circuit de validation avant d'être finalisé.
                </div>
              )}

              {/* Text Adjustment Controls */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdjustments(!showAdjustments)}
                  className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors text-sm font-medium"
                >
                  <span className="flex items-center gap-2"><Settings2 className="h-4 w-4" />Ajustements du document</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${showAdjustments ? "rotate-90" : ""}`} />
                </button>
                {showAdjustments && (
                  <div className="p-4 space-y-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Taille de police ({pdfFontSize}pt)</Label>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPdfFontSize(s => Math.max(8, s - 1))}><Minus className="h-3 w-3" /></Button>
                          <Slider value={[pdfFontSize]} onValueChange={([v]) => setPdfFontSize(v)} min={8} max={20} step={1} className="flex-1" />
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPdfFontSize(s => Math.min(20, s + 1))}><Plus className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Interligne ({pdfLineHeight.toFixed(1)})</Label>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPdfLineHeight(s => Math.max(1.0, +(s - 0.1).toFixed(1)))}><Minus className="h-3 w-3" /></Button>
                          <Slider value={[pdfLineHeight * 10]} onValueChange={([v]) => setPdfLineHeight(v / 10)} min={10} max={30} step={1} className="flex-1" />
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPdfLineHeight(s => Math.min(3.0, +(s + 0.1).toFixed(1)))}><Plus className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Marges ({pdfMargin.toFixed(1)} cm)</Label>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPdfMargin(s => Math.max(1.0, +(s - 0.5).toFixed(1)))}><Minus className="h-3 w-3" /></Button>
                          <Slider value={[pdfMargin * 10]} onValueChange={([v]) => setPdfMargin(v / 10)} min={10} max={50} step={5} className="flex-1" />
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPdfMargin(s => Math.min(5.0, +(s + 0.5).toFixed(1)))}><Plus className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Position verticale</Label>
                        <div className="flex gap-1">
                          {([["top", "Haut"], ["center", "Centre"], ["bottom", "Bas"]] as const).map(([val, label]) => (
                            <Button key={val} variant={pdfVerticalAlign === val ? "default" : "outline"} size="sm" className="flex-1 text-xs h-8" onClick={() => setPdfVerticalAlign(val)}>
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setPdfFontSize(13); setPdfLineHeight(1.7); setPdfMargin(2.5); setPdfVerticalAlign("bottom"); }}>
                        <RotateCcw className="h-3 w-3 mr-1" />Réinitialiser
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={async () => {
                        if (!organizationId) return;
                        const { error } = await supabase.from("organizations").update({
                          pdf_font_size: pdfFontSize,
                          pdf_line_height: pdfLineHeight,
                          pdf_margin: pdfMargin,
                          pdf_vertical_align: pdfVerticalAlign,
                        } as any).eq("id", organizationId);
                        toast({ title: error ? "Erreur" : "Préférences sauvegardées", description: error ? error.message : "Les ajustements seront appliqués par défaut.", variant: error ? "destructive" : "default" });
                      }}>
                        <Check className="h-3 w-3 mr-1" />Sauvegarder
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div ref={printRef} className="border rounded-lg overflow-hidden relative" style={{
                aspectRatio: "8.5 / 11",
                fontSize: `${pdfFontSize}px`,
                lineHeight: pdfLineHeight,
                fontFamily: "'Times New Roman', serif",
              }}>
                {/* Letterhead background */}
                {orgLetterheadUrl && (
                  <img
                    src={orgLetterheadUrl}
                    alt="Papier à en-tête"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ zIndex: 0, opacity: 1 }}
                  />
                )}
                <div className="relative" style={{ zIndex: 1, padding: `${pdfMargin * 10}px`, minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: pdfVerticalAlign === "top" ? "flex-start" : pdfVerticalAlign === "center" ? "center" : "flex-end" }}>
                  <div className="space-y-4">
                    <div className="text-center font-bold uppercase mt-6 mb-4">{getTypeLabel(selectedTemplate?.document_type || "lettre")}</div>
                    <div className="flex justify-between text-muted-foreground" style={{ fontSize: `${Math.max(pdfFontSize - 2, 8)}px` }}>
                      <span>Réf : CORR-{format(new Date(), "yyyyMMdd-HHmm")}</span>
                      <span>{format(new Date(), "d MMMM yyyy", { locale: fr })}</span>
                    </div>
                    {sendSubject && <div className="text-center font-bold underline">Objet : {sendSubject}</div>}
                    <div className="whitespace-pre-wrap" style={{ textAlign: "justify" }} dangerouslySetInnerHTML={{ __html: sendBody }} />
                    {signatureName && (
                      <div className="text-right mt-8 space-y-1">
                        <p className="font-bold">{signatureName}</p>
                        {signatureTitle && <p className="italic text-muted-foreground" style={{ fontSize: `${Math.max(pdfFontSize - 1, 8)}px` }}>{signatureTitle}</p>}
                      </div>
                    )}
                    {/* QR Code d'authentification */}
                    <div className="flex items-center gap-3 mt-8 pt-4 border-t border-border">
                      <QRCodeSVG value={getQRVerificationData()} size={70} level="M" />
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        <p className="font-medium">QR Code d'authentification</p>
                        <p>Réf : CORR-{format(new Date(), "yyyyMMdd-HHmm")}</p>
                        <p>Scannez pour vérifier l'authenticité</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <Separator />
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setWizardStep(s => s - 1)} disabled={wizardStep === 1}>
              <ChevronLeft className="h-4 w-4 mr-1" />Précédent
            </Button>
            <div className="flex gap-2">
              {wizardStep === 5 && (
                <>
                  <Button variant="outline" onClick={() => handlePrintPDF()}><Download className="h-4 w-4 mr-2" />PDF</Button>
                  <Button onClick={handleGenerate} disabled={!selectedRecipient || !selectedTemplate}>
                    {enableValidation ? <><ShieldCheck className="h-4 w-4 mr-2" />Soumettre pour validation</> : <><CheckCircle2 className="h-4 w-4 mr-2" />Générer & Archiver</>}
                  </Button>
                </>
              )}
              {wizardStep < 5 && (
                <Button onClick={() => setWizardStep(s => s + 1)} disabled={(wizardStep === 1 && !selectedTemplate) || (wizardStep === 2 && !selectedRecipient)}>
                  Suivant<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════ PREVIEW DIALOG ═══════ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{previewRecord?.title}</DialogTitle></DialogHeader>
          {previewRecord && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                {previewRecord.reference_number && (
                  <Badge variant="outline" className="font-mono"><Hash className="h-3 w-3 mr-1" />{previewRecord.reference_number}</Badge>
                )}
                <span>{format(new Date(previewRecord.sent_at), "d MMMM yyyy", { locale: fr })}</span>
                <Badge className={STATUS_COLORS[previewRecord.status || "generated"]}>{STATUS_LABELS[previewRecord.status || "generated"]}</Badge>
                {previewRecord.document_type && <Badge className={TYPE_COLORS[previewRecord.document_type]} variant="outline">{getTypeLabel(previewRecord.document_type)}</Badge>}
                {previewRecord.is_locked && <Badge variant="outline" className="text-muted-foreground"><Lock className="h-3 w-3 mr-1" />Verrouillé</Badge>}
              </div>
              <div className="text-sm"><strong>Destinataire :</strong> {getEmployeeName(previewRecord.recipient)}</div>
              {previewRecord.subject && <div className="text-sm"><strong>Objet :</strong> {previewRecord.subject}</div>}

              {/* Approval timeline */}
              {previewRecord.approvals && previewRecord.approvals.length > 0 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <Label className="text-sm font-semibold">Circuit de validation</Label>
                  {previewRecord.approvals.map(a => {
                    const StatusIcon = APPROVAL_STATUS_ICONS[a.status] || Clock;
                    return (
                      <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg ${
                        a.status === "approved" ? "bg-green-50" : a.status === "rejected" ? "bg-red-50" : "bg-muted/30"
                      }`}>
                        <StatusIcon className={`h-4 w-4 mt-0.5 shrink-0 ${
                          a.status === "approved" ? "text-green-600" : a.status === "rejected" ? "text-red-600" : "text-muted-foreground"
                        }`} />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{a.step_label}</span>
                            <Badge variant="outline" className="text-xs">
                              {a.status === "approved" ? "Validé" : a.status === "rejected" ? "Rejeté" : "En attente"}
                            </Badge>
                          </div>
                          {a.approver && <p className="text-xs text-muted-foreground">Par : {getEmployeeName(a.approver)}</p>}
                          {a.decided_at && <p className="text-xs text-muted-foreground">{format(new Date(a.decided_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>}
                          {a.comment && <p className="text-xs italic bg-card rounded p-2 mt-1"><MessageSquare className="h-3 w-3 inline mr-1" />{a.comment}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border rounded-lg overflow-hidden relative" style={{ aspectRatio: "8.5 / 11", fontFamily: "'Times New Roman', serif" }}>
                {orgLetterheadUrl && (
                  <img src={orgLetterheadUrl} alt="Papier à en-tête" className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ zIndex: 0 }} />
                )}
                <div className="relative p-6 whitespace-pre-wrap text-sm leading-relaxed" style={{ zIndex: 1 }} dangerouslySetInnerHTML={{ __html: previewRecord.body }} />
              </div>
              {previewRecord.signature_name && (
                <div className="text-right space-y-1 border-t pt-4">
                  <p className="font-bold">{previewRecord.signature_name}</p>
                  {previewRecord.signature_title && <p className="text-sm italic text-muted-foreground">{previewRecord.signature_title}</p>}
                  {previewRecord.signed_at && <p className="text-xs text-muted-foreground">Signé le {format(new Date(previewRecord.signed_at), "d MMMM yyyy", { locale: fr })}</p>}
                </div>
              )}
              {/* QR Code d'authentification */}
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <QRCodeSVG value={getQRVerificationData(previewRecord)} size={70} level="M" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <p className="font-medium">QR Code d'authentification</p>
                  <p>Réf : {previewRecord.reference_number || "—"}</p>
                  <p>Scannez pour vérifier l'authenticité du document</p>
                </div>
              </div>

              {/* Print button for validated/signed */}
              {(previewRecord.status === "validated" || previewRecord.status === "signed") && (
                <Button variant="outline" className="w-full" onClick={() => handlePrintPDF(previewRecord)}>
                  <Download className="h-4 w-4 mr-2" />Exporter en PDF
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
