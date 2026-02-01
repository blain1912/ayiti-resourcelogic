import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, Scale, AlertTriangle, Copyright, Users } from "lucide-react";

export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Conditions d'Utilisation</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Veuillez lire attentivement ces conditions avant d'utiliser notre plateforme.
        </p>
        <p className="text-sm text-muted-foreground">
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Acceptance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              1. Acceptation des Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              En accédant à et en utilisant Ayiti ResourceLogic (ci-après "la Plateforme"), vous acceptez 
              d'être lié par ces conditions d'utilisation. Si vous n'acceptez pas ces conditions, 
              veuillez ne pas utiliser la Plateforme.
            </p>
            <p>
              Ces conditions constituent un accord juridique entre vous (l'utilisateur) et 
              Ayiti ResourceLogic (le propriétaire de la Plateforme).
            </p>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copyright className="h-5 w-5 text-primary" />
              2. Propriété Intellectuelle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              <strong>Droits d'auteur :</strong> La Plateforme, y compris mais sans s'y limiter, 
              son code source, son design, ses graphiques, ses logos, son contenu et sa documentation, 
              est protégée par les lois sur le droit d'auteur et les traités internationaux.
            </p>
            <p>
              <strong>Propriété :</strong> Tous les droits de propriété intellectuelle relatifs à la 
              Plateforme sont la propriété exclusive de Ayiti ResourceLogic et de ses concédants de licence.
            </p>
            <p>
              <strong>Restrictions :</strong> Vous ne pouvez pas :
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Copier, modifier ou distribuer le code source de la Plateforme</li>
              <li>Effectuer de l'ingénierie inverse ou désassembler le logiciel</li>
              <li>Supprimer les mentions de droits d'auteur ou de propriété</li>
              <li>Utiliser la Plateforme à des fins illégales</li>
              <li>Revendre ou sublicencier l'accès à la Plateforme sans autorisation</li>
            </ul>
          </CardContent>
        </Card>

        {/* License */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              3. Licence d'Utilisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              Sous réserve du respect de ces conditions, Ayiti ResourceLogic vous accorde une licence 
              limitée, non exclusive, non transférable et révocable pour utiliser la Plateforme 
              uniquement à des fins de gestion des ressources humaines au sein de votre organisation.
            </p>
            <p>
              Cette licence ne vous confère aucun droit de propriété sur la Plateforme. Ayiti ResourceLogic 
              se réserve tous les droits non expressément accordés dans ces conditions.
            </p>
          </CardContent>
        </Card>

        {/* User Obligations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              4. Obligations de l'Utilisateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>En utilisant la Plateforme, vous vous engagez à :</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Fournir des informations exactes et à jour</li>
              <li>Maintenir la confidentialité de vos identifiants de connexion</li>
              <li>Respecter les lois applicables, notamment en matière de protection des données</li>
              <li>Utiliser la Plateforme de manière responsable et éthique</li>
              <li>Signaler toute utilisation non autorisée de votre compte</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Protection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              5. Protection des Données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              <strong>Collecte de données :</strong> Nous collectons et traitons les données personnelles 
              conformément à notre politique de confidentialité et aux lois applicables en matière de 
              protection des données.
            </p>
            <p>
              <strong>Sécurité :</strong> Nous mettons en œuvre des mesures de sécurité appropriées 
              pour protéger vos données contre l'accès non autorisé, la modification, la divulgation 
              ou la destruction.
            </p>
            <p>
              <strong>Vos droits :</strong> Vous avez le droit d'accéder à vos données personnelles, 
              de les rectifier, de les supprimer et de vous opposer à leur traitement dans certaines 
              circonstances.
            </p>
          </CardContent>
        </Card>

        {/* Liability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              6. Limitation de Responsabilité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              La Plateforme est fournie "en l'état" sans garantie d'aucune sorte, expresse ou implicite. 
              Ayiti ResourceLogic ne garantit pas que la Plateforme sera ininterrompue, sécurisée ou 
              exempte d'erreurs.
            </p>
            <p>
              En aucun cas, Ayiti ResourceLogic ne sera responsable des dommages indirects, accessoires, 
              spéciaux ou consécutifs résultant de l'utilisation ou de l'impossibilité d'utiliser la 
              Plateforme.
            </p>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card>
          <CardHeader>
            <CardTitle>7. Résiliation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              Ayiti ResourceLogic peut suspendre ou résilier votre accès à la Plateforme à tout moment, 
              avec ou sans motif, avec ou sans préavis. En cas de résiliation, vous devez cesser 
              immédiatement d'utiliser la Plateforme.
            </p>
            <p>
              Les dispositions relatives à la propriété intellectuelle, à la limitation de responsabilité 
              et à la loi applicable survivront à la résiliation de ces conditions.
            </p>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card>
          <CardHeader>
            <CardTitle>8. Loi Applicable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              Ces conditions sont régies et interprétées conformément aux lois de la République d'Haïti. 
              Tout litige découlant de ces conditions sera soumis à la juridiction exclusive des 
              tribunaux de Port-au-Prince, Haïti.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>9. Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Pour toute question concernant ces conditions d'utilisation, veuillez nous contacter à :
            </p>
            <p className="mt-2 font-medium">contact@ayiti-resourcelogic.com</p>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground border-t pt-6">
        <p>© {new Date().getFullYear()} Ayiti ResourceLogic. Tous droits réservés.</p>
      </div>
    </div>
  );
}
