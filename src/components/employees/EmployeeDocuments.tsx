import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Download, FileText, Loader2, AlertCircle, Printer } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface EmployeeDocumentsProps {
  profileId: string;
  organizationId: string;
  userId: string;
  isOwner?: boolean;
}

type DocumentType = 'cv' | 'diplome' | 'certificat' | 'piece_identite' | 'lettre_nomination' | 'matricule_fiscale' | 'declaration_impot' | 'autre';

interface Document {
  id: string;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

const documentTypeLabels: Record<DocumentType, string> = {
  cv: "CV",
  diplome: "Diplôme",
  certificat: "Certificat",
  piece_identite: "Pièce d'identité",
  lettre_nomination: "Lettre de nomination",
  matricule_fiscale: "Matricule fiscale",
  declaration_impot: "Déclaration définitive d'impôt",
  autre: "Autre"
};

export function EmployeeDocuments({ profileId, organizationId, userId, isOwner = true }: EmployeeDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>('cv');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if upload is possible
  const canUpload = Boolean(profileId && organizationId && userId);

  useEffect(() => {
    if (profileId) {
      fetchDocuments();
    } else {
      setLoading(false);
    }
  }, [profileId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as Document[]);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    if (!canUpload) {
      toast({
        title: "Téléchargement impossible",
        description: "Vous devez être assigné à une organisation pour télécharger des documents.",
        variant: "destructive",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Double-check that we have all required data
    if (!canUpload) {
      toast({
        title: "Erreur",
        description: "Données manquantes pour le téléchargement",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Erreur",
        description: "Type de fichier non supporté. Utilisez PDF, Word, JPEG ou PNG.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "Le fichier doit faire moins de 10 Mo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${profileId}/${selectedType}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get signed URL for private bucket
      const { data: urlData } = await supabase.storage
        .from('employee-documents')
        .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365); // 1 year validity

      // Save document metadata
      const { error: dbError } = await supabase
        .from('employee_documents')
        .insert({
          profile_id: profileId,
          organization_id: organizationId,
          document_type: selectedType,
          file_name: file.name,
          file_url: uploadData.path,
          file_size: file.size,
          uploaded_by: userId
        });

      if (dbError) throw dbError;

      toast({
        title: "Succès",
        description: "Document téléchargé avec succès",
      });

      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du téléchargement",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('employee-documents')
      .createSignedUrl(filePath, 300); // 5 minutes
    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    return data.signedUrl;
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertImageToPdf = async (blob: Blob, fileName: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'l' : 'p',
          unit: 'px',
          format: [img.width, img.height],
        });
        pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
        const pdfBlob = pdf.output('blob');
        resolve(pdfBlob);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Impossible de charger l\'image'));
      };
      img.src = URL.createObjectURL(blob);
    });
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .download(doc.file_url);

      if (error || !data) throw error || new Error('Fichier introuvable');

      const isImage = /\.(jpg|jpeg|png)$/i.test(doc.file_name);
      const isPdf = /\.pdf$/i.test(doc.file_name);

      if (isPdf) {
        downloadBlob(data, doc.file_name);
      } else if (isImage) {
        const pdfBlob = await convertImageToPdf(data, doc.file_name);
        const pdfName = doc.file_name.replace(/\.[^.]+$/, '.pdf');
        downloadBlob(pdfBlob, pdfName);
      } else {
        // Word docs etc. - convert to PDF not possible client-side, download as-is
        downloadBlob(data, doc.file_name);
      }

      toast({ title: "Succès", description: "Document téléchargé" });
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le document",
        variant: "destructive",
      });
    }
  };

  const handlePrint = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .download(doc.file_url);

      if (error || !data) throw error || new Error('Fichier introuvable');

      const isImage = /\.(jpg|jpeg|png)$/i.test(doc.file_name);
      let printBlob: Blob;

      if (isImage) {
        printBlob = await convertImageToPdf(data, doc.file_name);
      } else {
        printBlob = data;
      }

      const url = URL.createObjectURL(printBlob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      } else {
        // Fallback: iframe
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.addEventListener('load', () => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 1000);
        });
      }
    } catch (error: any) {
      console.error('Error printing document:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'imprimer le document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('employee-documents')
        .remove([doc.file_url]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast({
        title: "Succès",
        description: "Document supprimé",
      });

      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isOwner && !canUpload && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vous devez être assigné à une organisation pour télécharger des documents.
            </AlertDescription>
          </Alert>
        )}
        {isOwner && canUpload && (
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as DocumentType)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Type de document" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(documentTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={handleUploadClick}
              disabled={uploading || !canUpload}
              className="flex-1 sm:flex-none"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Téléchargement...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Ajouter un document
                </>
              )}
            </Button>
          </div>
        )}

        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun document téléchargé</p>
            {isOwner && (
              <p className="text-sm mt-2">
                Ajoutez vos CV, diplômes, certificats et pièces d'identité
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Nom du fichier</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Date d'ajout</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {documentTypeLabels[doc.document_type]}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {doc.file_name}
                    </TableCell>
                    <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell>
                      {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(doc)}
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(doc)}
                          title="Imprimer"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc)}
                            title="Supprimer"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Formats acceptés: PDF, Word, JPEG, PNG • Taille max: 10 Mo
        </p>
      </CardContent>
    </Card>
  );
}
