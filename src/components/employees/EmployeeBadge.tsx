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
    nif: string | null;
    groupe_sanguin: string | null;
    email: string | null;
    photo_url: string | null;
    organization_id: string | null;
    position_id: string | null;
  };
  organization?: {
    name: string;
    logo_url?: string | null;
    primary_color?: string | null;
    secondary_color?: string | null;
    accent_color?: string | null;
  } | null;
  positionName?: string | null;
  hideActions?: boolean;
}

export function EmployeeBadge({ profile, organization, positionName, hideActions = false }: EmployeeBadgeProps) {
  const primaryColor = organization?.primary_color || '#0EA5E9';
  const secondaryColor = organization?.secondary_color || '#8B5CF6';
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

      <Card 
        id="employee-badge" 
        className="w-[350px] mx-auto"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}10)` 
        }}
      >
        <CardContent className="p-6 space-y-4">
          {/* En-tête */}
          <div className="text-center border-b pb-3">
            {organization?.logo_url ? (
              <img 
                src={organization.logo_url} 
                alt="Logo" 
                className="h-12 mx-auto mb-2 object-contain"
              />
            ) : (
              <h3 className="font-bold text-lg">{organization?.name || "Organisation"}</h3>
            )}
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
            
            <div className="space-y-1">
              {profile.nif && (
                <p className="text-sm">
                  <span className="font-semibold">NIF:</span>{" "}
                  <span className="font-mono bg-white px-2 py-0.5 rounded">{profile.nif}</span>
                </p>
              )}
              
              {positionName && (
                <p className="text-sm">
                  <span className="font-semibold">Poste:</span> {positionName}
                </p>
              )}
              
              {profile.groupe_sanguin && (
                <p className="text-sm">
                  <span className="font-semibold">Groupe sanguin:</span>{" "}
                  <span className="font-mono bg-white px-2 py-0.5 rounded text-red-600 font-bold">
                    {profile.groupe_sanguin}
                  </span>
                </p>
              )}
            </div>
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
