import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { EmployeeBadge } from "@/components/employees/EmployeeBadge";
import { EmployeeDocuments } from "@/components/employees/EmployeeDocuments";
import { EmployeeSchedule } from "@/components/employees/EmployeeSchedule";
import { ProfileTextGenerator } from "@/components/employees/ProfileTextGenerator";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Clock, Download, CreditCard, Printer, FileText, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProfessorGrades } from "@/hooks/useProfessorGrades";
import { QRCodeSVG } from "qrcode.react";
import { useOrganization } from "@/hooks/useOrganization";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmployeeProfile() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [units, setUnits] = useState<Array<{ id: string; name: string; type?: string; parent_id?: string | null }>>([]);
  const [positions, setPositions] = useState<Array<{ id: string; name: string; salary: number }>>([]);
  const { grades: professorGrades } = useProfessorGrades(profile?.organization_id);
  const { organization } = useOrganization();
  const [isOwner, setIsOwner] = useState(false);
  const [isHR, setIsHR] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [employeeId]);

  // Ouvre automatiquement le formulaire si le profil n'est pas complété (seulement si c'est le sien)
  useEffect(() => {
    if (isOwner && profile && profile.approval_status === "approved" && !profile.profile_completed) {
      setShowForm(true);
    }
  }, [profile, isOwner]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let profileData;

      if (employeeId) {
        // Viewing another employee's profile (RH accessing employee)
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", employeeId)
          .maybeSingle();

        if (error) throw error;
        profileData = data;
        setIsOwner(data?.user_id === user.id);

        // Check if current user is HR for this employee's organization
        if (data?.organization_id) {
          const { data: hasAdmin } = await supabase.rpc('has_admin_role', {
            _user_id: user.id,
            _organization_id: data.organization_id
          });
          setIsHR(!!hasAdmin);
        }
      } else {
        // Viewing own profile
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          const { data: inserted, error: insertError } = await supabase
            .from("profiles")
            .insert({ user_id: user.id, email: user.email })
            .select("*")
            .single();
          if (insertError) throw insertError;
          profileData = inserted;
        } else {
          profileData = data;
        }
        setIsOwner(true);
      }

      setProfile(profileData);

      if (profileData?.organization_id) {
        await Promise.all([
          fetchUnits(profileData.organization_id),
          fetchPositions(profileData.organization_id)
        ]);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async (orgId: string) => {
    const { data } = await supabase
      .from("organizational_units")
      .select("id, name, type, parent_id")
      .eq("organization_id", orgId)
      .order("name");
    setUnits(data || []);
  };

  const fetchPositions = async (orgId: string) => {
    const { data } = await supabase
      .from("positions")
      .select("id, name, salary")
      .eq("organization_id", orgId)
      .order("name");
    setPositions(data || []);
  };

  const handleSubmit = async (formData: any) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...formData,
          date_naissance: formData.date_naissance instanceof Date 
            ? formData.date_naissance.toISOString().split('T')[0]
            : formData.date_naissance,
          date_entree_fonction: formData.date_entree_fonction instanceof Date 
            ? formData.date_entree_fonction.toISOString().split('T')[0]
            : formData.date_entree_fonction,
          professor_date_entree_fonction: formData.professor_date_entree_fonction instanceof Date 
            ? formData.professor_date_entree_fonction.toISOString().split('T')[0]
            : formData.professor_date_entree_fonction,
          full_name: `${formData.prenom} ${formData.nom}`,
          profile_completed: true,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Votre fiche a été enregistrée avec succès. Redirection...",
      });

      setTimeout(() => {
        if (isOwner) {
          window.location.href = "/";
        } else {
          fetchProfile(); // Refresh profile data for HR
          setShowForm(false);
        }
      }, 1500);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  const getStatusAlert = () => {
    if (profile?.approval_status === "pending") {
      return (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Inscription en attente</AlertTitle>
          <AlertDescription>
            Votre inscription est en attente d'approbation par le service des ressources humaines.
          </AlertDescription>
        </Alert>
      );
    }

    if (profile?.approval_status === "rejected") {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Inscription refusée</AlertTitle>
          <AlertDescription>
            Votre inscription a été refusée. Veuillez contacter le service RH pour plus d'informations.
          </AlertDescription>
        </Alert>
      );
    }

    if (profile?.approval_status === "approved" && !profile?.profile_completed) {
      return (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Inscription approuvée</AlertTitle>
          <AlertDescription>
            Votre inscription a été approuvée. Vous pouvez maintenant compléter votre fiche d'employé.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {isOwner ? "Mon Profil" : `Profil de ${profile?.full_name || "l'employé"}`}
          </h1>
          <p className="text-muted-foreground">
            {isOwner 
              ? "Gérez vos informations personnelles et professionnelles"
              : "Consultez les informations de cet employé"
            }
          </p>
        </div>

        {isOwner && getStatusAlert()}

        {(isOwner || isHR) && profile?.approval_status === "approved" && !profile?.profile_completed && !showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{isOwner ? "Complétez votre fiche d'employé" : "Compléter la fiche de cet employé"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {isOwner 
                  ? "Votre inscription a été approuvée. Veuillez compléter votre fiche d'employé avec toutes vos informations."
                  : "La fiche de cet employé n'est pas encore complétée. Vous pouvez la remplir."
                }
              </p>
              <Button onClick={() => setShowForm(true)}>
                {isOwner ? "Remplir ma fiche" : "Remplir la fiche"}
              </Button>
            </CardContent>
          </Card>
        )}

        {(isOwner || isHR) && showForm && !profile?.profile_completed && (
          <Card>
            <CardHeader>
              <CardTitle>Fiche d'employé</CardTitle>
            </CardHeader>
            <CardContent>
              <EmployeeForm
                onSubmit={handleSubmit}
                units={units}
                positions={positions}
                professorGrades={professorGrades}
                defaultValues={{
                  code_budgetaire: profile?.code_budgetaire || "",
                  photo_url: profile?.photo_url || "",
                  nom: profile?.nom || "",
                  prenom: profile?.prenom || "",
                  date_naissance: profile?.date_naissance ? new Date(profile.date_naissance) : undefined,
                  lieu_naissance: profile?.lieu_naissance || "",
                  sexe: (profile?.sexe ?? undefined) as "M" | "F" | undefined,
                  nationalite: profile?.nationalite || "Haïtienne",
                  etat_civil: profile?.etat_civil ?? undefined,
                  groupe_sanguin: profile?.groupe_sanguin ?? undefined,
                  religion: profile?.religion ?? undefined,
                  nif: profile?.nif || "",
                  cin: profile?.cin || "",
                  adresse_rue: profile?.adresse_rue || "",
                  adresse_ville: profile?.adresse_ville || "",
                  adresse_departement: profile?.adresse_departement ?? undefined,
                  code_postal: profile?.code_postal || "",
                  tel_1: profile?.tel_1 || "",
                  tel_2: profile?.tel_2 || "",
                  whatsapp: profile?.whatsapp || "",
                  email: profile?.email || "",
                  contact_urgence_nom: profile?.contact_urgence_nom || "",
                  contact_urgence_prenom: profile?.contact_urgence_prenom || "",
                  contact_urgence_lien: profile?.contact_urgence_lien || "",
                  contact_urgence_tel: profile?.contact_urgence_tel || "",
                  contact_urgence_whatsapp: profile?.contact_urgence_whatsapp || "",
                  date_entree_fonction: profile?.date_entree_fonction ? new Date(profile.date_entree_fonction) : undefined,
                  unit_id: profile?.unit_id || "",
                  employee_category: profile?.employee_category ?? undefined,
                  position_id: profile?.position_id || "",
                  employment_type: profile?.employment_type ?? "permanent",
                  employee_status: profile?.employee_status ?? "actif",
                  professor_grade: profile?.professor_grade ?? undefined,
                  professor_date_entree_fonction: profile?.professor_date_entree_fonction ? new Date(profile.professor_date_entree_fonction) : undefined,
                  niveau_etudes: profile?.niveau_etudes ?? undefined,
                }}
              />
            </CardContent>
          </Card>
        )}

        {(profile?.profile_completed || !isOwner) && (
          <Tabs defaultValue="info" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="info">Informations</TabsTrigger>
              <TabsTrigger value="profile-text">
                <Sparkles className="h-4 w-4 mr-2" />
                Profil
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <Clock className="h-4 w-4 mr-2" />
                Horaires
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="badge">
                <CreditCard className="h-4 w-4 mr-2" />
                Badge
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              {showForm && profile?.profile_completed ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Modifier la fiche d'employé</CardTitle>
                    <Button variant="outline" onClick={() => setShowForm(false)}>
                      Annuler
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <EmployeeForm
                      onSubmit={handleSubmit}
                      units={units}
                      positions={positions}
                      professorGrades={professorGrades}
                      defaultValues={{
                        code_budgetaire: profile?.code_budgetaire || "",
                        photo_url: profile?.photo_url || "",
                        nom: profile?.nom || "",
                        prenom: profile?.prenom || "",
                        date_naissance: profile?.date_naissance ? new Date(profile.date_naissance) : undefined,
                        lieu_naissance: profile?.lieu_naissance || "",
                        sexe: (profile?.sexe ?? undefined) as "M" | "F" | undefined,
                        nationalite: profile?.nationalite || "Haïtienne",
                        etat_civil: profile?.etat_civil ?? undefined,
                        groupe_sanguin: profile?.groupe_sanguin ?? undefined,
                        religion: profile?.religion ?? undefined,
                        nif: profile?.nif || "",
                        cin: profile?.cin || "",
                        adresse_rue: profile?.adresse_rue || "",
                        adresse_ville: profile?.adresse_ville || "",
                        adresse_departement: profile?.adresse_departement ?? undefined,
                        code_postal: profile?.code_postal || "",
                        tel_1: profile?.tel_1 || "",
                        tel_2: profile?.tel_2 || "",
                        whatsapp: profile?.whatsapp || "",
                        email: profile?.email || "",
                        contact_urgence_nom: profile?.contact_urgence_nom || "",
                        contact_urgence_prenom: profile?.contact_urgence_prenom || "",
                        contact_urgence_lien: profile?.contact_urgence_lien || "",
                        contact_urgence_tel: profile?.contact_urgence_tel || "",
                        contact_urgence_whatsapp: profile?.contact_urgence_whatsapp || "",
                        date_entree_fonction: profile?.date_entree_fonction ? new Date(profile.date_entree_fonction) : undefined,
                        unit_id: profile?.unit_id || "",
                        employee_category: profile?.employee_category ?? undefined,
                        position_id: profile?.position_id || "",
                        employment_type: profile?.employment_type ?? "permanent",
                        employee_status: profile?.employee_status ?? "actif",
                      professor_grade: profile?.professor_grade ?? undefined,
                      professor_date_entree_fonction: profile?.professor_date_entree_fonction ? new Date(profile.professor_date_entree_fonction) : undefined,
                      niveau_etudes: profile?.niveau_etudes ?? undefined,
                    }}
                    />
                  </CardContent>
                </Card>
              ) : (
              <>
              <div className="flex gap-2 mb-4 print:hidden">
                <Button onClick={() => window.print()} variant="outline" className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimer la fiche
                </Button>
                <Button 
                  onClick={() => {
                    import('@/lib/exportPdf').then(({ exportToPdf }) => {
                      exportToPdf('employee-info-card', `fiche-employe-${profile.code_budgetaire || profile.id}`);
                    });
                  }}
                  variant="outline" 
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter en PDF
                </Button>
              </div>

              <div id="employee-info-card" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Informations personnelles</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Nom complet</p>
                          <p className="text-lg">{profile.full_name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p className="text-lg">{profile.email || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                          <p className="text-lg">{profile.tel_1 || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Téléphone 2</p>
                          <p className="text-lg">{profile.tel_2 || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
                          <p className="text-lg">{profile.whatsapp || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Date de naissance</p>
                          <p className="text-lg">{profile.date_naissance || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Lieu de naissance</p>
                          <p className="text-lg">{profile.lieu_naissance || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Sexe</p>
                          <p className="text-lg">{profile.sexe === 'M' ? 'Masculin' : profile.sexe === 'F' ? 'Féminin' : 'Non renseigné'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Nationalité</p>
                          <p className="text-lg">{profile.nationalite || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">État civil</p>
                          <p className="text-lg">{profile.etat_civil || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Groupe sanguin</p>
                          <p className="text-lg">{profile.groupe_sanguin || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Religion</p>
                          <p className="text-lg">{profile.religion || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">NIF</p>
                          <p className="text-lg">{profile.nif || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">CIN</p>
                          <p className="text-lg">{profile.cin || "Non renseigné"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Photo & QR Code</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 flex flex-col items-center">
                        {profile.photo_url && (
                          <img src={profile.photo_url} alt="Photo" className="w-32 h-40 object-cover rounded-lg border" crossOrigin="anonymous" />
                        )}
                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg">
                          <QRCodeSVG
                            value={JSON.stringify({
                              id: profile.id,
                              nom: profile.nom,
                              prenom: profile.prenom,
                              code_budgetaire: profile.code_budgetaire,
                              email: profile.email,
                              organization_id: profile.organization_id
                            })}
                            size={150}
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Adresse */}
                <Card>
                  <CardHeader>
                    <CardTitle>Adresse</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Rue</p>
                        <p>{profile.adresse_rue || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Ville</p>
                        <p>{profile.adresse_ville || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Département</p>
                        <p>{profile.adresse_departement || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Code postal</p>
                        <p>{profile.code_postal || "Non renseigné"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Informations professionnelles - Poste principal */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informations professionnelles — Poste principal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Code budgétaire</p>
                        <p className="text-lg font-semibold">{profile.code_budgetaire || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Poste / Fonction</p>
                        <p className="text-lg">{positions.find(p => p.id === profile.position_id)?.name || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Salaire (HTG)</p>
                        <p className="text-lg">{positions.find(p => p.id === profile.position_id)?.salary?.toLocaleString('fr-HT') || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Direction / Unité</p>
                        <p>{units.find(u => u.id === profile.unit_id)?.name || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Type d'emploi</p>
                        <p>{profile.employment_type || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Statut</p>
                        <p>{profile.employee_status || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Date d'entrée en fonction</p>
                        <p>{profile.date_entree_fonction || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Catégorie</p>
                        <p>{profile.employee_category || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Niveau d'études</p>
                        <p>{profile.niveau_etudes || "Non renseigné"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Poste professeur en cumul */}
                {(profile.professor_grade || profile.professor_code_budgetaire || profile.professor_salary) && (
                  <Card className="border-accent/30 bg-accent/5">
                    <CardHeader>
                      <CardTitle>Poste cumulé — Professeur</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Grade professeur</p>
                          <p className="text-lg font-semibold">{profile.professor_grade}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Code budgétaire (professeur)</p>
                          <p className="text-lg font-semibold">{profile.professor_code_budgetaire || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Salaire professeur (HTG)</p>
                          <p className="text-lg">{profile.professor_salary?.toLocaleString('fr-HT') || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Date d'entrée en fonction (poste cumulé)</p>
                          <p className="text-lg">{profile.professor_date_entree_fonction ? new Date(profile.professor_date_entree_fonction).toLocaleDateString('fr-FR') : "Non renseigné"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Contact d'urgence */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact d'urgence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Nom</p>
                        <p>{profile.contact_urgence_nom || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Prénom</p>
                        <p>{profile.contact_urgence_prenom || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Lien</p>
                        <p>{profile.contact_urgence_lien || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                        <p>{profile.contact_urgence_tel || "Non renseigné"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
                        <p>{profile.contact_urgence_whatsapp || "Non renseigné"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {(isOwner || isHR) && (
                  <div className="print:hidden">
                    <Button variant="outline" onClick={() => setShowForm(true)}>
                      {isOwner ? "Modifier mes informations" : "Modifier les informations"}
                    </Button>
                  </div>
                )}
              </div>
              </>
              )}
            </TabsContent>

            <TabsContent value="profile-text">
              <ProfileTextGenerator
                profile={profile}
                organizationName={organization?.name}
                positionName={positions.find(p => p.id === profile.position_id)?.name}
                unitName={units.find(u => u.id === profile.unit_id)?.name}
              />
            </TabsContent>

            <TabsContent value="schedule">
              <EmployeeSchedule profileId={profile.id} />
            </TabsContent>

            <TabsContent value="documents">
              <EmployeeDocuments
                profileId={profile.id}
                organizationId={profile.organization_id}
                userId={profile.user_id}
                isOwner={isOwner || isHR}
              />
            </TabsContent>

            <TabsContent value="badge">
              <EmployeeBadge 
                profile={profile} 
                organization={organization}
                positionName={positions.find(p => p.id === profile.position_id)?.name}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
