import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface EmployeeBadgeProps {
  profile: {
    id: string;
    nom: string | null;
    prenom: string | null;
    code_budgetaire: string | null;
    email: string | null;
    photo_url: string | null;
    organization_id: string | null;
    position_id: string | null;
  };
  organizationName?: string;
  hideActions?: boolean;
}

export function EmployeeBadge({ profile, organizationName, hideActions = false }: EmployeeBadgeProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const badge = document.getElementById('employee-badge');
    if (!badge) return;

    // Créer un canvas pour le téléchargement
    import('html2canvas').then((html2canvas) => {
      html2canvas.default(badge, {
        backgroundColor: '#ffffff',
        scale: 2
      }).then((canvas) => {
        const link = document.createElement('a');
        link.download = `badge-${profile.code_budgetaire || profile.id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });
  };

  return (
    <div className="space-y-4">
      {!hideActions && (
        <div className="flex gap-2 print:hidden">
          <Button onClick={handlePrint} variant="outline" className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
        </div>
      )}

      <Card id="employee-badge" className="w-[350px] mx-auto bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-6 space-y-4">
          {/* En-tête */}
          <div className="text-center border-b pb-3">
            <h3 className="font-bold text-lg">{organizationName || "Organisation"}</h3>
            <p className="text-sm text-muted-foreground">Badge d'identification</p>
          </div>

          {/* Photo de profil */}
          <div className="flex justify-center">
            {profile.photo_url ? (
              <img 
                src={profile.photo_url} 
                alt="Photo de profil"
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-4xl font-bold text-muted-foreground">
                  {profile.prenom?.[0]}{profile.nom?.[0]}
                </span>
              </div>
            )}
          </div>

          {/* Informations */}
          <div className="text-center space-y-2">
            <h4 className="font-bold text-xl">
              {profile.prenom} {profile.nom}
            </h4>
            {profile.code_budgetaire && (
              <p className="text-sm font-mono bg-white px-3 py-1 rounded inline-block">
                {profile.code_budgetaire}
              </p>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center py-4">
            <div className="bg-white p-3 rounded-lg shadow-inner">
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
                includeMargin={false}
              />
            </div>
          </div>

          {/* Pied de page */}
          <div className="text-center text-xs text-muted-foreground border-t pt-3">
            <p>Document officiel</p>
            <p>En cas de perte, veuillez contacter les RH</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
