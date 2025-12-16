import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Briefcase, Users, Eye, Edit, Trash2, UserPlus, FileText, Download, Phone, Mail, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type JobPosting = {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  recruitment_type: "internal" | "external";
  status: "draft" | "open" | "closed" | "filled";
  salary_min: number | null;
  salary_max: number | null;
  number_of_positions: number;
  deadline: string | null;
  created_at: string;
  unit?: { name: string } | null;
  position?: { name: string } | null;
  applications_count?: number;
};

type JobApplication = {
  id: string;
  job_posting_id: string;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  applicant_cv_url: string | null;
  cover_letter: string | null;
  status: string;
  created_at: string;
  profile?: { full_name: string; email: string; tel_1?: string } | null;
  job_posting?: { title: string; recruitment_type: string } | null;
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  filled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
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

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  closed: "Fermé",
  filled: "Pourvu",
};

const applicationStatusLabels: Record<string, string> = {
  pending: "En attente",
  reviewing: "En cours d'examen",
  shortlisted: "Présélectionné",
  interview: "Entretien",
  offered: "Offre envoyée",
  accepted: "Accepté",
  rejected: "Rejeté",
};

const Recruitment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization, loading: orgLoading } = useOrganization();
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPosting, setSelectedPosting] = useState<JobPosting | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAppDetailDialogOpen, setIsAppDetailDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    recruitment_type: "external" as "internal" | "external",
    status: "draft" as "draft" | "open" | "closed" | "filled",
    salary_min: "",
    salary_max: "",
    number_of_positions: "1",
    deadline: "",
    unit_id: "",
    position_id: "",
  });

  useEffect(() => {
    if (organization?.id) {
      fetchData();
    }
  }, [organization?.id]);

  const fetchData = async () => {
    if (!organization?.id) return;
    setLoading(true);
    
    try {
      // Fetch job postings with application counts
      const { data: postingsData, error: postingsError } = await supabase
        .from("job_postings")
        .select(`
          *,
          unit:organizational_units(name),
          position:positions(name)
        `)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (postingsError) throw postingsError;

      // Fetch application counts for each posting
      const postingsWithCounts = await Promise.all(
        (postingsData || []).map(async (posting) => {
          const { count } = await supabase
            .from("job_applications")
            .select("*", { count: "exact", head: true })
            .eq("job_posting_id", posting.id);
          return { ...posting, applications_count: count || 0 };
        })
      );

      setJobPostings(postingsWithCounts);

      // Fetch all applications
      const { data: appsData, error: appsError } = await supabase
        .from("job_applications")
        .select(`
          *,
          profile:profiles(full_name, email, tel_1),
          job_posting:job_postings(title, recruitment_type)
        `)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (appsError) throw appsError;
      setApplications(appsData || []);

      // Fetch units
      const { data: unitsData } = await supabase
        .from("organizational_units")
        .select("id, name")
        .eq("organization_id", organization.id)
        .order("name");
      setUnits(unitsData || []);

      // Fetch positions
      const { data: positionsData } = await supabase
        .from("positions")
        .select("id, name")
        .eq("organization_id", organization.id)
        .order("name");
      setPositions(positionsData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePosting = async () => {
    if (!organization?.id || !user?.id) return;
    
    if (!formData.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    try {
      const { error } = await supabase.from("job_postings").insert({
        organization_id: organization.id,
        title: formData.title,
        description: formData.description || null,
        requirements: formData.requirements || null,
        recruitment_type: formData.recruitment_type,
        status: formData.status,
        salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
        number_of_positions: parseInt(formData.number_of_positions) || 1,
        deadline: formData.deadline || null,
        unit_id: formData.unit_id || null,
        position_id: formData.position_id || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Offre d'emploi créée avec succès");
      setIsCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error creating job posting:", error);
      toast.error("Erreur lors de la création de l'offre");
    }
  };

  const handleUpdateStatus = async (postingId: string, newStatus: "draft" | "open" | "closed" | "filled") => {
    try {
      const { error } = await supabase
        .from("job_postings")
        .update({ status: newStatus })
        .eq("id", postingId);

      if (error) throw error;

      toast.success("Statut mis à jour");
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: "pending" | "reviewing" | "shortlisted" | "interview" | "offered" | "accepted" | "rejected") => {
    try {
      const { error } = await supabase
        .from("job_applications")
        .update({ 
          status: newStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", applicationId);

      if (error) throw error;

      toast.success("Statut de candidature mis à jour");
      fetchData();
    } catch (error) {
      console.error("Error updating application status:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeletePosting = async (postingId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette offre?")) return;

    try {
      const { error } = await supabase
        .from("job_postings")
        .delete()
        .eq("id", postingId);

      if (error) throw error;

      toast.success("Offre supprimée");
      fetchData();
    } catch (error) {
      console.error("Error deleting posting:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      requirements: "",
      recruitment_type: "external",
      status: "draft",
      salary_min: "",
      salary_max: "",
      number_of_positions: "1",
      deadline: "",
      unit_id: "",
      position_id: "",
    });
  };

  const viewPostingApplications = (posting: JobPosting) => {
    setSelectedPosting(posting);
    setIsViewDialogOpen(true);
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

  const postingApplications = selectedPosting 
    ? applications.filter(app => app.job_posting_id === selectedPosting.id)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gestion des Recrutements</h1>
            <p className="text-muted-foreground">Gérez les offres d'emploi et les candidatures</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle offre
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer une offre d'emploi</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre du poste *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Développeur Web"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recruitment_type">Type de recrutement</Label>
                    <Select
                      value={formData.recruitment_type}
                      onValueChange={(value: "internal" | "external") => 
                        setFormData({ ...formData, recruitment_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Interne</SelectItem>
                        <SelectItem value="external">Externe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez le poste..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Exigences</Label>
                  <Textarea
                    id="requirements"
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    placeholder="Compétences requises, expérience..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unité organisationnelle</Label>
                    <Select
                      value={formData.unit_id}
                      onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Poste</Label>
                    <Select
                      value={formData.position_id}
                      onValueChange={(value) => setFormData({ ...formData, position_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((pos) => (
                          <SelectItem key={pos.id} value={pos.id}>
                            {pos.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salary_min">Salaire min</Label>
                    <Input
                      id="salary_min"
                      type="number"
                      value={formData.salary_min}
                      onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary_max">Salaire max</Label>
                    <Input
                      id="salary_max"
                      type="number"
                      value={formData.salary_max}
                      onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="positions">Nombre de postes</Label>
                    <Input
                      id="positions"
                      type="number"
                      min="1"
                      value={formData.number_of_positions}
                      onChange={(e) => setFormData({ ...formData, number_of_positions: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Date limite</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Statut</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "draft" | "open" | "closed" | "filled") => 
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Brouillon</SelectItem>
                        <SelectItem value="open">Ouvert</SelectItem>
                        <SelectItem value="closed">Fermé</SelectItem>
                        <SelectItem value="filled">Pourvu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreatePosting}>
                    Créer l'offre
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Offres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{jobPostings.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Offres Ouvertes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">
                  {jobPostings.filter(p => p.status === "open").length}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Candidatures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{applications.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">
                  {applications.filter(a => a.status === "pending").length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="postings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="postings">Offres d'emploi</TabsTrigger>
            <TabsTrigger value="applications">Candidatures</TabsTrigger>
          </TabsList>

          <TabsContent value="postings">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Candidatures</TableHead>
                        <TableHead>Date limite</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobPostings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Aucune offre d'emploi
                          </TableCell>
                        </TableRow>
                      ) : (
                        jobPostings.map((posting) => (
                          <TableRow key={posting.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{posting.title}</p>
                                {posting.unit?.name && (
                                  <p className="text-sm text-muted-foreground">{posting.unit.name}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {posting.recruitment_type === "internal" ? "Interne" : "Externe"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={posting.status}
                                onValueChange={(value: "draft" | "open" | "closed" | "filled") => handleUpdateStatus(posting.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <Badge className={statusColors[posting.status]}>
                                    {statusLabels[posting.status]}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Brouillon</SelectItem>
                                  <SelectItem value="open">Ouvert</SelectItem>
                                  <SelectItem value="closed">Fermé</SelectItem>
                                  <SelectItem value="filled">Pourvu</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {posting.applications_count || 0}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {posting.deadline 
                                ? format(new Date(posting.deadline), "dd MMM yyyy", { locale: fr })
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => viewPostingApplications(posting)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeletePosting(posting.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidat</TableHead>
                        <TableHead>Poste</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>CV</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Aucune candidature
                          </TableCell>
                        </TableRow>
                      ) : (
                        applications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {app.profile?.full_name || app.applicant_name || "N/A"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {app.profile?.email || app.applicant_email || ""}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{app.job_posting?.title || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {app.job_posting?.recruitment_type === "internal" ? "Interne" : "Externe"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {app.applicant_cv_url ? (
                                <a
                                  href={app.applicant_cv_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <FileText className="h-4 w-4" />
                                  <span className="text-sm">Voir CV</span>
                                </a>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {format(new Date(app.created_at), "dd MMM yyyy", { locale: fr })}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={app.status}
                                onValueChange={(value: "pending" | "reviewing" | "shortlisted" | "interview" | "offered" | "accepted" | "rejected") => handleUpdateApplicationStatus(app.id, value)}
                              >
                                <SelectTrigger className="w-40">
                                  <Badge className={applicationStatusColors[app.status]}>
                                    {applicationStatusLabels[app.status] || app.status}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">En attente</SelectItem>
                                  <SelectItem value="reviewing">En cours d'examen</SelectItem>
                                  <SelectItem value="shortlisted">Présélectionné</SelectItem>
                                  <SelectItem value="interview">Entretien</SelectItem>
                                  <SelectItem value="offered">Offre envoyée</SelectItem>
                                  <SelectItem value="accepted">Accepté</SelectItem>
                                  <SelectItem value="rejected">Rejeté</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSelectedApplication(app);
                                  setIsAppDetailDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Applications Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Candidatures pour: {selectedPosting?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPosting && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Description:</p>
                  <p>{selectedPosting.description || "Aucune description"}</p>
                </div>
              )}
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidat</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postingApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                        Aucune candidature pour cette offre
                      </TableCell>
                    </TableRow>
                  ) : (
                    postingApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          {app.profile?.full_name || app.applicant_name || "N/A"}
                        </TableCell>
                        <TableCell>
                          {app.profile?.email || app.applicant_email || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge className={applicationStatusColors[app.status]}>
                            {applicationStatusLabels[app.status] || app.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        {/* Application Detail Dialog */}
        <Dialog open={isAppDetailDialogOpen} onOpenChange={setIsAppDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Détails de la candidature
                {selectedApplication && (
                  <Badge variant="outline" className="ml-2">
                    {selectedApplication.job_posting?.recruitment_type === "internal" ? "Interne" : "Externe"}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-6">
                {/* Candidate Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">INFORMATIONS DU CANDIDAT</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {selectedApplication.profile?.full_name || selectedApplication.applicant_name || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`mailto:${selectedApplication.profile?.email || selectedApplication.applicant_email}`}
                          className="text-primary hover:underline"
                        >
                          {selectedApplication.profile?.email || selectedApplication.applicant_email || "N/A"}
                        </a>
                      </div>
                      {(selectedApplication.profile?.tel_1 || selectedApplication.applicant_phone) && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedApplication.profile?.tel_1 || selectedApplication.applicant_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">POSTE</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedApplication.job_posting?.title || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Soumis le {format(new Date(selectedApplication.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                        </span>
                      </div>
                      <Badge className={applicationStatusColors[selectedApplication.status]}>
                        {applicationStatusLabels[selectedApplication.status] || selectedApplication.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* CV */}
                {selectedApplication.applicant_cv_url && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">CURRICULUM VITAE</h4>
                    <a
                      href={selectedApplication.applicant_cv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      <FileText className="h-5 w-5" />
                      <span>Télécharger le CV</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}

                {/* Cover Letter */}
                {selectedApplication.cover_letter && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">LETTRE DE MOTIVATION</h4>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedApplication.cover_letter}</p>
                    </div>
                  </div>
                )}

                {/* Status Update */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">MODIFIER LE STATUT</h4>
                  <Select
                    value={selectedApplication.status}
                    onValueChange={(value: "pending" | "reviewing" | "shortlisted" | "interview" | "offered" | "accepted" | "rejected") => {
                      handleUpdateApplicationStatus(selectedApplication.id, value);
                      setSelectedApplication({ ...selectedApplication, status: value });
                    }}
                  >
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="reviewing">En cours d'examen</SelectItem>
                      <SelectItem value="shortlisted">Présélectionné</SelectItem>
                      <SelectItem value="interview">Entretien</SelectItem>
                      <SelectItem value="offered">Offre envoyée</SelectItem>
                      <SelectItem value="accepted">Accepté</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Recruitment;
