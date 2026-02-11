import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, FileText, Send, Edit, Eye, Search, Mail, Archive, Filter, Check, ChevronRight, ChevronLeft, User, PenTool, Download, CheckCircle2, FileDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// Categories
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
];

const CATEGORY_COLORS: Record<string, string> = {
  recrutement: "bg-blue-100 text-blue-800",
  discipline: "bg-red-100 text-red-800",
  carriere: "bg-purple-100 text-purple-800",
  administration: "bg-slate-100 text-slate-800",
  conges: "bg-green-100 text-green-800",
  remuneration: "bg-amber-100 text-amber-800",
  formation: "bg-cyan-100 text-cyan-800",
  evaluation: "bg-orange-100 text-orange-800",
  depart: "bg-rose-100 text-rose-800",
  autre: "bg-gray-100 text-gray-800",
};

const TYPE_COLORS: Record<string, string> = {
  lettre: "bg-indigo-100 text-indigo-800",
  decision: "bg-red-100 text-red-800",
  note: "bg-yellow-100 text-yellow-800",
  circulaire: "bg-teal-100 text-teal-800",
  attestation: "bg-emerald-100 text-emerald-800",
  certificat: "bg-green-100 text-green-800",
  convocation: "bg-orange-100 text-orange-800",
  rapport: "bg-blue-100 text-blue-800",
};

const VARIABLE_SUGGESTIONS = [
  { key: "{{nom}}", label: "Nom complet" },
  { key: "{{prenom}}", label: "Prénom" },
  { key: "{{nom_famille}}", label: "Nom de famille" },
  { key: "{{matricule}}", label: "Matricule" },
  { key: "{{poste}}", label: "Poste" },
  { key: "{{service}}", label: "Service/Unité" },
  { key: "{{date}}", label: "Date du jour" },
  { key: "{{date_embauche}}", label: "Date d'embauche" },
  { key: "{{organisation}}", label: "Nom de l'institution" },
  { key: "{{email}}", label: "Email" },
  { key: "{{telephone}}", label: "Téléphone" },
  { key: "{{nif}}", label: "NIF" },
  { key: "{{cin}}", label: "CIN" },
];

const GENERATION_STEPS = [
  { id: 1, label: "Modèle", icon: FileText },
  { id: 2, label: "Destinataire", icon: User },
  { id: 3, label: "Contenu", icon: Edit },
  { id: 4, label: "Signature", icon: PenTool },
  { id: 5, label: "Aperçu & PDF", icon: FileDown },
];

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  generated: "Généré",
  validated: "Validé",
  signed: "Signé",
  archived: "Archivé",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  generated: "bg-blue-100 text-blue-800",
  validated: "bg-green-100 text-green-800",
  signed: "bg-emerald-100 text-emerald-800",
  archived: "bg-slate-100 text-slate-800",
};

interface Template {
  id: string;
  title: string;
  category: string;
  category_label: string | null;
  document_type: string;
  subject: string | null;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

interface CorrespondenceRecord {
  id: string;
  title: string;
  category: string;
  subject: string | null;
  body: string;
  sent_at: string;
  status: string;
  signature_name: string | null;
  signature_title: string | null;
  signed_at: string | null;
  document_type: string | null;
  category_label: string | null;
  recipient: { id: string; full_name: string | null; prenom: string | null; nom: string | null };
}

export default function Correspondence() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [records, setRecords] = useState<CorrespondenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
  const [employees, setEmployees] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<CorrespondenceRecord | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) return;
      setOrganizationId(profile.organization_id);
      setProfileId(profile.id);

      // Load org name, templates, records, employees, units, positions in parallel
      const [orgRes, tplRes, recRes, empRes, unitRes, posRes] = await Promise.all([
        supabase.from("organizations").select("name").eq("id", profile.organization_id).maybeSingle(),
        (supabase.from("correspondence_templates") as any).select("*").eq("organization_id", profile.organization_id).order("created_at", { ascending: false }),
        (supabase.from("correspondence_records") as any).select("id, title, category, subject, body, sent_at, status, signature_name, signature_title, signed_at, document_type, category_label, recipient_id").eq("organization_id", profile.organization_id).order("sent_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, prenom, nom, email, tel_1, nif, cin, date_entree_fonction, unit_id, position_id").eq("organization_id", profile.organization_id).eq("approval_status", "approved"),
        supabase.from("organizational_units").select("id, name").eq("organization_id", profile.organization_id),
        supabase.from("positions").select("id, name").eq("organization_id", profile.organization_id),
      ]);

      setOrganizationName(orgRes.data?.name || "");
      setTemplates((tplRes.data as any[]) || []);
      setEmployees(empRes.data || []);
      setUnits(unitRes.data || []);
      setPositions(posRes.data || []);

      if (recRes.data && recRes.data.length > 0) {
        const recipientIds = [...new Set((recRes.data as any[]).map((r: any) => r.recipient_id))];
        const { data: recipientProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, prenom, nom")
          .in("id", recipientIds);
        const profileMap = new Map((recipientProfiles || []).map(p => [p.id, p]));
        setRecords((recRes.data as any[]).map((r: any) => ({
          ...r,
          recipient: profileMap.get(r.recipient_id) || { id: r.recipient_id, full_name: null, prenom: null, nom: null },
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

  // --- Template CRUD ---
  const handleSaveTemplate = async () => {
    if (!organizationId || !profileId) return;
    const detectedVars = VARIABLE_SUGGESTIONS.filter(v => body.includes(v.key)).map(v => v.key);
    const templateData = {
      title, category: "autre", category_label: categoryLabel, document_type: documentType,
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
    toast({ title: editingTemplate ? "Modèle mis à jour" : "Modèle créé avec succès" });
    setTemplateOpen(false);
    resetTemplateForm();
    loadData();
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
    toast({ title: tpl.is_active ? "Modèle archivé" : "Modèle réactivé" });
    loadData();
  };

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await (supabase.from("correspondence_templates") as any).delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Erreur", description: error.message }); return; }
    toast({ title: "Modèle supprimé" }); loadData();
  };

  // --- Variable replacement ---
  const replaceVariables = (text: string, employee: any) => {
    const unitName = units.find(u => u.id === employee?.unit_id)?.name || "";
    const posName = positions.find(p => p.id === employee?.position_id)?.name || "";
    return text
      .replace(/\{\{nom\}\}/g, employee?.prenom && employee?.nom ? `${employee.prenom} ${employee.nom}` : employee?.full_name || "")
      .replace(/\{\{prenom\}\}/g, employee?.prenom || "")
      .replace(/\{\{nom_famille\}\}/g, employee?.nom || "")
      .replace(/\{\{matricule\}\}/g, employee?.nif || "N/A")
      .replace(/\{\{email\}\}/g, employee?.email || "")
      .replace(/\{\{telephone\}\}/g, employee?.tel_1 || "")
      .replace(/\{\{nif\}\}/g, employee?.nif || "")
      .replace(/\{\{cin\}\}/g, employee?.cin || "")
      .replace(/\{\{date\}\}/g, format(new Date(), "d MMMM yyyy", { locale: fr }))
      .replace(/\{\{date_embauche\}\}/g, employee?.date_entree_fonction ? format(new Date(employee.date_entree_fonction), "d MMMM yyyy", { locale: fr }) : "N/A")
      .replace(/\{\{poste\}\}/g, posName)
      .replace(/\{\{service\}\}/g, unitName)
      .replace(/\{\{organisation\}\}/g, organizationName);
  };

  // --- Generation Wizard ---
  const openWizard = (tpl?: Template) => {
    setWizardStep(tpl ? 2 : 1);
    setSelectedTemplate(tpl || null);
    setSelectedRecipient("");
    setSendBody(tpl?.body || "");
    setSendSubject(tpl?.subject || "");
    setSignatureName("");
    setSignatureTitle("");
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
    const { error } = await (supabase.from("correspondence_records") as any).insert({
      organization_id: organizationId,
      template_id: selectedTemplate.id,
      recipient_id: selectedRecipient,
      title: selectedTemplate.title,
      category: selectedTemplate.category,
      category_label: selectedTemplate.category_label,
      document_type: selectedTemplate.document_type,
      subject: sendSubject || null,
      body: sendBody,
      sent_by: profileId,
      status: signatureName ? "signed" : "generated",
      signature_name: signatureName || null,
      signature_title: signatureTitle || null,
      signed_at: signatureName ? new Date().toISOString() : null,
    });
    if (error) { toast({ variant: "destructive", title: "Erreur", description: error.message }); return; }
    toast({ title: "Correspondance générée et archivée avec succès" });
    setWizardOpen(false);
    loadData();
  };

  const handlePrintPDF = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const emp = employees.find(e => e.id === selectedRecipient);
    const empName = getEmployeeName(emp);
    win.document.write(`<!DOCTYPE html><html><head><title>${selectedTemplate?.title || "Correspondance"}</title>
      <style>
        @page { size: A4; margin: 2.5cm; }
        body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.7; color: #000; margin: 0; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .header h1 { font-size: 16pt; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
        .header .org { font-size: 11pt; color: #555; margin-top: 5px; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 11pt; }
        .meta .ref { color: #555; }
        .recipient { margin-bottom: 20px; }
        .recipient strong { display: block; }
        .subject { font-weight: bold; text-align: center; margin: 20px 0; font-size: 14pt; text-decoration: underline; }
        .body-content { white-space: pre-wrap; text-align: justify; margin-bottom: 40px; }
        .signature-block { margin-top: 50px; text-align: right; }
        .signature-block .name { font-weight: bold; font-size: 13pt; }
        .signature-block .title { font-style: italic; color: #555; }
        .signature-block .date { margin-top: 8px; font-size: 11pt; color: #555; }
        .footer { margin-top: 60px; text-align: center; font-size: 9pt; color: #888; border-top: 1px solid #ccc; padding-top: 10px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="header">
        <h1>${organizationName}</h1>
        <div class="org">${getTypeLabel(selectedTemplate?.document_type || "lettre")}</div>
      </div>
      <div class="meta">
        <div class="ref">Réf : CORR-${format(new Date(), "yyyyMMdd-HHmm")}</div>
        <div>${format(new Date(), "d MMMM yyyy", { locale: fr })}</div>
      </div>
      <div class="recipient"><strong>À l'attention de :</strong> ${empName}</div>
      ${sendSubject ? `<div class="subject">Objet : ${sendSubject}</div>` : ""}
      <div class="body-content">${sendBody}</div>
      ${signatureName ? `
      <div class="signature-block">
        <div class="name">${signatureName}</div>
        ${signatureTitle ? `<div class="title">${signatureTitle}</div>` : ""}
        <div class="date">Signé le ${format(new Date(), "d MMMM yyyy", { locale: fr })}</div>
      </div>` : ""}
      <div class="footer">Document généré par ${organizationName} — ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  // --- Helpers ---
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

  const activeTemplates = templates.filter(t => t.is_active);
  const selectedEmployee = employees.find(e => e.id === selectedRecipient);

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
          <p className="text-muted-foreground">Bibliothèque de modèles et génération de courriers RH</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openWizard()} variant="default">
            <Send className="h-4 w-4 mr-2" />Générer un courrier
          </Button>
          <Dialog open={templateOpen} onOpenChange={(open) => { setTemplateOpen(open); if (!open) resetTemplateForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Nouveau modèle</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Modifier le modèle" : "Créer un modèle de correspondance"}</DialogTitle>
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
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type de document <span className="text-destructive">*</span></Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
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
                  <Label className="text-sm font-semibold mb-2 block">Variables dynamiques (cliquez pour insérer)</Label>
                  <p className="text-xs text-muted-foreground mb-3">Ces variables seront remplacées automatiquement lors de la génération.</p>
                  <div className="flex flex-wrap gap-2">
                    {VARIABLE_SUGGESTIONS.map(v => (
                      <Badge key={v.key} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs" onClick={() => setBody(prev => prev + v.key)} title={v.label}>
                        {v.key} <span className="ml-1 opacity-60">({v.label})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div>
                    <Label>Statut du modèle</Label>
                    <p className="text-sm text-muted-foreground">{isActive ? "Actif — visible et utilisable" : "Archivé — masqué par défaut"}</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
                <Button onClick={handleSaveTemplate} disabled={!title || !body} className="w-full">
                  {editingTemplate ? "Mettre à jour le modèle" : "Créer le modèle"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-2" />Modèles ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="sent"><Mail className="h-4 w-4 mr-2" />Courriers émis ({records.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">{showArchived ? "Aucun modèle archivé" : "Aucun modèle actif"}</h3>
                <p className="text-muted-foreground text-center mt-2">{showArchived ? "Les modèles archivés apparaîtront ici." : "Créez votre premier modèle de correspondance."}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(tpl => (
                <Card key={tpl.id} className={`flex flex-col ${!tpl.is_active ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <Badge className={CATEGORY_COLORS[tpl.category_label || "autre"] || CATEGORY_COLORS.autre}>{getCategoryLabel(tpl.category_label || "autre")}</Badge>
                      <Badge className={TYPE_COLORS[tpl.document_type || "lettre"] || TYPE_COLORS.lettre}>{getTypeLabel(tpl.document_type || "lettre")}</Badge>
                    </div>
                    <CardTitle className="text-base mt-2">{tpl.title}</CardTitle>
                    {tpl.subject && <CardDescription className="text-sm">Objet : {tpl.subject}</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3 font-mono">{tpl.body}</p>
                    {tpl.variables && tpl.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {tpl.variables.map(v => <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>)}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant={tpl.is_active ? "default" : "secondary"}>{tpl.is_active ? "Actif" : "Archivé"}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(tpl.created_at), "dd/MM/yyyy", { locale: fr })}</span>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0 flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => handleEditTemplate(tpl)}><Edit className="h-3 w-3 mr-1" />Modifier</Button>
                    {tpl.is_active && <Button size="sm" onClick={() => openWizard(tpl)}><Send className="h-3 w-3 mr-1" />Générer</Button>}
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(tpl)} title={tpl.is_active ? "Archiver" : "Réactiver"}><Archive className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(tpl.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent">
          {filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Aucun courrier émis</h3>
                <p className="text-muted-foreground text-center mt-2">Les courriers générés apparaîtront ici.</p>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map(rec => (
                  <TableRow key={rec.id}>
                    <TableCell className="text-sm">{format(new Date(rec.sent_at), "dd/MM/yyyy", { locale: fr })}</TableCell>
                    <TableCell className="font-medium">{rec.title}</TableCell>
                    <TableCell>
                      <Badge className={TYPE_COLORS[rec.document_type || "lettre"] || TYPE_COLORS.lettre} variant="outline">
                        {getTypeLabel(rec.document_type || "lettre")}
                      </Badge>
                    </TableCell>
                    <TableCell>{rec.recipient?.prenom && rec.recipient?.nom ? `${rec.recipient.prenom} ${rec.recipient.nom}` : rec.recipient?.full_name || "—"}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[rec.status || "generated"]}>{STATUS_LABELS[rec.status || "generated"]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => { setPreviewRecord(rec); setPreviewOpen(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* ========== GENERATION WIZARD ========== */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Générer une correspondance</DialogTitle>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-6">
            {GENERATION_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = wizardStep === step.id;
              const isDone = wizardStep > step.id;
              return (
                <div key={step.id} className="flex items-center gap-1">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {idx < GENERATION_STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
                </div>
              );
            })}
          </div>

          {/* Step 1: Choose template */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">1. Choisir un modèle</Label>
              {activeTemplates.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun modèle actif. Créez d'abord un modèle.</p>
              ) : (
                <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                  {activeTemplates.map(tpl => (
                    <Card
                      key={tpl.id}
                      className={`cursor-pointer transition-all hover:border-primary ${selectedTemplate?.id === tpl.id ? "border-primary ring-2 ring-primary/20" : ""}`}
                      onClick={() => { setSelectedTemplate(tpl); setSendBody(tpl.body); setSendSubject(tpl.subject || ""); }}
                    >
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

          {/* Step 2: Choose recipient */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">2. Sélectionner l'agent concerné</Label>
              <Select value={selectedRecipient} onValueChange={onSelectRecipient}>
                <SelectTrigger><SelectValue placeholder="Choisir un employé..." /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {getEmployeeName(e)} {e.nif ? `— ${e.nif}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEmployee && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4 space-y-1 text-sm">
                    <p><strong>Nom :</strong> {getEmployeeName(selectedEmployee)}</p>
                    {selectedEmployee.email && <p><strong>Email :</strong> {selectedEmployee.email}</p>}
                    {selectedEmployee.nif && <p><strong>NIF :</strong> {selectedEmployee.nif}</p>}
                    {selectedEmployee.unit_id && <p><strong>Service :</strong> {units.find(u => u.id === selectedEmployee.unit_id)?.name || "—"}</p>}
                    {selectedEmployee.position_id && <p><strong>Poste :</strong> {positions.find(p => p.id === selectedEmployee.position_id)?.name || "—"}</p>}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Edit content */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">3. Ajuster le contenu</Label>
              <p className="text-sm text-muted-foreground">Les variables ont été remplacées automatiquement. Vous pouvez ajuster le texte avant la génération.</p>
              {sendSubject !== undefined && (
                <div>
                  <Label>Objet</Label>
                  <Input value={sendSubject} onChange={e => setSendSubject(e.target.value)} />
                </div>
              )}
              <div>
                <Label>Contenu</Label>
                <Textarea value={sendBody} onChange={e => setSendBody(e.target.value)} className="min-h-[300px] font-mono text-sm" />
              </div>
            </div>
          )}

          {/* Step 4: Signature */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">4. Signature</Label>
              <p className="text-sm text-muted-foreground">Ajoutez les informations du signataire. La signature sera apposée en bas du document.</p>
              <div>
                <Label>Nom du signataire</Label>
                <Input value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder="Ex : Jean DUPONT" />
              </div>
              <div>
                <Label>Titre / Fonction</Label>
                <Input value={signatureTitle} onChange={e => setSignatureTitle(e.target.value)} placeholder="Ex : Directeur des Ressources Humaines" />
              </div>
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground">💡 Vous pouvez laisser vide si le document sera signé manuellement après impression.</p>
              </div>
            </div>
          )}

          {/* Step 5: Preview & PDF */}
          {wizardStep === 5 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">5. Aperçu final & Génération PDF</Label>
              <div ref={printRef} className="border rounded-lg p-8 bg-card space-y-4">
                <div className="text-center border-b pb-4">
                  <h2 className="text-lg font-bold uppercase tracking-wider">{organizationName}</h2>
                  <p className="text-sm text-muted-foreground">{getTypeLabel(selectedTemplate?.document_type || "lettre")}</p>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Réf : CORR-{format(new Date(), "yyyyMMdd-HHmm")}</span>
                  <span>{format(new Date(), "d MMMM yyyy", { locale: fr })}</span>
                </div>
                <div className="text-sm">
                  <strong>À l'attention de :</strong> {getEmployeeName(selectedEmployee)}
                </div>
                {sendSubject && <div className="text-center font-bold underline">Objet : {sendSubject}</div>}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{sendBody}</div>
                {signatureName && (
                  <div className="text-right mt-8 space-y-1">
                    <p className="font-bold">{signatureName}</p>
                    {signatureTitle && <p className="text-sm italic text-muted-foreground">{signatureTitle}</p>}
                    <p className="text-xs text-muted-foreground">Signé le {format(new Date(), "d MMMM yyyy", { locale: fr })}</p>
                  </div>
                )}
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
                  <Button variant="outline" onClick={handlePrintPDF}>
                    <Download className="h-4 w-4 mr-2" />Imprimer / PDF
                  </Button>
                  <Button onClick={handleGenerate} disabled={!selectedRecipient || !selectedTemplate}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />Générer & Archiver
                  </Button>
                </>
              )}
              {wizardStep < 5 && (
                <Button
                  onClick={() => setWizardStep(s => s + 1)}
                  disabled={
                    (wizardStep === 1 && !selectedTemplate) ||
                    (wizardStep === 2 && !selectedRecipient)
                  }
                >
                  Suivant<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog for sent records */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewRecord?.title}</DialogTitle>
          </DialogHeader>
          {previewRecord && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span>Date : {format(new Date(previewRecord.sent_at), "d MMMM yyyy", { locale: fr })}</span>
                <Badge className={STATUS_COLORS[previewRecord.status || "generated"]}>{STATUS_LABELS[previewRecord.status || "generated"]}</Badge>
                {previewRecord.document_type && (
                  <Badge className={TYPE_COLORS[previewRecord.document_type]} variant="outline">{getTypeLabel(previewRecord.document_type)}</Badge>
                )}
              </div>
              <div className="text-sm">
                <strong>Destinataire :</strong> {previewRecord.recipient?.prenom && previewRecord.recipient?.nom ? `${previewRecord.recipient.prenom} ${previewRecord.recipient.nom}` : previewRecord.recipient?.full_name || "—"}
              </div>
              {previewRecord.subject && <div className="text-sm"><strong>Objet :</strong> {previewRecord.subject}</div>}
              <div className="border rounded-lg p-6 bg-card whitespace-pre-wrap text-sm leading-relaxed">{previewRecord.body}</div>
              {previewRecord.signature_name && (
                <div className="text-right space-y-1 border-t pt-4">
                  <p className="font-bold">{previewRecord.signature_name}</p>
                  {previewRecord.signature_title && <p className="text-sm italic text-muted-foreground">{previewRecord.signature_title}</p>}
                  {previewRecord.signed_at && <p className="text-xs text-muted-foreground">Signé le {format(new Date(previewRecord.signed_at), "d MMMM yyyy", { locale: fr })}</p>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
