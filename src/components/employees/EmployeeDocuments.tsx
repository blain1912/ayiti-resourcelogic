import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Download, FileText, Loader2, AlertCircle, Printer, Lock, Archive } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import {
  CONFIDENTIALITY_LEVELS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_TYPES,
  confidentialityLabel,
  documentCategoryLabel,
  documentExpiryState,
  documentTypeCategory,
  documentTypeLabel,
  expiryStateLabel,
} from "@/lib/careerTypes";
import { useEmployeeDocuments, type EmployeeDocumentRow } from "@/hooks/useEmployeeDocuments";
import { logHrEvent } from "@/lib/hrAudit";

interface EmployeeDocumentsProps {
  profileId: string;
  organizationId: string;
  /** user_id de l'agent — peut être null (agent sans compte GRHPro) */
  userId?: string | null;
  /** L'agent consulte son propre dossier */
  isOwner?: boolean;
  /** Droits RH : métadonnées avancées, confidentialité, archivage */
  canManage?: boolean;
}

const emptyForm = {
  document_type: "piece_identite",
  title: "",
  reference_number: "",
  document_date: "",
  effective_date: "",
  expires_at: "",
  issuer: "",
  comment: "",
  confidentiality: "standard",
};

export function EmployeeDocuments({
  profileId,
  organizationId,
  userId,
  isOwner = true,
  canManage = false,
}: EmployeeDocumentsProps) {
  const { data: documents = [], isLoading, refetch } = useEmployeeDocuments(profileId);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = Boolean(profileId && organizationId && (isOwner || canManage));

  const visibleDocuments = useMemo(
    () => documents.filter((d) => (showArchived ? true : !d.is_archived)),
    [documents, showArchived],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, EmployeeDocumentRow[]>();
    visibleDocuments.forEach((doc) => {
      const key = doc.category || documentTypeCategory(doc.document_type);
      map.set(key, [...(map.get(key) || []), doc]);
    });
    return DOCUMENT_CATEGORIES.filter((c) => map.has(c.value)).map((c) => ({
      category: c,
      docs: map.get(c.value)!,
    }));
  }, [visibleDocuments]);

  const openDialog = () => {
    setForm({ ...emptyForm });
    setPendingFile(null);
    setDialogOpen(true);
  };

  const handleUpload = async () => {
    if (!pendingFile) {
      toast({ title: "Fichier requis", description: "Sélectionnez un fichier.", variant: "destructive" });
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(pendingFile.type)) {
      toast({
        title: "Erreur",
        description: "Type de fichier non supporté. Utilisez PDF, Word, JPEG ou PNG.",
        variant: "destructive",
      });
      return;
    }
    if (pendingFile.size > 10 * 1024 * 1024) {
      toast({ title: "Erreur", description: "Le fichier doit faire moins de 10 Mo", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const actorId = auth?.user?.id;
      if (!actorId) throw new Error("Session expirée");

      // Un agent sans compte n'a pas de user_id : on range alors le fichier
      // sous l'identifiant de l'organisation (bucket privé, contrôle RLS).
      const rootFolder = userId || organizationId;
      const fileExt = pendingFile.name.split(".").pop();
      const path = `${rootFolder}/${profileId}/${form.document_type}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(path, pendingFile, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data: inserted, error: dbError } = await supabase
        .from("employee_documents")
        .insert({
          profile_id: profileId,
          organization_id: organizationId,
          document_type: form.document_type,
          category: documentTypeCategory(form.document_type),
          title: form.title || pendingFile.name,
          file_name: pendingFile.name,
          file_url: uploadData.path,
          file_size: pendingFile.size,
          uploaded_by: actorId,
          reference_number: form.reference_number || null,
          document_date: form.document_date || null,
          effective_date: form.effective_date || null,
          expires_at: form.expires_at || null,
          issuer: form.issuer || null,
          comment: form.comment || null,
          confidentiality: canManage ? form.confidentiality : "standard",
        })
        .select("id")
        .single();
      if (dbError) throw dbError;

      await logHrEvent({
        organization_id: organizationId,
        profile_id: profileId,
        entity_type: "employee_document",
        entity_id: inserted.id,
        action: "document_added",
        new_value: {
          document_type: form.document_type,
          title: form.title || pendingFile.name,
          confidentiality: canManage ? form.confidentiality : "standard",
          expires_at: form.expires_at || null,
        },
      });

      toast({ title: "Succès", description: "Document ajouté au dossier" });
      setDialogOpen(false);
      setPendingFile(null);
      refetch();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du téléchargement",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertImageToPdf = async (blob: Blob): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const pdf = new jsPDF({
          orientation: img.width > img.height ? "l" : "p",
          unit: "px",
          format: [img.width, img.height],
        });
        pdf.addImage(img, "JPEG", 0, 0, img.width, img.height);
        resolve(pdf.output("blob"));
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error("Impossible de charger l'image"));
      };
      img.src = URL.createObjectURL(blob);
    });

  const handleDownload = async (doc: EmployeeDocumentRow) => {
    try {
      const { data, error } = await supabase.storage.from("employee-documents").download(doc.file_url);
      if (error || !data) throw error || new Error("Fichier introuvable");

      if (/\.(jpg|jpeg|png)$/i.test(doc.file_name)) {
        downloadBlob(await convertImageToPdf(data), doc.file_name.replace(/\.[^.]+$/, ".pdf"));
      } else {
        downloadBlob(data, doc.file_name);
      }
      toast({ title: "Succès", description: "Document téléchargé" });
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({ title: "Erreur", description: "Impossible de télécharger le document", variant: "destructive" });
    }
  };

  const handlePrint = async (doc: EmployeeDocumentRow) => {
    try {
      const { data, error } = await supabase.storage.from("employee-documents").download(doc.file_url);
      if (error || !data) throw error || new Error("Fichier introuvable");
      const blob = /\.(jpg|jpeg|png)$/i.test(doc.file_name) ? await convertImageToPdf(data) : data;
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      printWindow?.addEventListener("load", () => printWindow.print());
    } catch (error) {
      console.error("Error printing document:", error);
      toast({ title: "Erreur", description: "Impossible d'imprimer le document", variant: "destructive" });
    }
  };

  /** Archivage logique : on ne supprime pas une pièce du dossier administratif. */
  const handleArchive = async (doc: EmployeeDocumentRow) => {
    const { error } = await supabase
      .from("employee_documents")
      .update({ is_archived: !doc.is_archived })
      .eq("id", doc.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logHrEvent({
      organization_id: organizationId,
      profile_id: profileId,
      entity_type: "employee_document",
      entity_id: doc.id,
      action: doc.is_archived ? "document_restored" : "document_archived",
      old_value: { is_archived: doc.is_archived },
      new_value: { is_archived: !doc.is_archived },
    });
    toast({ title: "Succès", description: doc.is_archived ? "Document restauré" : "Document archivé" });
    refetch();
  };

  const handleConfidentialityChange = async (doc: EmployeeDocumentRow, value: string) => {
    const { error } = await supabase
      .from("employee_documents")
      .update({ confidentiality: value })
      .eq("id", doc.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await logHrEvent({
      organization_id: organizationId,
      profile_id: profileId,
      entity_type: "employee_document",
      entity_id: doc.id,
      action: "document_confidentiality_changed",
      old_value: { confidentiality: doc.confidentiality },
      new_value: { confidentiality: value },
    });
    refetch();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Dossier documentaire
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          {canManage && (
            <div className="flex items-center gap-2 text-sm">
              <Switch checked={showArchived} onCheckedChange={setShowArchived} id="show-archived" />
              <Label htmlFor="show-archived" className="text-muted-foreground">Voir les archives</Label>
            </div>
          )}
          {canUpload && (
            <Button onClick={openDialog} size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Ajouter un document
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isOwner && !canManage && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Certaines pièces administratives de votre dossier sont réservées au service RH et
              ne s'affichent pas ici.
            </AlertDescription>
          </Alert>
        )}

        {visibleDocuments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun document dans le dossier</p>
          </div>
        ) : (
          grouped.map(({ category, docs }) => (
            <div key={category.value} className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {category.label}
              </h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead className="hidden md:table-cell">Référence</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead>Validité</TableHead>
                      {canManage && <TableHead>Confidentialité</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map((doc) => {
                      const expiry = documentExpiryState(doc.expires_at);
                      return (
                        <TableRow key={doc.id} className={doc.is_archived ? "opacity-60" : undefined}>
                          <TableCell className="max-w-[260px]">
                            <div className="font-medium truncate">{doc.title || doc.file_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {documentTypeLabel(doc.document_type)} • {formatFileSize(doc.file_size)}
                              {doc.is_archived && " • archivé"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {doc.reference_number || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {doc.document_date
                              ? format(new Date(`${doc.document_date}T00:00:00`), "dd MMM yyyy", { locale: fr })
                              : format(new Date(doc.created_at), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {expiry === "none" ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <Badge
                                variant={
                                  expiry === "expired"
                                    ? "destructive"
                                    : expiry === "expiring"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {expiryStateLabel[expiry]}
                              </Badge>
                            )}
                          </TableCell>
                          {canManage && (
                            <TableCell>
                              <Select
                                value={doc.confidentiality}
                                onValueChange={(v) => handleConfidentialityChange(doc, v)}
                              >
                                <SelectTrigger className="w-[170px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONFIDENTIALITY_LEVELS.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>
                                      {c.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Télécharger">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handlePrint(doc)} title="Imprimer">
                                <Printer className="h-4 w-4" />
                              </Button>
                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleArchive(doc)}
                                  title={doc.is_archived ? "Restaurer" : "Archiver"}
                                >
                                  {doc.is_archived ? <Trash2 className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))
        )}

        <p className="text-xs text-muted-foreground">
          Formats acceptés : PDF, Word, JPEG, PNG • Taille max : 10 Mo • Stockage privé et accès contrôlé côté serveur.
        </p>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un document au dossier</DialogTitle>
            <DialogDescription>
              Les métadonnées facilitent le suivi des pièces et la détection des expirations.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Fichier</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
              />
            </div>

            <div>
              <Label>Type de document</Label>
              <Select
                value={form.document_type}
                onValueChange={(v) => setForm((f) => ({ ...f, document_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <div key={cat.value}>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{cat.label}</div>
                      {DOCUMENT_TYPES.filter((t) => t.category === cat.value).map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Catégorie : {documentCategoryLabel(documentTypeCategory(form.document_type))}
              </p>
            </div>

            <div>
              <Label>Titre</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Intitulé du document"
              />
            </div>

            <div>
              <Label>Numéro / référence</Label>
              <Input
                value={form.reference_number}
                onChange={(e) => setForm((f) => ({ ...f, reference_number: e.target.value }))}
              />
            </div>

            <div>
              <Label>Organisme émetteur</Label>
              <Input
                value={form.issuer}
                onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
              />
            </div>

            <div>
              <Label>Date du document</Label>
              <Input
                type="date"
                value={form.document_date}
                onChange={(e) => setForm((f) => ({ ...f, document_date: e.target.value }))}
              />
            </div>

            <div>
              <Label>Date d'effet</Label>
              <Input
                type="date"
                value={form.effective_date}
                onChange={(e) => setForm((f) => ({ ...f, effective_date: e.target.value }))}
              />
            </div>

            <div>
              <Label>Date d'expiration</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              />
            </div>

            {canManage && (
              <div>
                <Label className="flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Confidentialité
                </Label>
                <Select
                  value={form.confidentiality}
                  onValueChange={(v) => setForm((f) => ({ ...f, confidentiality: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONFIDENTIALITY_LEVELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label} — {c.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="md:col-span-2">
              <Label>Commentaire</Label>
              <Textarea
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
              Annuler
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !pendingFile}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export { confidentialityLabel };
