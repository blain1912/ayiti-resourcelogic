import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Download, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type DocCategory = 
  | "reglement_interieur"
  | "loi_fonction_publique"
  | "grille_salariale"
  | "budget"
  | "feuille_emargement"
  | "politique_rh"
  | "organigramme"
  | "autre";

const categoryLabels: Record<DocCategory, string> = {
  reglement_interieur: "Règlement intérieur",
  loi_fonction_publique: "Loi sur la fonction publique",
  grille_salariale: "Grille salariale",
  budget: "Budget",
  feuille_emargement: "Feuille d'émargement",
  politique_rh: "Politique RH",
  organigramme: "Organigramme",
  autre: "Autre",
};

const categoryColors: Record<DocCategory, "default" | "secondary" | "outline"> = {
  reglement_interieur: "default",
  loi_fonction_publique: "secondary",
  grille_salariale: "outline",
  budget: "default",
  feuille_emargement: "secondary",
  politique_rh: "outline",
  organigramme: "default",
  autre: "secondary",
};

interface OrgDocument {
  id: string;
  category: DocCategory;
  file_name: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

export default function Documents() {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<OrgDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocCategory>("reglement_interieur");
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }
      setOrganizationId(profile.organization_id);

      // Check admin role
      const { data: adminCheck } = await supabase.rpc("has_admin_role", {
        _user_id: user.id,
        _organization_id: profile.organization_id,
      });
      setIsAdmin(!!adminCheck);

      await fetchDocuments(profile.organization_id);
    } catch (error) {
      console.error("Error initializing:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (orgId: string) => {
    const { data, error } = await supabase
      .from("organization_documents")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      return;
    }
    setDocuments((data || []) as OrgDocument[]);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organizationId || !userId) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Erreur", description: "Type de fichier non supporté.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Erreur", description: "Le fichier doit faire moins de 10 Mo", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${organizationId}/${selectedCategory}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("organization_documents")
        .insert({
          organization_id: organizationId,
          category: selectedCategory,
          file_name: file.name,
          file_url: uploadData.path,
          file_size: file.size,
          uploaded_by: userId,
        });

      if (dbError) throw dbError;

      toast({ title: "Succès", description: "Document partagé avec succès" });
      await fetchDocuments(organizationId);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Erreur", description: error.message || "Erreur lors du téléchargement", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (doc: OrgDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("employee-documents")
        .createSignedUrl(doc.file_url, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de télécharger le document", variant: "destructive" });
    }
  };

  const handleDelete = async (doc: OrgDocument) => {
    if (!confirm("Supprimer ce document partagé ?")) return;
    try {
      await supabase.storage.from("employee-documents").remove([doc.file_url]);
      const { error } = await supabase.from("organization_documents").delete().eq("id", doc.id);
      if (error) throw error;
      toast({ title: "Succès", description: "Document supprimé" });
      if (organizationId) await fetchDocuments(organizationId);
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t("documentManagement")}</h1>
          <p className="text-muted-foreground mt-1">
            Documents partagés de l'organisation (lecture seule)
          </p>
        </div>
      </section>

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Ajouter un document partagé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as DocCategory)}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleUploadClick} disabled={uploading}>
                {uploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Téléchargement...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" />Ajouter</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Formats acceptés : PDF, Word, Excel, JPEG, PNG • Max 10 Mo
            </p>
          </CardContent>
        </Card>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-40" />
          <p className="text-lg">Aucun document partagé</p>
          {isAdmin && <p className="text-sm mt-2">Ajoutez des documents accessibles à tous les employés</p>}
        </div>
      ) : (
        <section className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{doc.file_name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={categoryColors[doc.category] || "secondary"}>
                          {categoryLabels[doc.category] || doc.category}
                        </Badge>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(doc.created_at), "dd MMM yyyy", { locale: fr })}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Télécharger">
                      <Download className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} title="Supprimer" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
