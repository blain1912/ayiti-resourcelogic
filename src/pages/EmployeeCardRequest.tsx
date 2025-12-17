import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, Heart, Clock, CheckCircle, XCircle } from "lucide-react";

const occasionLabels: Record<string, { label: string; emoji: string; description: string }> = {
  anniversaire: { label: "Anniversaire", emoji: "🎂", description: "Pour célébrer un anniversaire" },
  deces_parent: { label: "Décès d'un parent", emoji: "🕊️", description: "Condoléances suite à un décès" },
  prompt_retablissement: { label: "Prompt Rétablissement", emoji: "💪", description: "Pour souhaiter un bon rétablissement" },
  accouchement: { label: "Accouchement", emoji: "👶", description: "Félicitations pour une naissance" },
  mariage: { label: "Mariage", emoji: "💍", description: "Félicitations pour un mariage" },
};

interface Employee {
  id: string;
  full_name: string;
  prenom: string;
  nom: string;
}

interface Profile {
  id: string;
  organization_id: string;
}

interface MyRequest {
  id: string;
  occasion: string;
  status: string;
  custom_message: string | null;
  created_at: string;
  recipient: { full_name: string; prenom: string; nom: string } | null;
}

export default function EmployeeCardRequest() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedOccasion, setSelectedOccasion] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    if (organization?.id && profile?.id) {
      fetchEmployees();
      fetchMyRequests();
    }
  }, [organization?.id, profile?.id]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("id, organization_id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setProfile(data);
    }
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, prenom, nom")
      .eq("organization_id", organization?.id)
      .eq("approval_status", "approved")
      .neq("id", profile?.id); // Exclude self
    
    if (!error && data) {
      setEmployees(data);
    }
  };

  const fetchMyRequests = async () => {
    const { data, error } = await supabase
      .from("greeting_card_requests" as any)
      .select(`
        id, occasion, status, custom_message, created_at,
        recipient:recipient_id(full_name, prenom, nom)
      `)
      .eq("requester_id", profile?.id)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setMyRequests(data as any);
    }
  };

  const getEmployeeName = (emp: { full_name?: string | null; prenom?: string | null; nom?: string | null } | null) => {
    if (!emp) return "Inconnu";
    if (emp.prenom && emp.nom) return `${emp.prenom} ${emp.nom}`;
    return emp.full_name || "Inconnu";
  };

  const handleSubmitRequest = async () => {
    if (!selectedEmployee || !selectedOccasion) {
      toast.error("Veuillez sélectionner un collègue et une occasion");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("greeting_card_requests" as any).insert({
        organization_id: organization?.id,
        requester_id: profile?.id,
        recipient_id: selectedEmployee,
        occasion: selectedOccasion,
        custom_message: customMessage || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Demande envoyée! Les RH vont la traiter.");
      setDialogOpen(false);
      setSelectedEmployee("");
      setSelectedOccasion("");
      setCustomMessage("");
      fetchMyRequests();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setIsSubmitting(false);
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
              <Heart className="h-6 w-6" />
              Demander une carte de vœux
            </h1>
            <p className="text-muted-foreground mt-1">
              Signalez un événement pour qu'une carte soit envoyée à un collègue
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Nouvelle demande
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Signaler un événement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Collègue concerné</label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un collègue" />
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
                  <label className="text-sm font-medium">Type d'événement</label>
                  <Select value={selectedOccasion} onValueChange={setSelectedOccasion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un événement" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(occasionLabels).map(([key, { label, emoji, description }]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{emoji}</span>
                            <div>
                              <p>{label}</p>
                              <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message suggéré (optionnel)</label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Suggérez un message personnalisé pour la carte"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Les RH pourront modifier ce message avant l'envoi
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
                  {isSubmitting ? "Envoi..." : "Soumettre"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mes demandes</CardTitle>
          </CardHeader>
          <CardContent>
            {myRequests.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Vous n'avez pas encore fait de demande de carte
                </p>
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  Faire une demande
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((req) => (
                  <div key={req.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {occasionLabels[req.occasion]?.emoji || "🎉"}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">
                            {occasionLabels[req.occasion]?.label || req.occasion}
                          </p>
                          {getStatusBadge(req.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Pour: {getEmployeeName(req.recipient)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric"
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
      </div>
    </div>
  );
}
