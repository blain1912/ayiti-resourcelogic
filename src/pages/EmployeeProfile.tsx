import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { EmployeeBadge } from "@/components/employees/EmployeeBadge";
import { EmployeeDocuments } from "@/components/employees/EmployeeDocuments";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Clock, Download, CreditCard, Printer, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProfessorGrades } from "@/hooks/useProfessorGrades";
import { QRCodeSVG } from "qrcode.react";
import { useOrganization } from "@/hooks/useOrganization";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmployeeProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [units, setUnits] = useState<Array<{ id: string; name: string; type?: string; parent_id?: string | null }>>([]);
  const [positions, setPositions] = useState<Array<{ id: string; name: string; salary: number }>>([]);
  const { grades: professorGrades } = useProfessorGrades(profile?.organization_id);
  const { organization } = useOrganization();

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    // Ouvre automatiquement le formulaire si le profil n'est pas complété
    if (profile && profile.approval_status === "approved" && !profile.profile_completed) {
      setShowForm(true);
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      let currentProfile = profileData;
      if (!currentProfile) {
        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert({ user_id: user.id, email: user.email })
          .select("*")
          .single();
        if (insertError) throw insertError;
        currentProfile = inserted;
      }

      setProfile(currentProfile);

      if (currentProfile?.organization_id) {
        await Promise.all([
          fetchUnits(currentProfile.organization_id),
          fetchPositions(currentProfile.organization_id)
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
          full_name: `${formData.prenom} ${formData.nom}`,
          profile_completed: true,
        })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Votre fiche a été enregistrée avec succès. Redirection...",
      });

      setTimeout(() => {
        window.location.href = "/";
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
          <h1 className="text-3xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">
            Gérez vos informations personnelles et professionnelles
          </p>
        </div>

        {getStatusAlert()}

        {profile?.approval_status === "approved" && !profile?.profile_completed && !showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Complétez votre fiche d'employé</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Votre inscription a été approuvée. Veuillez compléter votre fiche d'employé avec toutes vos informations.
              </p>
              <Button onClick={() => setShowForm(true)}>
                Remplir ma fiche
              </Button>
            </CardContent>
          </Card>
        )}

        {showForm && (
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
                }}
              />
            </CardContent>
          </Card>
        )}

        {profile?.profile_completed && (
          <Tabs defaultValue="info" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informations</TabsTrigger>
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
              <div className="flex gap-2 mb-4 print:hidden">
                <Button onClick={() => window.print()} variant="outline" className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimer la fiche
                </Button>
                <Button 
                  onClick={() => {
                    const element = document.getElementById('employee-info-card');
                    if (!element) return;
                    
                    import('html2canvas').then((html2canvas) => {
                      html2canvas.default(element, {
                        backgroundColor: '#ffffff',
                        scale: 2
                      }).then((canvas) => {
                        const link = document.createElement('a');
                        link.download = `fiche-employe-${profile.code_budgetaire || profile.id}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                      });
                    });
                  }}
                  variant="outline" 
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger la fiche
                </Button>
              </div>

              <div id="employee-info-card" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Informations complètes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Profil complet</AlertTitle>
                        <AlertDescription>
                          Votre fiche d'employé est complète et à jour.
                        </AlertDescription>
                      </Alert>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Nom complet</p>
                          <p className="text-lg">{profile.full_name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Code budgétaire</p>
                          <p className="text-lg">{profile.code_budgetaire || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p className="text-lg">{profile.email || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                          <p className="text-lg">{profile.tel_1 || "Non renseigné"}</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => setShowForm(true)}>
                        Modifier mes informations
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>QR Code Employé</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg">
                        <QRCodeSVG
                          value={JSON.stringify({
                            id: profile.id,
                            nom: profile.nom,
                            prenom: profile.prenom,
                            code_budgetaire: profile.code_budgetaire,
                            email: profile.email,
                            organization_id: profile.organization_id
                          })}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Votre QR code personnel pour l'identification
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          const svg = document.querySelector('svg');
                          if (svg) {
                            const svgData = new XMLSerializer().serializeToString(svg);
                            const canvas = document.createElement("canvas");
                            const ctx = canvas.getContext("2d");
                            const img = new Image();
                            img.onload = () => {
                              canvas.width = img.width;
                              canvas.height = img.height;
                              ctx?.drawImage(img, 0, 0);
                              const pngFile = canvas.toDataURL("image/png");
                              const downloadLink = document.createElement("a");
                              downloadLink.download = `qrcode-${profile.code_budgetaire}.png`;
                              downloadLink.href = pngFile;
                              downloadLink.click();
                            };
                            img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger le QR Code
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <EmployeeDocuments
                profileId={profile.id}
                organizationId={profile.organization_id}
                userId={profile.user_id}
                isOwner={true}
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
