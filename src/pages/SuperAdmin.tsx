import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, Calendar, DollarSign, Plus, FileSpreadsheet } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformOwnership } from "@/components/settings/PlatformOwnership";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionTier = Database["public"]["Enums"]["subscription_tier"];

const SuperAdmin = () => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [paymentForm, setPaymentForm] = useState<{
    amount: string;
    payment_method: string;
    payment_date: string;
    cheque_number: string;
    notes: string;
    subscription_tier: SubscriptionTier;
    months_paid: number;
  }>({
    amount: "",
    payment_method: "cheque",
    payment_date: new Date().toISOString().split('T')[0],
    cheque_number: "",
    notes: "",
    subscription_tier: "pro",
    months_paid: 1,
  });

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has admin role (super admin) - sans organization_id spécifique
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!userRole) {
        // Check if no super admin exists at all
        const { data: anySuperAdmin } = await supabase
          .from("user_roles")
          .select("id")
          .eq("role", "admin")
          .maybeSingle();
        
        if (!anySuperAdmin) {
          navigate("/initial-setup");
          return;
        }
        
        navigate("/");
        return;
      }

      setIsSuperAdmin(true);
      loadOrganizations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select(`
          *,
          profiles (count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedOrg) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error: paymentError } = await supabase
        .from("manual_payments")
        .insert([{
          organization_id: selectedOrg.id,
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          payment_date: paymentForm.payment_date,
          cheque_number: paymentForm.cheque_number || null,
          notes: paymentForm.notes || null,
          processed_by: user.id,
          subscription_tier: paymentForm.subscription_tier as SubscriptionTier,
          months_paid: paymentForm.months_paid,
        }]);

      if (paymentError) throw paymentError;

      // Calculate new expiration date
      const currentExpires = selectedOrg.subscription_expires_at 
        ? new Date(selectedOrg.subscription_expires_at)
        : new Date();
      
      const newExpires = new Date(currentExpires);
      newExpires.setMonth(newExpires.getMonth() + paymentForm.months_paid);

      // Update organization subscription
      const maxUsers = paymentForm.subscription_tier === 'pro' ? 50 : paymentForm.subscription_tier === 'enterprise' ? 999999 : 5;
      const maxUnits = paymentForm.subscription_tier === 'pro' ? 20 : paymentForm.subscription_tier === 'enterprise' ? 999999 : 3;

      const { error: orgError } = await supabase
        .from("organizations")
        .update({
          subscription_tier: paymentForm.subscription_tier as SubscriptionTier,
          subscription_expires_at: newExpires.toISOString(),
          max_users: maxUsers,
          max_units: maxUnits,
        })
        .eq("id", selectedOrg.id);

      if (orgError) throw orgError;

      // Record history
      const { error: historyError } = await supabase
        .from("subscription_history")
        .insert([{
          organization_id: selectedOrg.id,
          old_tier: selectedOrg.subscription_tier as SubscriptionTier,
          new_tier: paymentForm.subscription_tier as SubscriptionTier,
          changed_by: user.id,
          reason: `Paiement manuel: ${paymentForm.payment_method}`,
        }]);

      if (historyError) throw historyError;

      toast({
        title: "Paiement enregistré",
        description: "L'abonnement a été mis à jour avec succès",
      });

      setPaymentDialogOpen(false);
      setSelectedOrg(null);
      setPaymentForm({
        amount: "",
        payment_method: "cheque",
        payment_date: new Date().toISOString().split('T')[0],
        cheque_number: "",
        notes: "",
        subscription_tier: "pro" as SubscriptionTier,
        months_paid: 1,
      });
      loadOrganizations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const getTierBadge = (tier: string) => {
    const colors: any = {
      free: "bg-muted",
      pro: "bg-primary",
      enterprise: "bg-accent",
    };
    return <Badge className={colors[tier] || "bg-muted"}>{tier.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Administration</h1>
            <p className="text-muted-foreground mt-2">
              Gestion de toutes les organisations abonnées
            </p>
          </div>
          <Button onClick={() => navigate("/salary-scale-template")} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Grille Salariale Template
          </Button>
        </div>

        <Tabs defaultValue="organizations" className="w-full">
          <TabsList>
            <TabsTrigger value="organizations">Organisations</TabsTrigger>
            <TabsTrigger value="platform">Configuration Plateforme</TabsTrigger>
          </TabsList>

          <TabsContent value="organizations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Organisations</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{organizations.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Abonnements Pro</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {organizations.filter(o => o.subscription_tier === 'pro').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Abonnements Enterprise</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {organizations.filter(o => o.subscription_tier === 'enterprise').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gratuits</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {organizations.filter(o => o.subscription_tier === 'free').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Toutes les organisations</CardTitle>
                <CardDescription>
                  Vue d'ensemble de tous vos clients abonnés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Utilisateurs</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>{org.type}</TableCell>
                        <TableCell>{getTierBadge(org.subscription_tier)}</TableCell>
                        <TableCell>{org.profiles?.[0]?.count || 0} / {org.max_users}</TableCell>
                        <TableCell>
                          {org.subscription_expires_at 
                            ? new Date(org.subscription_expires_at).toLocaleDateString('fr-FR')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Dialog open={paymentDialogOpen && selectedOrg?.id === org.id} onOpenChange={(open) => {
                            setPaymentDialogOpen(open);
                            if (!open) setSelectedOrg(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                onClick={() => setSelectedOrg(org)}
                                variant="outline"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Paiement
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Enregistrer un paiement - {org.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Montant (HTG)</Label>
                                    <Input
                                      type="number"
                                      value={paymentForm.amount}
                                      onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                                      placeholder="10000"
                                    />
                                  </div>
                                  <div>
                                    <Label>Méthode de paiement</Label>
                                    <Select 
                                      value={paymentForm.payment_method}
                                      onValueChange={(value) => setPaymentForm({...paymentForm, payment_method: value})}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="cheque">Chèque</SelectItem>
                                        <SelectItem value="espece">Espèce</SelectItem>
                                        <SelectItem value="virement">Virement</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Date de paiement</Label>
                                    <Input
                                      type="date"
                                      value={paymentForm.payment_date}
                                      onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                                    />
                                  </div>
                                  <div>
                                    <Label>Numéro de chèque (optionnel)</Label>
                                    <Input
                                      value={paymentForm.cheque_number}
                                      onChange={(e) => setPaymentForm({...paymentForm, cheque_number: e.target.value})}
                                      placeholder="CHQ-12345"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Plan d'abonnement</Label>
                                    <Select 
                                      value={paymentForm.subscription_tier}
                                      onValueChange={(value) => setPaymentForm({...paymentForm, subscription_tier: value as SubscriptionTier})}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="free">Free</SelectItem>
                                        <SelectItem value="pro">Pro</SelectItem>
                                        <SelectItem value="enterprise">Enterprise</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>Durée (mois)</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={paymentForm.months_paid}
                                      onChange={(e) => setPaymentForm({...paymentForm, months_paid: parseInt(e.target.value)})}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label>Notes (optionnel)</Label>
                                  <Textarea
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                                    placeholder="Informations supplémentaires..."
                                    rows={3}
                                  />
                                </div>

                                <Button onClick={handlePaymentSubmit} className="w-full">
                                  Enregistrer le paiement
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="platform" className="space-y-6">
            <PlatformOwnership />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdmin;
