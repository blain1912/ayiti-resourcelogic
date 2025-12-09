import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle, XCircle, Clock, Settings } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  type: string;
  approval_status: string;
  subscription_tier: string;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  max_users: number;
  max_units: number;
  created_at: string;
}

const OrganizationApprovals = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<"free" | "pro" | "enterprise">("free");
  const [monthsPaid, setMonthsPaid] = useState<number>(1);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();

  useEffect(() => {
    checkAccessAndLoadOrganizations();
  }, []);

  const checkAccessAndLoadOrganizations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is super admin
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!role) {
        toast({
          variant: "destructive",
          title: language === "fr" ? "Accès refusé" : "Access Denied",
          description: language === "fr" 
            ? "Vous devez être super administrateur" 
            : "You must be a super administrator",
        });
        navigate("/");
        return;
      }

      setIsSuperAdmin(true);
      await loadOrganizations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
      });
    }
  };

  const copyDefaultSalaryScale = async (newOrgId: string) => {
    try {
      // Définir les catégories par défaut avec leurs postes
      const defaultCategories = [
        {
          name: "Personnel de Décision",
          positions: [
            { name: "Directeur Général", salary: 150000 },
            { name: "Directeur Général Adjoint", salary: 125000 },
            { name: "Directeur", salary: 100000 },
            { name: "Directeur Adjoint", salary: 85000 },
          ]
        },
        {
          name: "Personnel d'encadrement",
          positions: [
            { name: "Chef de Service", salary: 75000 },
            { name: "Chef de Service Adjoint", salary: 65000 },
            { name: "Responsable de Section", salary: 55000 },
          ]
        },
        {
          name: "Personnel professionnel diplômé ou certifié",
          positions: [
            { name: "Analyste Principal", salary: 65000 },
            { name: "Analyste", salary: 55000 },
            { name: "Technicien Principal", salary: 50000 },
            { name: "Technicien", salary: 45000 },
            { name: "Comptable", salary: 50000 },
            { name: "Informaticien", salary: 55000 },
          ]
        },
        {
          name: "Personnel administratif",
          positions: [
            { name: "Assistant Administratif Principal", salary: 40000 },
            { name: "Assistant Administratif", salary: 35000 },
            { name: "Secrétaire", salary: 30000 },
            { name: "Réceptionniste", salary: 25000 },
            { name: "Archiviste", salary: 30000 },
          ]
        },
        {
          name: "Personnel de soutien",
          positions: [
            { name: "Chauffeur", salary: 25000 },
            { name: "Agent de Sécurité", salary: 22000 },
            { name: "Agent d'Entretien", salary: 20000 },
            { name: "Plombier", salary: 25000 },
            { name: "Électricien", salary: 25000 },
            { name: "Jardinier", salary: 20000 },
          ]
        },
      ];

      // Créer les catégories et postes pour la nouvelle organisation
      for (const category of defaultCategories) {
        const { data: newCategory, error: categoryError } = await supabase
          .from("employee_categories")
          .insert({ name: category.name, organization_id: newOrgId })
          .select()
          .single();

        if (categoryError) {
          console.error("Error creating category:", categoryError);
          continue;
        }

        // Créer les postes pour cette catégorie
        const positionsToInsert = category.positions.map(pos => ({
          name: pos.name,
          salary: pos.salary,
          category_id: newCategory.id,
          organization_id: newOrgId,
        }));

        const { error: positionsError } = await supabase
          .from("positions")
          .insert(positionsToInsert);

        if (positionsError) {
          console.error("Error creating positions:", positionsError);
        }
      }

      console.log("Default salary scale copied for organization:", newOrgId);
    } catch (error) {
      console.error("Error copying salary scale:", error);
    }
  };

  const handleApproval = async (orgId: string, status: "approved" | "rejected") => {
    try {
      // Récupérer l'organisation et l'admin
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .single();

      // Récupérer l'admin de l'organisation (premier user_role créé pour cette org)
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("organization_id", orgId)
        .eq("role", "admin")
        .limit(1)
        .single();

      let adminEmail = null;
      let adminName = "Administrateur";

      if (adminRole) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", adminRole.user_id)
          .single();
        
        if (profile) {
          adminEmail = profile.email;
          adminName = profile.full_name || adminName;
        }
      }

      const updateData: any = { approval_status: status };
      
      // Si approuvé, définir la date de début d'abonnement
      if (status === "approved") {
        updateData.subscription_started_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", orgId);

      if (error) throw error;

      // Si approuvé, copier la grille salariale par défaut
      if (status === "approved") {
        await copyDefaultSalaryScale(orgId);
      }

      // Envoyer un email de notification à l'admin
      if (adminEmail && org) {
        try {
          await supabase.functions.invoke("send-approval-notification", {
            body: {
              type: status === "approved" ? "org_approved" : "org_rejected",
              recipientEmail: adminEmail,
              recipientName: adminName,
              organizationName: org.name,
            },
          });
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          // Ne pas bloquer le processus si l'email échoue
        }
      }

      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: status === "approved"
          ? (language === "fr" ? "Organisation approuvée avec grille salariale" : "Organization approved with salary scale")
          : (language === "fr" ? "Organisation rejetée" : "Organization rejected"),
      });

      loadOrganizations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
      });
    }
  };

  const handleSubscriptionUpdate = async () => {
    if (!selectedOrg) return;

    try {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + monthsPaid);

      // Determine limits based on tier
      let maxUsers = 5;
      let maxUnits = 3;
      
      if (subscriptionTier === "pro") {
        maxUsers = 50;
        maxUnits = 10;
      } else if (subscriptionTier === "enterprise") {
        maxUsers = 1000;
        maxUnits = 50;
      }

      const { error } = await supabase
        .from("organizations")
        .update({
          subscription_tier: subscriptionTier,
          subscription_started_at: now.toISOString(),
          subscription_expires_at: expiresAt.toISOString(),
          max_users: maxUsers,
          max_units: maxUnits,
        })
        .eq("id", selectedOrg.id);

      if (error) throw error;

      // Add to subscription history
      const { data: userData } = await supabase.auth.getUser();
      await supabase
        .from("subscription_history")
        .insert([{
          organization_id: selectedOrg.id,
          old_tier: selectedOrg.subscription_tier as "free" | "pro" | "enterprise",
          new_tier: subscriptionTier,
          changed_by: userData.user?.id,
          reason: `Abonnement ${subscriptionTier} pour ${monthsPaid} mois`,
        }]);

      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: language === "fr" 
          ? "Abonnement mis à jour" 
          : "Subscription updated",
      });

      setSelectedOrg(null);
      loadOrganizations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Approuvée</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejetée</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    const colors = {
      free: "bg-gray-500",
      pro: "bg-blue-500",
      enterprise: "bg-purple-500",
    };
    return <Badge className={colors[tier as keyof typeof colors]}>{tier.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>{language === "fr" ? "Chargement..." : "Loading..."}</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  const pendingCount = organizations.filter(o => o.approval_status === "pending").length;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {language === "fr" ? "Gestion des Organisations" : "Organization Management"}
          </CardTitle>
          <CardDescription>
            {language === "fr" 
              ? `${pendingCount} organisation(s) en attente d'approbation` 
              : `${pendingCount} organization(s) pending approval`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === "fr" ? "Nom" : "Name"}</TableHead>
                <TableHead>{language === "fr" ? "Type" : "Type"}</TableHead>
                <TableHead>{language === "fr" ? "Statut" : "Status"}</TableHead>
                <TableHead>{language === "fr" ? "Abonnement" : "Subscription"}</TableHead>
                <TableHead>{language === "fr" ? "Expire" : "Expires"}</TableHead>
                <TableHead>{language === "fr" ? "Date création" : "Created"}</TableHead>
                <TableHead className="text-right">{language === "fr" ? "Actions" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{org.type}</TableCell>
                  <TableCell>{getStatusBadge(org.approval_status)}</TableCell>
                  <TableCell>{getTierBadge(org.subscription_tier)}</TableCell>
                  <TableCell>
                    {org.subscription_expires_at 
                      ? new Date(org.subscription_expires_at).toLocaleDateString("fr-FR")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {new Date(org.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {org.approval_status === "pending" && (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="default">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approuver
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approuver l'organisation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir approuver "{org.name}" ?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleApproval(org.id, "approved")}>
                                  Confirmer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeter
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Rejeter l'organisation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir rejeter "{org.name}" ?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleApproval(org.id, "rejected")}>
                                  Confirmer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      
                      {org.approval_status === "approved" && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedOrg(org);
                                setSubscriptionTier(org.subscription_tier as "free" | "pro" | "enterprise");
                                setMonthsPaid(1);
                              }}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Abonnement
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Gérer l'abonnement - {org.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Type d'abonnement</Label>
                                <Select 
                                  value={subscriptionTier} 
                                  onValueChange={(value) => setSubscriptionTier(value as "free" | "pro" | "enterprise")}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free">Free (5 users, 3 units)</SelectItem>
                                    <SelectItem value="pro">Pro (50 users, 10 units)</SelectItem>
                                    <SelectItem value="enterprise">Enterprise (1000 users, 50 units)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Nombre de mois</Label>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  max="24"
                                  value={monthsPaid}
                                  onChange={(e) => setMonthsPaid(parseInt(e.target.value) || 1)}
                                />
                              </div>

                              <Button onClick={handleSubscriptionUpdate} className="w-full">
                                Mettre à jour
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationApprovals;