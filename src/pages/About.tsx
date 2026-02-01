import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Target, Award, Mail, Phone, MapPin, Loader2 } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export default function About() {
  const { ownershipInfo, isLoading } = usePlatformSettings();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const companyName = ownershipInfo?.company_name || "Ayiti ResourceLogic";
  const email = ownershipInfo?.email || "contact@ayiti-resourcelogic.com";
  const phone = ownershipInfo?.phone || "+509 XXXX-XXXX";
  const address = ownershipInfo?.address || "Port-au-Prince, Haïti";
  const description = ownershipInfo?.description || 
    "Une solution innovante de gestion des ressources humaines développée spécialement pour les organisations haïtiennes.";

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">À Propos</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Découvrez l'histoire et la mission derrière notre plateforme de gestion des ressources humaines.
        </p>
      </div>

      {/* Company Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Notre Entreprise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            <strong>{companyName}</strong> {description}
          </p>
          <p>
            Fondée avec la vision de moderniser la gestion RH en Haïti, notre entreprise s'engage à fournir 
            des solutions technologiques de pointe qui respectent les réglementations locales et les pratiques 
            culturelles du pays.
          </p>
        </CardContent>
      </Card>

      {/* Mission & Vision */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Notre Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Fournir aux organisations haïtiennes des outils de gestion RH modernes, efficaces et accessibles 
              qui permettent d'améliorer la productivité, la transparence et le bien-être des employés tout 
              en simplifiant les processus administratifs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Notre Vision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Devenir la référence en matière de gestion des ressources humaines en Haïti et dans la Caraïbe, 
              en offrant des solutions qui combinent innovation technologique et compréhension profonde 
              des besoins locaux.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Values */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Nos Valeurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Innovation</h4>
              <p className="text-sm text-muted-foreground">
                Adopter les dernières technologies pour des solutions efficaces
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Fiabilité</h4>
              <p className="text-sm text-muted-foreground">
                Garantir la sécurité et la disponibilité de nos services
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Accessibilité</h4>
              <p className="text-sm text-muted-foreground">
                Rendre la technologie accessible à toutes les organisations
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Excellence</h4>
              <p className="text-sm text-muted-foreground">
                Viser la qualité dans tout ce que nous faisons
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Nous Contacter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Téléphone</p>
                <p className="font-medium">{phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adresse</p>
                <p className="font-medium">{address}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Copyright Notice */}
      <div className="text-center text-sm text-muted-foreground border-t pt-6">
        <p>© {new Date().getFullYear()} {companyName}. Tous droits réservés.</p>
        <p className="mt-1">
          Cette application et son code source sont la propriété exclusive de leurs auteurs. 
          Toute reproduction, distribution ou utilisation non autorisée est strictement interdite.
        </p>
      </div>
    </div>
  );
}