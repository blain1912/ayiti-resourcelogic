import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Briefcase, MapPin, Calendar, DollarSign, Users, Send, FileText, Upload, X, Building2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type JobPosting = {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  salary_min: number | null;
  salary_max: number | null;
  number_of_positions: number;
  deadline: string | null;
  created_at: string;
  organization_id: string;
  organization?: { name: string; logo_url: string | null } | null;
  unit?: { name: string } | null;
  position?: { name: string } | null;
};

const Careers = () => {
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get("org");
  
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    coverLetter: "",
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchJobs();
  }, [orgId]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("job_postings")
        .select(`
          id,
          title,
          description,
          requirements,
          salary_min,
          salary_max,
          number_of_positions,
          deadline,
          created_at,
          organization_id,
          organization:organizations(name, logo_url),
          unit:organizational_units(name),
          position:positions(name)
        `)
        .eq("recruitment_type", "external")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (orgId) {
        query = query.eq("organization_id", orgId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setJobPostings(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Erreur lors du chargement des offres");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Format de fichier non supporté. Veuillez utiliser PDF ou Word.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Le fichier est trop volumineux. Maximum 5 MB.");
        return;
      }
      setCvFile(file);
    }
  };

  const removeFile = () => {
    setCvFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleApply = async () => {
    if (!selectedJob) return;

    // Validate required fields
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Veuillez remplir les champs obligatoires (nom et email)");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }

    setSubmitting(true);
    try {
      let cvUrl: string | null = null;

      // Upload CV if provided (using public upload for external candidates)
      if (cvFile) {
        const fileExt = cvFile.name.split('.').pop();
        const fileName = `external/${selectedJob.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Use edge function to upload CV for external candidates
        const formDataUpload = new FormData();
        formDataUpload.append('file', cvFile);
        formDataUpload.append('jobId', selectedJob.id);
        formDataUpload.append('fileName', fileName);

        const { data: uploadResult, error: uploadError } = await supabase.functions.invoke('upload-external-cv', {
          body: formDataUpload,
        });

        if (uploadError) {
          console.error("Error uploading CV:", uploadError);
          // Continue without CV if upload fails
        } else {
          cvUrl = uploadResult?.url || null;
        }
      }

      // Insert application via edge function (for unauthenticated users)
      const { error } = await supabase.functions.invoke('submit-external-application', {
        body: {
          job_posting_id: selectedJob.id,
          organization_id: selectedJob.organization_id,
          applicant_name: formData.name.trim(),
          applicant_email: formData.email.trim(),
          applicant_phone: formData.phone.trim() || null,
          cover_letter: formData.coverLetter.trim() || null,
          applicant_cv_url: cvUrl,
        },
      });

      if (error) throw error;

      setApplicationSuccess(true);
      toast.success("Votre candidature a été soumise avec succès!");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Erreur lors de la soumission de votre candidature");
    } finally {
      setSubmitting(false);
    }
  };

  const openApplyDialog = (job: JobPosting) => {
    setSelectedJob(job);
    setFormData({ name: "", email: "", phone: "", coverLetter: "" });
    setCvFile(null);
    setApplicationSuccess(false);
    setIsApplyDialogOpen(true);
  };

  const closeDialog = () => {
    setIsApplyDialogOpen(false);
    setApplicationSuccess(false);
    setSelectedJob(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <p>Chargement des offres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Offres d'emploi</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Découvrez nos opportunités de carrière et rejoignez nos équipes
          </p>
        </div>

        {jobPostings.length === 0 ? (
          <Card className="text-center py-12 max-w-lg mx-auto">
            <CardContent>
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune offre disponible</h3>
              <p className="text-muted-foreground">
                Il n'y a actuellement aucune offre d'emploi ouverte.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobPostings.map((job) => (
              <Card key={job.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {job.organization?.logo_url ? (
                      <img 
                        src={job.organization.logo_url} 
                        alt={job.organization.name}
                        className="h-10 w-10 rounded object-contain"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        {job.organization?.name}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {job.unit && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {job.unit.name}
                    </div>
                  )}

                  {job.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {job.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-sm">
                    {job.position && (
                      <Badge variant="outline">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {job.position.name}
                      </Badge>
                    )}
                    {job.number_of_positions > 1 && (
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {job.number_of_positions} postes
                      </Badge>
                    )}
                  </div>

                  {(job.salary_min || job.salary_max) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      {job.salary_min && job.salary_max
                        ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} HTG`
                        : job.salary_min
                        ? `À partir de ${job.salary_min.toLocaleString()} HTG`
                        : `Jusqu'à ${job.salary_max?.toLocaleString()} HTG`}
                    </div>
                  )}

                  {job.deadline && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Date limite: {format(new Date(job.deadline), "d MMMM yyyy", { locale: fr })}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => openApplyDialog(job)}>
                    <Send className="h-4 w-4 mr-2" />
                    Postuler
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Apply Dialog */}
        <Dialog open={isApplyDialogOpen} onOpenChange={closeDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {applicationSuccess ? "Candidature soumise" : `Postuler - ${selectedJob?.title}`}
              </DialogTitle>
            </DialogHeader>
            
            {applicationSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Merci pour votre candidature!</h3>
                <p className="text-muted-foreground">
                  Votre candidature a été enregistrée. Nous l'examinerons attentivement et vous contacterons si votre profil correspond à nos besoins.
                </p>
                <Button className="mt-6" onClick={closeDialog}>
                  Fermer
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4 py-4">
                  {selectedJob?.description && (
                    <div>
                      <Label className="text-muted-foreground">Description du poste</Label>
                      <p className="text-sm mt-1">{selectedJob.description}</p>
                    </div>
                  )}
                  {selectedJob?.requirements && (
                    <div>
                      <Label className="text-muted-foreground">Exigences</Label>
                      <p className="text-sm mt-1">{selectedJob.requirements}</p>
                    </div>
                  )}
                  
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium">Vos informations</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nom complet *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Jean Dupont"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="jean.dupont@email.com"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+509 0000 0000"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cv">CV (PDF ou Word, max 5 MB)</Label>
                      <div className="flex flex-col gap-2">
                        <Input
                          ref={fileInputRef}
                          id="cv"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        {cvFile ? (
                          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="flex-1 text-sm truncate">{cvFile.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={removeFile}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Télécharger votre CV
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="coverLetter">Lettre de motivation</Label>
                      <Textarea
                        id="coverLetter"
                        value={formData.coverLetter}
                        onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                        placeholder="Expliquez pourquoi vous êtes intéressé par ce poste..."
                        rows={5}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeDialog}>
                    Annuler
                  </Button>
                  <Button onClick={handleApply} disabled={submitting}>
                    {submitting ? "Envoi..." : "Soumettre ma candidature"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Careers;
