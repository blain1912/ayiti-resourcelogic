import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { DollarSign, Upload, FileText, Download, Trash2, Loader2, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EmargementDoc {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  period_label: string | null;
  upload_date: string;
  created_at: string;
}

import {
  FISCAL_MONTHS,
  MONTH_NAMES,
  fiscalYearStart,
  fiscalYearLabel,
  fiscalYearOptions,
  calendarYearForFiscalMonth,
  fiscalYearOf,
  fiscalMonthOrder,
} from "@/lib/fiscalYear";

const Payroll = () => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [docs, setDocs] = useState<EmargementDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [fiscalYear, setFiscalYear] = useState<string>(String(fiscalYearStart()));
  const year = String(calendarYearForFiscalMonth(parseInt(fiscalYear), parseInt(month)));
  const fileRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();
      if (profile?.organization_id) setOrganizationId(profile.organization_id);
    })();
  }, []);

  useEffect(() => {
    if (organizationId) fetchDocs();
  }, [organizationId]);

  const fetchDocs = async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("emargement_documents")
      .select("id, file_name, file_url, file_size, period_label, upload_date, created_at")
      .eq("organization_id", organizationId)
      .order("upload_date", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setDocs(data || []);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organizationId) return;

    if (file.type !== "application/pdf") {
      toast({ title: "Format invalide", description: "Seuls les fichiers PDF sont acceptés", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Max 20 Mo", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const periodLabel = `${MONTH_NAMES[parseInt(month) - 1]} ${year} (${fiscalYearLabel(parseInt(fiscalYear))})`;
      const path = `${organizationId}/${year}-${month.padStart(2, "0")}-${Date.now()}-${file.name}`;

      const { data: up, error: upErr } = await supabase.storage
        .from("emargement-documents")
        .upload(path, file);
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage
        .from("emargement-documents")
        .getPublicUrl(up.path);

      const { error: insErr } = await supabase.from("emargement_documents").insert({
        organization_id: organizationId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        period_label: periodLabel,
        upload_date: `${year}-${month.padStart(2, "0")}-01`,
      });
      if (insErr) throw insErr;

      toast({ title: "Émargement téléversé", description: periodLabel });
      setOpen(false);
      fetchDocs();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (doc: EmargementDoc) => {
    if (!confirm(`Supprimer "${doc.file_name}" ?`)) return;
    try {
      const path = doc.file_url.split("/emargement-documents/")[1];
      if (path) {
        await supabase.storage.from("emargement-documents").remove([decodeURIComponent(path)]);
      }
      await supabase.from("emargement_documents").delete().eq("id", doc.id);
      toast({ title: "Document supprimé" });
      fetchDocs();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const formatSize = (b: number | null) => {
    if (!b) return "—";
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
    return `${(b / (1024 * 1024)).toFixed(2)} Mo`;
  };

  const fiscalYears = fiscalYearOptions(6);


  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Paie</h1>
            </div>
            <p className="text-muted-foreground">
              Téléversez et consultez les états d'émargement mensuels livrés par le MEF.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Téléverser un émargement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvel état d'émargement</DialogTitle>
                <DialogDescription>
                  Sélectionnez la période et le fichier PDF reçu du MEF.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Exercice fiscal</Label>
                    <select
                      value={fiscalYear}
                      onChange={(e) => setFiscalYear(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {fiscalYears.map((y) => (
                        <option key={y} value={y}>{`${y}-${y + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mois</Label>
                    <select
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {FISCAL_MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  L'exercice fiscal court du 1<sup>er</sup> octobre {fiscalYear} au 30 septembre{" "}
                  {parseInt(fiscalYear) + 1}. Période sélectionnée :{" "}
                  <span className="font-medium text-foreground">
                    {MONTH_NAMES[parseInt(month) - 1]} {year}
                  </span>
                  .
                </p>


                <div className="space-y-2">
                  <Label>Fichier PDF</Label>
                  <Input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </div>

                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Téléversement en cours...
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
                  Fermer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              États d'émargement
              <Badge variant="secondary" className="ml-2">{docs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement...
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>Aucun état d'émargement téléversé.</p>
                <p className="text-sm">Cliquez sur "Téléverser un émargement" pour commencer.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exercice</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Fichier</TableHead>
                      <TableHead>Taille</TableHead>
                      <TableHead>Téléversé le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDocs.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {docFiscalYear(d) !== null
                              ? `${docFiscalYear(d)}-${(docFiscalYear(d) as number) + 1}`
                              : "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {d.period_label || "—"}
                          </div>
                        </TableCell>

                        <TableCell className="text-sm">{d.file_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatSize(d.file_size)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(d.created_at), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/payroll/${d.id}`} className="gap-1">
                                <ArrowRight className="h-4 w-4" />
                                <span className="hidden sm:inline">Suivi & extraction</span>
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="gap-1">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(d)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Payroll;
