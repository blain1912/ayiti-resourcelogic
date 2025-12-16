import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Briefcase, MapPin, Calendar, DollarSign, Users, CheckCircle, Clock, Send } from "lucide-react";
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
  unit?: { name: string } | null;
  position?: { name: string } | null;
};

type MyApplication = {
  id: string;
  job_posting_id: string;
  status: string;
  cover_letter: string | null;
  created_at: string;
  job_posting?: { title: string } | null;
};

const applicationStatusLabels: Record<string, string> = {
  pending: "En attente",
  reviewing: "En cours d'examen",
  shortlisted: "Présélectionné",
  interview: "Entretien prévu",
  offered: "Offre reçue",
  accepted: "Accepté",
  rejected: "Rejeté",
};

const applicationStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  reviewing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  shortlisted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  interview: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  offered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const InternalJobs = () => {
  const { user } = useAuth();
  const { organization, loading: orgLoading } = useOrganization();
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.id && user?.id) {
      fetchData();
    }
  }, [organization?.id, user?.id]);

  const fetchData = async () => {
    if (!organization?.id || !user?.id) return;
    setLoading(true);

    try {
      // Get user's profile id
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfileId(profileData.id);

        // Fetch my applications
        const { data: appsData } = await supabase
          .from("job_applications")
          .select(`
            id,
            job_posting_id,
            status,
            cover_letter,
            created_at,
            job_posting:job_postings(title)
          `)
          .eq("profile_id", profileData.id)
          .order("created_at", { ascending: false });

        setMyApplications(appsData || []);
      }

      // Fetch open internal job postings
      const { data: postingsData, error } = await supabase
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
          unit:organizational_units(name),
          position:positions(name)
        `)
        .eq("organization_id", organization.id)
        .eq("recruitment_type", "internal")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobPostings(postingsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des offres");
    } finally {
      setLoading(false);
    }
  };

  const hasApplied = (jobId: string) => {
    return myApplications.some(app => app.job_posting_id === jobId);
  };

  const getApplicationStatus = (jobId: string) => {
    const app = myApplications.find(app => app.job_posting_id === jobId);
    return app?.status || null;
  };

  const handleApply = async () => {
    if (!selectedJob || !profileId || !organization?.id) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("job_applications").insert({
        job_posting_id: selectedJob.id,
        organization_id: organization.id,
        profile_id: profileId,
        cover_letter: coverLetter || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Votre candidature a été soumise avec succès!");
      setIsApplyDialogOpen(false);
      setCoverLetter("");
      setSelectedJob(null);
      fetchData();
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Erreur lors de la soumission de votre candidature");
    } finally {
      setSubmitting(false);
    }
  };

  const openApplyDialog = (job: JobPosting) => {
    setSelectedJob(job);
    setCoverLetter("");
    setIsApplyDialogOpen(true);
  };

  if (orgLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Offres d'emploi internes</h1>
          <p className="text-muted-foreground">Postulez aux postes disponibles au sein de votre organisation</p>
        </div>

        {/* My Applications Section */}
        {myApplications.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Mes candidatures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{app.job_posting?.title || "Poste supprimé"}</p>
                      <p className="text-sm text-muted-foreground">
                        Soumis le {format(new Date(app.created_at), "d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <Badge className={applicationStatusColors[app.status] || ""}>
                      {applicationStatusLabels[app.status] || app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Jobs */}
        {jobPostings.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune offre disponible</h3>
              <p className="text-muted-foreground">
                Il n'y a actuellement aucune offre d'emploi interne ouverte.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobPostings.map((job) => {
              const applied = hasApplied(job.id);
              const appStatus = getApplicationStatus(job.id);

              return (
                <Card key={job.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    {job.unit && (
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.unit.name}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
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
                    {applied ? (
                      <Badge className={`w-full justify-center py-2 ${applicationStatusColors[appStatus || "pending"]}`}>
                        <Clock className="h-4 w-4 mr-2" />
                        {applicationStatusLabels[appStatus || "pending"]}
                      </Badge>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => openApplyDialog(job)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Postuler
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Apply Dialog */}
        <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Postuler - {selectedJob?.title}</DialogTitle>
            </DialogHeader>
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
              <div className="space-y-2">
                <Label htmlFor="coverLetter">Lettre de motivation (optionnel)</Label>
                <Textarea
                  id="coverLetter"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Expliquez pourquoi vous êtes intéressé par ce poste..."
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleApply} disabled={submitting}>
                {submitting ? "Envoi..." : "Soumettre ma candidature"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default InternalJobs;
