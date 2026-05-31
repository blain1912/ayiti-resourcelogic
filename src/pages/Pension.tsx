import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  ShieldCheck, AlertCircle, CheckCircle2, FileText, Upload, Loader2,
  Calendar, ExternalLink, Send, Trash2, Clock,
} from "lucide-react";

const REQUIRED_DOCS: { key: string; label: string; required: boolean }[] = [
  { key: "acte_naissance", label: "Acte de naissance", required: true },
  { key: "acte_mariage", label: "Acte de mariage (le cas échéant)", required: false },
  { key: "lettre_nomination", label: "Lettre(s) de nomination", required: true },
  { key: "commissions", label: "Commissions / arrêtés", required: false },
  { key: "proces_verbal_installation", label: "Procès-verbal d'installation", required: false },
  { key: "lettres_service", label: "Lettres de service", required: false },
  { key: "etat_carriere_dpc", label: "État de carrière DPC", required: false },
  { key: "piece_identite", label: "Pièce d'identité (CIN / NIF)", required: true },
];

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  brouillon: { label: "Brouillon", variant: "outline" },
  soumis_drh: { label: "Soumis à la DRH", variant: "secondary" },
  valide_drh: { label: "Validé par la DRH", variant: "secondary" },
  transmis_dpc: { label: "Transmis à la DPC", variant: "default" },
  en_instruction: { label: "En instruction (DPC)", variant: "default" },
  accordee: { label: "Pension accordée", variant: "default" },
  rejetee: { label: "Rejetée", variant: "destructive" },
};

// Critères haïtiens couramment exigés : 55 ans OU 25 années de service
const MIN_AGE = 55;
const MIN_YEARS = 25;

const yearsBetween = (from?: string | null, to: Date = new Date()) => {
  if (!from) return 0;
  const d = new Date(from);
  if (Number.isNaN(d.getTime())) return 0;
  const ms = to.getTime() - d.getTime();
  return ms / (1000 * 60 * 60 * 24 * 365.25);
};

type DocItem = { key: string; label: string; url: string; name: string; uploaded_at: string };

export default function Pension() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [request, setRequest] = useState<any>(null);
  const [comments, setComments] = useState("");
  const [dpcRef, setDpcRef] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase
        .from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      setProfile(prof);
      if (prof) {
        const { data: req } = await supabase
          .from("pension_requests")
          .select("*")
          .eq("employee_id", prof.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (req) {
          setRequest(req);
          setComments(req.comments || "");
          setDpcRef(req.dpc_reference || "");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Cumul de poste (Employé + Enseignant) : on retient la date la plus ancienne
  const entryDates = [profile?.date_entree_fonction, profile?.professor_date_entree_fonction]
    .filter(Boolean)
    .map((d: string) => new Date(d).getTime())
    .filter((t) => !Number.isNaN(t));
  const earliestEntry = entryDates.length > 0
    ? new Date(Math.min(...entryDates)).toISOString().slice(0, 10)
    : null;

  const age = Math.floor(yearsBetween(profile?.date_naissance));
  const service = Math.floor(yearsBetween(earliestEntry) * 10) / 10;
  const ageOk = age >= MIN_AGE;
  const serviceOk = service >= MIN_YEARS;
  const eligible = ageOk || serviceOk;
  const monthsToAge = ageOk ? 0 : Math.ceil((MIN_AGE - yearsBetween(profile?.date_naissance)) * 12);
  const monthsToService = serviceOk ? 0 : Math.ceil((MIN_YEARS - yearsBetween(earliestEntry)) * 12);
  const hasCumul = entryDates.length > 1;

  const docs: DocItem[] = (request?.documents as DocItem[]) || [];
  const missingRequired = REQUIRED_DOCS.filter(d => d.required && !docs.some(x => x.key === d.key));

  const upsertRequest = async (patch: Record<string, any>) => {
    setSaving(true);
    try {
      const payload = {
        organization_id: profile.organization_id,
        employee_id: profile.id,
        age_years: age,
        service_years: service,
        is_eligible: eligible,
        eligibility_notes: `Âge: ${age} ans (min ${MIN_AGE}) ; Service: ${service} ans (min ${MIN_YEARS})`,
        comments,
        dpc_reference: dpcRef || null,
        ...patch,
      };
      let res;
      if (request?.id) {
        res = await supabase.from("pension_requests").update(payload).eq("id", request.id).select().single();
      } else {
        res = await supabase.from("pension_requests").insert(payload).select().single();
      }
      if (res.error) throw res.error;
      setRequest(res.data);
      return res.data;
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (docKey: string, label: string, file: File) => {
    if (!profile) return;
    setUploading(docKey);
    try {
      let req = request;
      if (!req) req = await upsertRequest({});
      if (!req) return;

      const ext = file.name.split(".").pop();
      const path = `${profile.id}/pension/${req.id}/${docKey}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("employee-documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const newDocs = [
        ...((req.documents as DocItem[]) || []).filter((d: DocItem) => d.key !== docKey),
        { key: docKey, label, url: path, name: file.name, uploaded_at: new Date().toISOString() },
      ];
      await upsertRequest({ documents: newDocs });
      toast({ title: "Document ajouté", description: label });
    } catch (e: any) {
      toast({ title: "Erreur de téléversement", description: e.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (docKey: string) => {
    if (!request) return;
    const doc = docs.find(d => d.key === docKey);
    if (doc) {
      await supabase.storage.from("employee-documents").remove([doc.url]);
    }
    const newDocs = docs.filter(d => d.key !== docKey);
    await upsertRequest({ documents: newDocs });
  };

  const downloadDoc = async (doc: DocItem) => {
    const { data, error } = await supabase.storage
      .from("employee-documents").createSignedUrl(doc.url, 300);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const submitToDRH = async () => {
    if (missingRequired.length > 0) {
      toast({
        title: "Pièces manquantes",
        description: `Veuillez fournir : ${missingRequired.map(d => d.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    const r = await upsertRequest({ status: "soumis_drh", submitted_at: new Date().toISOString() });
    if (r) toast({ title: "Demande soumise", description: "La DRH a été notifiée de votre demande." });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profil introuvable</AlertTitle>
          <AlertDescription>Veuillez compléter votre profil avant de faire une demande de pension.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const status = request?.status || "brouillon";
  const statusInfo = STATUS_LABELS[status];
  const isLocked = !["brouillon", "soumis_drh"].includes(status);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Demande de pension
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Préparez et déposez votre dossier de pension auprès de la Direction de la Pension Civile (DPC).
          </p>
        </div>
        {request && <Badge variant={statusInfo.variant} className="text-sm py-1.5 px-3">{statusInfo.label}</Badge>}
      </div>

      <Tabs defaultValue="eligibilite" className="w-full">
        <TabsList className="w-full overflow-x-auto justify-start">
          <TabsTrigger value="eligibilite">Éligibilité</TabsTrigger>
          <TabsTrigger value="dossier">Dossier</TabsTrigger>
          <TabsTrigger value="suivi">Suivi & Aide</TabsTrigger>
        </TabsList>

        {/* === ELIGIBILITE === */}
        <TabsContent value="eligibilite" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {eligible ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Clock className="h-5 w-5 text-amber-600" />}
                {eligible ? "Vous êtes éligible à la pension" : "Pas encore éligible"}
              </CardTitle>
              <CardDescription>
                Conditions vérifiées automatiquement à partir de votre profil
                (âge ≥ {MIN_AGE} ans <em>ou</em> ancienneté ≥ {MIN_YEARS} ans).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Âge</span>
                    {ageOk
                      ? <Badge className="bg-green-600">Validé</Badge>
                      : <Badge variant="outline">Dans {monthsToAge} mois</Badge>}
                  </div>
                  <div className="text-3xl font-bold mt-2">{age} ans</div>
                  <div className="text-xs text-muted-foreground mt-1">Minimum requis : {MIN_AGE} ans</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Années de service</span>
                    {serviceOk
                      ? <Badge className="bg-green-600">Validé</Badge>
                      : <Badge variant="outline">Dans {monthsToService} mois</Badge>}
                  </div>
                  <div className="text-3xl font-bold mt-2">{service} ans</div>
                  <div className="text-xs text-muted-foreground mt-1">Minimum requis : {MIN_YEARS} ans</div>
                </div>
              </div>

              {hasCumul && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Cumul de poste détecté (Employé + Enseignant)</AlertTitle>
                  <AlertDescription>
                    Conformément à la pratique de la fonction publique haïtienne, l'ancienneté retenue
                    correspond à la <strong>date d'entrée la plus ancienne</strong> entre vos deux fonctions
                    {earliestEntry ? <> ({new Date(earliestEntry).toLocaleDateString("fr-FR")})</> : null}.
                  </AlertDescription>
                </Alert>
              )}

              {!profile.date_naissance || !earliestEntry ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Données manquantes</AlertTitle>
                  <AlertDescription>
                    Votre date de naissance ou date d'entrée en fonction est manquante.
                    <Link to="/employee-profile" className="underline ml-1">Compléter mon profil</Link>
                  </AlertDescription>
                </Alert>
              ) : null}

              {eligible ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Vous pouvez déposer votre dossier</AlertTitle>
                  <AlertDescription>
                    Passez à l'onglet <strong>Dossier</strong> pour téléverser les pièces requises et soumettre votre demande.
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === DOSSIER === */}
        <TabsContent value="dossier" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Pièces du dossier</CardTitle>
              <CardDescription>
                Téléversez les documents demandés. Les pièces marquées d'un astérisque sont obligatoires.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {REQUIRED_DOCS.map(({ key, label, required }) => {
                const existing = docs.find(d => d.key === key);
                return (
                  <div key={key} className="flex items-center justify-between gap-3 border rounded-lg p-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {label} {required && <span className="text-destructive">*</span>}
                      </div>
                      {existing && (
                        <button onClick={() => downloadDoc(existing)} className="text-xs text-primary underline truncate block max-w-full">
                          {existing.name}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {existing ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : null}
                      {!isLocked && (
                        <>
                          <input
                            type="file"
                            id={`file-${key}`}
                            className="hidden"
                            accept="application/pdf,image/*"
                            onChange={e => e.target.files?.[0] && handleUpload(key, label, e.target.files[0])}
                          />
                          <Button size="sm" variant="outline" disabled={uploading === key}
                            onClick={() => document.getElementById(`file-${key}`)?.click()}>
                            {uploading === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            <span className="ml-1">{existing ? "Remplacer" : "Téléverser"}</span>
                          </Button>
                          {existing && (
                            <Button size="icon" variant="ghost" onClick={() => handleRemove(key)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations complémentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="comments">Commentaires / précisions</Label>
                <Textarea id="comments" rows={3} value={comments}
                  disabled={isLocked}
                  onChange={e => setComments(e.target.value)}
                  placeholder="Toute information utile pour le traitement de votre dossier..." />
              </div>
              <div>
                <Label htmlFor="dpc-ref">Numéro DPC (si déjà connu)</Label>
                <Input id="dpc-ref" value={dpcRef} disabled={isLocked}
                  onChange={e => setDpcRef(e.target.value)} placeholder="Optionnel" />
              </div>
              {!isLocked && (
                <div className="flex gap-2 flex-wrap pt-2">
                  <Button variant="outline" onClick={() => upsertRequest({ status: "brouillon" })} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enregistrer comme brouillon
                  </Button>
                  <Button onClick={submitToDRH} disabled={saving || !eligible}>
                    <Send className="h-4 w-4" />
                    Soumettre à la DRH
                  </Button>
                </div>
              )}
              {missingRequired.length > 0 && !isLocked && (
                <p className="text-xs text-amber-700">
                  Pièces obligatoires manquantes : {missingRequired.map(d => d.label).join(", ")}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === SUIVI === */}
        <TabsContent value="suivi" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Statut de votre demande</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {request ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    {request.submitted_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Soumise le {new Date(request.submitted_at).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                  {request.drh_comment && (
                    <Alert>
                      <AlertTitle>Commentaire de la DRH</AlertTitle>
                      <AlertDescription>{request.drh_comment}</AlertDescription>
                    </Alert>
                  )}
                  {request.dpc_reference && (
                    <p className="text-sm"><strong>Référence DPC :</strong> {request.dpc_reference}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune demande en cours.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>À propos de la DPC</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                La <strong>Direction de la Pension Civile (DPC)</strong>, rattachée au Ministère de l'Économie et des Finances,
                gère les pensions des agents de la fonction publique en Haïti.
              </p>
              <p>
                Conseil : demandez d'abord un <strong>état de carrière</strong> à la DPC afin de vous assurer que toutes vos années
                de service sont correctement comptabilisées avant le dépôt officiel.
              </p>
              <a
                href="https://www.mef.gouv.ht"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline"
              >
                Site officiel du MEF <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
