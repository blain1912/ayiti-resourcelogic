import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePlatformSettings, OwnershipInfo } from "@/hooks/usePlatformSettings";
import { Building2, Mail, Phone, MapPin, Save, Loader2 } from "lucide-react";

export const PlatformOwnership = () => {
  const { ownershipInfo, isLoading, updateOwnershipInfo } = usePlatformSettings();
  const { toast } = useToast();
  const [formData, setFormData] = useState<OwnershipInfo>({
    company_name: "",
    email: "",
    phone: "",
    address: "",
    description: "",
  });

  useEffect(() => {
    if (ownershipInfo) {
      setFormData(ownershipInfo);
    }
  }, [ownershipInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateOwnershipInfo.mutateAsync(formData);
      toast({
        title: "Succès",
        description: "Les informations de propriété ont été mises à jour.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Informations de Propriété
        </CardTitle>
        <CardDescription>
          Ces informations apparaissent sur les pages "À propos" et "Conditions d'utilisation"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_name" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Nom de l'entreprise
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Ayiti ResourceLogic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email de contact
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Téléphone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+509 XXXX-XXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Adresse
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Port-au-Prince, Haïti"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description de l'entreprise</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez votre entreprise..."
              rows={4}
            />
          </div>

          <Button type="submit" disabled={updateOwnershipInfo.isPending}>
            {updateOwnershipInfo.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
