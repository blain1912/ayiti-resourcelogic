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
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, FileText, Send, Edit, Eye, Search, Mail } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_LABELS: Record<string, string> = {
  attestation_travail: "Attestation de travail",
  certificat_travail: "Certificat de travail",
  lettre_recommandation: "Lettre de recommandation",
  note_service: "Note de service",
  decision: "Décision",
  convocation: "Convocation",
  mise_en_demeure: "Mise en demeure",
  avertissement: "Avertissement",
  felicitations: "Félicitations",
  autre: "Autre",
};

const CATEGORY_COLORS: Record<string, string> = {
  attestation_travail: "bg-blue-100 text-blue-800",
  certificat_travail: "bg-green-100 text-green-800",
  lettre_recommandation: "bg-purple-100 text-purple-800",
  note_service: "bg-orange-100 text-orange-800",
  decision: "bg-red-100 text-red-800",
  convocation: "bg-yellow-100 text-yellow-800",
  mise_en_demeure: "bg-red-200 text-red-900",
  avertissement: "bg-amber-100 text-amber-800",
  felicitations: "bg-emerald-100 text-emerald-800",
  autre: "bg-gray-100 text-gray-800",
};

const VARIABLE_SUGGESTIONS = [
  "{nom_employe}",
  "{prenom_employe}",
  "{poste}",
  "{unite}",
  "{date_embauche}",
  "{date_courante}",
  "{nom_organisation}",
  "{matricule}",
];

interface Template {
  id: string;
  title: string;
  category: string;
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
  const [category, setCategory] = useState("attestation_travail");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

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

  // Search
  const [searchTerm, setSearchTerm] = useState("");

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

      // Load templates
      const { data: tplData } = await (supabase
        .from("correspondence_templates") as any)
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      setTemplates((tplData as any[]) || []);

      // Load records
      const { data: recData } = await (supabase
        .from("correspondence_records") as any)
        .select("id, title, category, subject, body, sent_at, recipient_id")
        .eq("organization_id", profile.organization_id)
        .order("sent_at", { ascending: false });

      // Load recipient info for records
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

      // Load employees
      const { data: empData } = await supabase
        .from("profiles")
        .select("id, full_name, prenom, nom")
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

    const templateData = {
      title,
      category,
      subject: subject || null,
      body,
      variables: VARIABLE_SUGGESTIONS.filter(v => body.includes(v)),
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

    toast({ title: editingTemplate ? "Modèle mis à jour" : "Modèle créé" });
    setTemplateOpen(false);
    resetTemplateForm();
    loadData();
  };

  const resetTemplateForm = () => {
    setTitle(""); setCategory("attestation_travail"); setSubject(""); setBody("");
    setEditingTemplate(null);
  };

  const handleEditTemplate = (tpl: Template) => {
    setEditingTemplate(tpl);
    setTitle(tpl.title);
    setCategory(tpl.category);
    setSubject(tpl.subject || "");
    setBody(tpl.body);
    setTemplateOpen(true);
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
      .replace(/{nom_employe}/g, employee?.nom || "")
      .replace(/{prenom_employe}/g, employee?.prenom || "")
      .replace(/{date_courante}/g, format(new Date(), "d MMMM yyyy", { locale: fr }));
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

    toast({ title: "Correspondance envoyée" });
    setSendOpen(false);
    loadData();
  };

  const filteredTemplates = templates.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    CATEGORY_LABELS[t.category]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecords = records.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.recipient?.prenom + " " + r.recipient?.nom).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEmployeeName = (e: any) =>
    e.prenom && e.nom ? `${e.prenom} ${e.nom}` : e.full_name || "Sans nom";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Correspondance Administrative</h1>
          <p className="text-muted-foreground">Gérer les modèles et courriers administratifs RH</p>
        </div>
        <Dialog open={templateOpen} onOpenChange={(open) => { setTemplateOpen(open); if (!open) resetTemplateForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouveau modèle</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Modifier le modèle" : "Créer un modèle"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Titre du modèle</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Attestation de travail standard" />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Objet (optionnel)</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet du courrier" />
              </div>
              <div>
                <Label>Contenu du modèle</Label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Rédigez le contenu du modèle..."
                  className="min-h-[200px]"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Variables disponibles (cliquez pour insérer)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {VARIABLE_SUGGESTIONS.map(v => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setBody(prev => prev + " " + v)}
                    >
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={handleSaveTemplate} disabled={!title || !body} className="w-full">
                {editingTemplate ? "Mettre à jour" : "Créer le modèle"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un modèle ou courrier..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Modèles ({templates.length})
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
                <h3 className="text-lg font-semibold">Aucun modèle</h3>
                <p className="text-muted-foreground text-center mt-2">
                  Créez votre premier modèle de correspondance administrative.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(tpl => (
                <Card key={tpl.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge className={CATEGORY_COLORS[tpl.category] || CATEGORY_COLORS.autre}>
                        {CATEGORY_LABELS[tpl.category] || tpl.category}
                      </Badge>
                      {!tpl.is_active && <Badge variant="secondary">Inactif</Badge>}
                    </div>
                    <CardTitle className="text-base mt-2">{tpl.title}</CardTitle>
                    {tpl.subject && (
                      <CardDescription className="text-sm">Objet: {tpl.subject}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3">{tpl.body}</p>
                    {tpl.variables && tpl.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {tpl.variables.map(v => (
                          <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <div className="p-4 pt-0 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditTemplate(tpl)}>
                      <Edit className="h-3 w-3 mr-1" />Modifier
                    </Button>
                    <Button size="sm" onClick={() => handleOpenSend(tpl)}>
                      <Send className="h-3 w-3 mr-1" />Envoyer
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
                  <TableHead>Catégorie</TableHead>
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
                      <Badge className={CATEGORY_COLORS[rec.category] || CATEGORY_COLORS.autre}>
                        {CATEGORY_LABELS[rec.category] || rec.category}
                      </Badge>
                    </TableCell>
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
              <div>
                <Label>Modèle: {selectedTemplate.title}</Label>
                <Badge className={`ml-2 ${CATEGORY_COLORS[selectedTemplate.category]}`}>
                  {CATEGORY_LABELS[selectedTemplate.category]}
                </Badge>
              </div>
              <div>
                <Label>Destinataire</Label>
                <Select value={selectedRecipient} onValueChange={(val) => {
                  setSelectedRecipient(val);
                  const emp = employees.find(e => e.id === val);
                  if (emp) {
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
                <Label>Contenu</Label>
                <Textarea
                  value={sendBody}
                  onChange={e => setSendBody(e.target.value)}
                  className="min-h-[200px]"
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
                <span>Date: {format(new Date(previewRecord.sent_at), "d MMMM yyyy", { locale: fr })}</span>
                <Badge className={CATEGORY_COLORS[previewRecord.category]}>
                  {CATEGORY_LABELS[previewRecord.category]}
                </Badge>
              </div>
              <div className="text-sm">
                <strong>Destinataire:</strong>{" "}
                {previewRecord.recipient?.prenom && previewRecord.recipient?.nom
                  ? `${previewRecord.recipient.prenom} ${previewRecord.recipient.nom}`
                  : previewRecord.recipient?.full_name || "—"}
              </div>
              {previewRecord.subject && (
                <div className="text-sm">
                  <strong>Objet:</strong> {previewRecord.subject}
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
