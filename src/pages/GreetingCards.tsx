import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, Gift, Clock, CheckCircle, XCircle } from "lucide-react";

const occasionLabels: Record<string, { label: string; emoji: string }> = {
  anniversaire: { label: "Anniversaire", emoji: "🎂" },
  deces_parent: { label: "Décès d'un parent", emoji: "🕊️" },
  nouvel_an: { label: "Nouvel An", emoji: "🎆" },
  fete_meres: { label: "Fête des Mères", emoji: "💐" },
  fete_peres: { label: "Fête des Pères", emoji: "👔" },
  paques: { label: "Pâques", emoji: "🐣" },
  saint_valentin: { label: "Saint-Valentin", emoji: "❤️" },
  fete_drapeau: { label: "Fête du Drapeau", emoji: "🇭🇹" },
  prompt_retablissement: { label: "Prompt Rétablissement", emoji: "💪" },
  accouchement: { label: "Accouchement", emoji: "👶" },
  mariage: { label: "Mariage", emoji: "💍" },
};

interface Employee {
  id: string;
  full_name: string;
  email: string;
  prenom: string;
  nom: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  prenom: string | null;
  nom: string | null;
}

interface GreetingCardRequest {
  id: string;
  occasion: string;
  status: string;
  custom_message: string | null;
  created_at: string;
  requester: { full_name: string; prenom: string; nom: string } | null;
  recipient: { full_name: string; prenom: string; nom: string; email: string } | null;
}

interface SentCard {
  id: string;
  occasion: string;
  sent_at: string;
  custom_message: string | null;
  recipient: { full_name: string; prenom: string; nom: string } | null;
}

export default function GreetingCards() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRoles, setUserRoles] = useState<{ role: string }[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedOccasion, setSelectedOccasion] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [requests, setRequests] = useState<GreetingCardRequest[]>([]);
  const [sentCards, setSentCards] = useState<SentCard[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfileAndRoles();
    }
  }, [user]);

  useEffect(() => {
    if (organization?.id) {
      fetchEmployees();
      fetchRequests();
      fetchSentCards();
    }
  }, [organization?.id]);

  const fetchProfileAndRoles = async () => {
    if (!user) return;
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, prenom, nom, organization_id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (profileData) {
      setProfile(profileData);
      
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", profileData.organization_id);
      
      if (rolesData) {
        setUserRoles(rolesData);
      }
    }
  };

  const isHR = userRoles?.some(role => 
    ['admin', 'directeur_rh', 'directeur_administratif'].includes(role.role)
  );

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, prenom, nom")
      .eq("organization_id", organization?.id)
      .eq("approval_status", "approved");
    
    if (!error && data) {
      setEmployees(data);
    }
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("greeting_card_requests" as any)
      .select(`
        id, occasion, status, custom_message, created_at,
        requester:requester_id(full_name, prenom, nom),
        recipient:recipient_id(full_name, prenom, nom, email)
      `)
      .eq("organization_id", organization?.id)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setRequests(data as any);
    }
  };

  const fetchSentCards = async () => {
    const { data, error } = await supabase
      .from("greeting_cards_sent" as any)
      .select(`
        id, occasion, sent_at, custom_message,
        recipient:recipient_id(full_name, prenom, nom)
      `)
      .eq("organization_id", organization?.id)
      .order("sent_at", { ascending: false })
      .limit(50);
    
    if (!error && data) {
      setSentCards(data as any);
    }
  };

  const getEmployeeName = (emp: { full_name?: string | null; prenom?: string | null; nom?: string | null } | null) => {
    if (!emp) return "Inconnu";
    if (emp.prenom && emp.nom) return `${emp.prenom} ${emp.nom}`;
    return emp.full_name || "Inconnu";
  };

  const sendGreetingCard = async (recipientId: string, recipientEmail: string, recipientName: string, occasion: string, message?: string) => {
    try {
      const response = await supabase.functions.invoke("send-greeting-card", {
        body: {
          recipientId,
          recipientEmail,
          recipientName,
          occasion,
          customMessage: message,
          organizationName: organization?.name,
          organizationLogo: organization?.logo_url,
          primaryColor: organization?.primary_color,
          secondaryColor: organization?.secondary_color,
          senderName: getEmployeeName(profile),
        },
      });

      if (response.error) throw response.error;

      // Record the sent card
      await supabase.from("greeting_cards_sent" as any).insert({
        organization_id: organization?.id,
        recipient_id: recipientId,
        occasion: occasion,
        sent_by: profile?.id,
        custom_message: message || null,
        sent_via: ["email"],
      });

      return true;
    } catch (error: any) {
      console.error("Error sending card:", error);
      throw error;
    }
  };

  const handleSendCard = async () => {
    if (!selectedEmployee || !selectedOccasion) {
      toast.error("Veuillez sélectionner un employé et une occasion");
      return;
    }

    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee?.email) {
      toast.error("L'employé sélectionné n'a pas d'adresse email");
      return;
    }

    setIsSending(true);
    try {
      await sendGreetingCard(
        employee.id,
        employee.email,
        getEmployeeName(employee),
        selectedOccasion,
        customMessage || undefined
      );

      toast.success("Carte de vœux envoyée avec succès!");
      setDialogOpen(false);
      setSelectedEmployee("");
      setSelectedOccasion("");
      setCustomMessage("");
      fetchSentCards();
    } catch (error) {
      toast.error("Erreur lors de l'envoi de la carte");
    } finally {
      setIsSending(false);
    }
  };

  const handleApproveRequest = async (request: GreetingCardRequest) => {
    if (!request.recipient?.email) {
      toast.error("Le destinataire n'a pas d'adresse email");
      return;
    }

    try {
      await sendGreetingCard(
        request.id,
        request.recipient.email,
        getEmployeeName(request.recipient),
        request.occasion,
        request.custom_message || undefined
      );

      await supabase
        .from("greeting_card_requests" as any)
        .update({
          status: "sent",
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      toast.success("Carte approuvée et envoyée!");
      fetchRequests();
      fetchSentCards();
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await supabase
        .from("greeting_card_requests" as any)
        .update({
          status: "rejected",
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      toast.success("Demande rejetée");
      fetchRequests();
    } catch (error) {
      toast.error("Erreur lors du rejet");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "approved":
      case "sent":
        return <Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Envoyée</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejetée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Gift className="h-6 w-6" />
              Cartes de Vœux
            </h1>
            <p className="text-muted-foreground mt-1">
              Envoyez des cartes de vœux personnalisées aux employés
            </p>
          </div>
          {isHR && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer une carte
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nouvelle carte de vœux</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Destinataire</label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un employé" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {getEmployeeName(emp)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Occasion</label>
                    <Select value={selectedOccasion} onValueChange={setSelectedOccasion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une occasion" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(occasionLabels).map(([key, { label, emoji }]) => (
                          <SelectItem key={key} value={key}>
                            {emoji} {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message personnalisé (optionnel)</label>
                    <Textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Laissez vide pour utiliser le message par défaut"
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSendCard} disabled={isSending}>
                    {isSending ? "Envoi..." : "Envoyer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Tabs defaultValue={isHR ? "requests" : "sent"}>
          <TabsList className="mb-4">
            {isHR && <TabsTrigger value="requests">Demandes</TabsTrigger>}
            <TabsTrigger value="sent">Cartes envoyées</TabsTrigger>
          </TabsList>

          {isHR && (
            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Demandes de cartes</CardTitle>
                </CardHeader>
                <CardContent>
                  {requests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Aucune demande de carte
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((req) => (
                        <div key={req.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xl">
                                {occasionLabels[req.occasion]?.emoji}
                              </span>
                              <span className="font-medium">
                                {occasionLabels[req.occasion]?.label || req.occasion}
                              </span>
                              {getStatusBadge(req.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Pour: {getEmployeeName(req.recipient)} • Par: {getEmployeeName(req.requester)}
                            </p>
                            {req.custom_message && (
                              <p className="text-sm italic">"{req.custom_message}"</p>
                            )}
                          </div>
                          {req.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectRequest(req.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApproveRequest(req)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approuver
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="sent">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historique des cartes envoyées</CardTitle>
              </CardHeader>
              <CardContent>
                {sentCards.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune carte envoyée
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sentCards.map((card) => (
                      <div key={card.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {occasionLabels[card.occasion]?.emoji}
                          </span>
                          <div>
                            <p className="font-medium">
                              {occasionLabels[card.occasion]?.label} - {getEmployeeName(card.recipient)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(card.sent_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
