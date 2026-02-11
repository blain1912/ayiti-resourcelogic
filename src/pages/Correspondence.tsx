import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, FileText, Send, Edit, Eye, Search, Mail, Archive, Filter } from "lucide-react";
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

// Document types
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

// Variables dynamiques
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
  recipient: { id: string; full_name: string | null; prenom: string | null; nom: string | null };
}

export default function Correspondence() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [records, setRecords] = useState<CorrespondenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Template form
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [title, setTitle] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("administration");
  const [documentType, setDocumentType] = useState("lettre");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Send form
  const [sendOpen, setSendOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<CorrespondenceRecord | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) return;
      setOrganizationId(profile.organization_id);
      setProfileId(profile.id);

      const { data: tplData } = await (supabase
        .from("correspondence_templates") as any)
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      setTemplates((tplData as any[]) || []);

      const { data: recData } = await (supabase
        .from("correspondence_records") as any)
        .select("id, title, category, subject, body, sent_at, recipient_id")
        .eq("organization_id", profile.organization_id)
        .order("sent_at", { ascending: false });

      if (recData && recData.length > 0) {
        const recipientIds = [...new Set((recData as any[]).map((r: any) => r.recipient_id))];
        const { data: recipientProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, prenom, nom")
          .in("id", recipientIds);

        const profileMap = new Map((recipientProfiles || []).map(p => [p.id, p]));
        setRecords((recData as any[]).map((r: any) => ({
          ...r,
          recipient: profileMap.get(r.recipient_id) || { id: r.recipient_id, full_name: null, prenom: null, nom: null },
        })));
      } else {
        setRecords([]);
      }

      const { data: empData } = await supabase
        .from("profiles")
        .select("id, full_name, prenom, nom, email, tel_1, nif, cin, date_entree_fonction, unit_id, position_id")
        .eq("organization_id", profile.organization_id)
        .eq("approval_status", "approved");
      setEmployees(empData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!organizationId || !profileId) return;

    const detectedVars = VARIABLE_SUGGESTIONS
      .filter(v => body.includes(v.key))
      .map(v => v.key);

    const templateData = {
      title,
      category: "autre",
      category_label: categoryLabel,
      document_type: documentType,
      subject: subject || null,
      body,
      variables: detectedVars,
      is_active: isActive,
      organization_id: organizationId,
      created_by: profileId,
    } as any;

    let error;
    if (editingTemplate) {
      const { error: e } = await (supabase
        .from("correspondence_templates") as any)
        .update(templateData)
        .eq("id", editingTemplate.id);
      error = e;
    } else {
      const { error: e } = await (supabase
        .from("correspondence_templates") as any)
        .insert(templateData);
      error = e;
    }

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
      return;
    }

    toast({ title: editingTemplate ? "Modèle mis à jour" : "Modèle créé avec succès" });
    setTemplateOpen(false);
    resetTemplateForm();
    loadData();
  };

  const resetTemplateForm = () => {
    setTitle("");
    setCategoryLabel("administration");
    setDocumentType("lettre");
    setSubject("");
    setBody("");
    setIsActive(true);
    setEditingTemplate(null);
  };

  const handleEditTemplate = (tpl: Template) => {
    setEditingTemplate(tpl);
    setTitle(tpl.title);
    setCategoryLabel(tpl.category_label || "administration");
    setDocumentType(tpl.document_type || "lettre");
    setSubject(tpl.subject || "");
    setBody(tpl.body);
    setIsActive(tpl.is_active);
    setTemplateOpen(true);
  };

  const handleToggleActive = async (tpl: Template) => {
    const { error } = await (supabase.from("correspondence_templates") as any)
      .update({ is_active: !tpl.is_active })
      .eq("id", tpl.id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
      return;
    }
    toast({ title: tpl.is_active ? "Modèle archivé" : "Modèle réactivé" });
    loadData();
  };

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await (supabase.from("correspondence_templates") as any).delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
      return;
    }
    toast({ title: "Modèle supprimé" });
    loadData();
  };

  const handleOpenSend = (tpl: Template) => {
    setSelectedTemplate(tpl);
    setSendBody(tpl.body);
    setSendSubject(tpl.subject || "");
    setSelectedRecipient("");
    setSendOpen(true);
  };

  const replaceVariables = (text: string, employee: any) => {
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
      .replace(/\{\{date_embauche\}\}/g, employee?.date_entree_fonction
        ? format(new Date(employee.date_entree_fonction), "d MMMM yyyy", { locale: fr })
        : "N/A")
      .replace(/\{\{poste\}\}/g, "")
      .replace(/\{\{service\}\}/g, "")
      .replace(/\{\{organisation\}\}/g, "");
  };

  const handleSend = async () => {
    if (!organizationId || !profileId || !selectedRecipient || !selectedTemplate) return;

    const employee = employees.find(e => e.id === selectedRecipient);
    const finalBody = replaceVariables(sendBody, employee);

    const { error } = await (supabase.from("correspondence_records") as any).insert({
      organization_id: organizationId,
      template_id: selectedTemplate.id,
      recipient_id: selectedRecipient,
      title: selectedTemplate.title,
      category: selectedTemplate.category,
      subject: sendSubject || null,
      body: finalBody,
      sent_by: profileId,
    });

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
      return;
    }

    toast({ title: "Correspondance générée avec succès" });
    setSendOpen(false);
    loadData();
  };

  const getCategoryLabel = (cat: string) =>
    CATEGORIES.find(c => c.value === cat)?.label || cat;

  const getTypeLabel = (type: string) =>
    DOCUMENT_TYPES.find(t => t.value === type)?.label || type;

  const getEmployeeName = (e: any) =>
    e.prenom && e.nom ? `${e.prenom} ${e.nom}` : e.full_name || "Sans nom";

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Correspondance Administrative</h1>
          <p className="text-muted-foreground">Bibliothèque de modèles et courriers RH</p>
        </div>
        <Dialog open={templateOpen} onOpenChange={(open) => { setTemplateOpen(open); if (!open) resetTemplateForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouveau modèle</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Modifier le modèle" : "Créer un modèle de correspondance"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Nom du modèle */}
              <div>
                <Label>Nom du modèle <span className="text-destructive">*</span></Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex : Lettre de blâme, Attestation de travail..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Catégorie */}
                <div>
                  <Label>Catégorie <span className="text-destructive">*</span></Label>
                  <Select value={categoryLabel} onValueChange={setCategoryLabel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type */}
                <div>
                  <Label>Type de document <span className="text-destructive">*</span></Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Objet */}
              <div>
                <Label>Objet (optionnel)</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet du courrier" />
              </div>

              {/* Contenu */}
              <div>
                <Label>Contenu du modèle <span className="text-destructive">*</span></Label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Rédigez le contenu du modèle. Utilisez les variables dynamiques ci-dessous pour personnaliser automatiquement..."
                  className="min-h-[250px] font-mono text-sm"
                />
              </div>

              {/* Variables dynamiques */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <Label className="text-sm font-semibold mb-2 block">Variables dynamiques (cliquez pour insérer)</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Ces variables seront automatiquement remplacées par les informations de l'employé lors de la génération.
                </p>
                <div className="flex flex-wrap gap-2">
                  {VARIABLE_SUGGESTIONS.map(v => (
                    <Badge
                      key={v.key}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                      onClick={() => setBody(prev => prev + v.key)}
                      title={v.label}
                    >
                      {v.key} <span className="ml-1 opacity-60">({v.label})</span>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Statut */}
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <Label>Statut du modèle</Label>
                  <p className="text-sm text-muted-foreground">
                    {isActive ? "Actif — visible et utilisable" : "Archivé — masqué par défaut"}
                  </p>
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

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un modèle..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {DOCUMENT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showArchived ? "default" : "outline"}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className="shrink-0"
        >
          <Archive className="h-4 w-4 mr-2" />
          {showArchived ? "Archivés" : "Actifs"}
        </Button>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Modèles ({filteredTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Mail className="h-4 w-4 mr-2" />
            Courriers émis ({records.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">
                  {showArchived ? "Aucun modèle archivé" : "Aucun modèle actif"}
                </h3>
                <p className="text-muted-foreground text-center mt-2">
                  {showArchived
                    ? "Les modèles archivés apparaîtront ici."
                    : "Créez votre premier modèle de correspondance administrative."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(tpl => (
                <Card key={tpl.id} className={`flex flex-col ${!tpl.is_active ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <Badge className={CATEGORY_COLORS[tpl.category_label || "autre"] || CATEGORY_COLORS.autre}>
                        {getCategoryLabel(tpl.category_label || "autre")}
                      </Badge>
                      <Badge className={TYPE_COLORS[tpl.document_type || "lettre"] || TYPE_COLORS.lettre}>
                        {getTypeLabel(tpl.document_type || "lettre")}
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-2">{tpl.title}</CardTitle>
                    {tpl.subject && (
                      <CardDescription className="text-sm">Objet : {tpl.subject}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3 font-mono">{tpl.body}</p>
                    {tpl.variables && tpl.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {tpl.variables.map(v => (
                          <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant={tpl.is_active ? "default" : "secondary"}>
                        {tpl.is_active ? "Actif" : "Archivé"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(tpl.created_at), "dd/MM/yyyy", { locale: fr })}
                      </span>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0 flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => handleEditTemplate(tpl)}>
                      <Edit className="h-3 w-3 mr-1" />Modifier
                    </Button>
                    {tpl.is_active && (
                      <Button size="sm" onClick={() => handleOpenSend(tpl)}>
                        <Send className="h-3 w-3 mr-1" />Générer
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(tpl)} title={tpl.is_active ? "Archiver" : "Réactiver"}>
                      <Archive className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(tpl.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
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
                <p className="text-muted-foreground text-center mt-2">
                  Les courriers générés à partir des modèles apparaîtront ici.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Destinataire</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map(rec => (
                  <TableRow key={rec.id}>
                    <TableCell className="text-sm">
                      {format(new Date(rec.sent_at), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium">{rec.title}</TableCell>
                    <TableCell>
                      {rec.recipient?.prenom && rec.recipient?.nom
                        ? `${rec.recipient.prenom} ${rec.recipient.nom}`
                        : rec.recipient?.full_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setPreviewRecord(rec); setPreviewOpen(true); }}
                      >
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

      {/* Send dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Générer un courrier</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{selectedTemplate.title}</span>
                <Badge className={CATEGORY_COLORS[selectedTemplate.category_label || "autre"]}>
                  {getCategoryLabel(selectedTemplate.category_label || "autre")}
                </Badge>
                <Badge className={TYPE_COLORS[selectedTemplate.document_type || "lettre"]}>
                  {getTypeLabel(selectedTemplate.document_type || "lettre")}
                </Badge>
              </div>
              <div>
                <Label>Destinataire <span className="text-destructive">*</span></Label>
                <Select value={selectedRecipient} onValueChange={(val) => {
                  setSelectedRecipient(val);
                  const emp = employees.find(e => e.id === val);
                  if (emp && selectedTemplate) {
                    setSendBody(replaceVariables(selectedTemplate.body, emp));
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{getEmployeeName(e)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {sendSubject && (
                <div>
                  <Label>Objet</Label>
                  <Input value={sendSubject} onChange={e => setSendSubject(e.target.value)} />
                </div>
              )}
              <div>
                <Label>Contenu (modifiable avant génération)</Label>
                <Textarea
                  value={sendBody}
                  onChange={e => setSendBody(e.target.value)}
                  className="min-h-[250px] font-mono text-sm"
                />
              </div>
              <Button onClick={handleSend} disabled={!selectedRecipient} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Générer le courrier
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewRecord?.title}</DialogTitle>
          </DialogHeader>
          {previewRecord && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Date : {format(new Date(previewRecord.sent_at), "d MMMM yyyy", { locale: fr })}</span>
              </div>
              <div className="text-sm">
                <strong>Destinataire :</strong>{" "}
                {previewRecord.recipient?.prenom && previewRecord.recipient?.nom
                  ? `${previewRecord.recipient.prenom} ${previewRecord.recipient.nom}`
                  : previewRecord.recipient?.full_name || "—"}
              </div>
              {previewRecord.subject && (
                <div className="text-sm">
                  <strong>Objet :</strong> {previewRecord.subject}
                </div>
              )}
              <div className="border rounded-lg p-6 bg-card whitespace-pre-wrap text-sm leading-relaxed">
                {previewRecord.body}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
