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
        className="w-[500px] mx-auto overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` 
        }}
      >
        <CardContent className="p-0">
          {/* Header avec logo et nom organisation */}
          <div className="bg-white/95 px-4 py-2 flex items-center justify-between border-b">
            {organization?.logo_url ? (
              <img 
                src={organization.logo_url} 
                alt="Logo" 
                className="h-8 object-contain"
              />
            ) : (
              <span className="font-bold text-sm" style={{ color: primaryColor }}>
                {organization?.name || "Organisation"}
              </span>
            )}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Carte d'identité
            </span>
          </div>

          {/* Corps principal - format horizontal */}
          <div className="flex p-4 gap-4">
            {/* Photo à gauche */}
            <div className="flex-shrink-0">
              {profile.photo_url ? (
                <img 
                  src={profile.photo_url} 
                  alt="Photo de profil"
                  className="w-28 h-36 rounded-md object-cover border-2 border-white shadow-lg"
                />
              ) : (
                <div className="w-28 h-36 rounded-md bg-white/80 flex items-center justify-center border-2 border-white shadow-lg">
                  <span className="text-3xl font-bold text-muted-foreground">
                    {profile.prenom?.[0]}{profile.nom?.[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Informations à droite */}
            <div className="flex-1 flex flex-col justify-between text-white">
              <div className="space-y-1">
                <h4 className="font-bold text-xl leading-tight drop-shadow-sm">
                  {profile.prenom} {profile.nom}
                </h4>
                
                {positionName && (
                  <p className="text-sm opacity-90 font-medium">
                    {positionName}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-sm">
                {profile.nif && (
                  <div className="flex items-center gap-2">
                    <span className="opacity-75 text-xs">NIF:</span>
                    <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-xs font-semibold">
                      {profile.nif}
                    </span>
                  </div>
                )}
                
                {profile.groupe_sanguin && (
                  <div className="flex items-center gap-2">
                    <span className="opacity-75 text-xs">Groupe:</span>
                    <span className="font-mono bg-red-500 px-2 py-0.5 rounded text-xs font-bold">
                      {profile.groupe_sanguin}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code à droite */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center">
              <div className="bg-white p-2 rounded-lg shadow-inner">
                <QRCodeSVG
                  value={JSON.stringify({
                    id: profile.id,
                    nom: profile.nom,
                    prenom: profile.prenom,
                    code_budgetaire: profile.code_budgetaire,
                    email: profile.email,
                    organization_id: profile.organization_id
                  })}
                  size={80}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white/95 px-4 py-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">
              En cas de perte, veuillez contacter les Ressources Humaines
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
