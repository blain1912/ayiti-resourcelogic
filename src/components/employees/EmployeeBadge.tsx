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
  const primaryColor = organization?.primary_color || '#1e3a5f';
  const secondaryColor = organization?.secondary_color || '#2563eb';
  const accentColor = organization?.accent_color || '#f59e0b';
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const badge = document.getElementById('employee-badge');
    if (!badge) return;

    import('html2canvas').then((html2canvas) => {
      html2canvas.default(badge, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true
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
        className="w-[340px] mx-auto overflow-hidden relative rounded-xl shadow-2xl"
        style={{ aspectRatio: '2.125/3.375' }}
      >
        {/* Background avec dégradé élégant */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            background: `
              linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${primaryColor} 100%)
            `,
          }}
        />
        {/* Motif géométrique subtil */}
        <div 
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 80%, white 1px, transparent 1px),
              radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
              radial-gradient(circle at 40% 40%, white 1px, transparent 1px),
              radial-gradient(circle at 60% 60%, white 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Bande décorative en haut */}
        <div 
          className="absolute top-0 left-0 right-0 h-2 z-10"
          style={{ backgroundColor: accentColor }}
        />
        
        <CardContent className="p-0 relative z-10 h-full flex flex-col">
          {/* Header avec logo et nom organisation */}
          <div className="bg-white px-4 py-4 text-center shadow-md">
            {organization?.logo_url ? (
              <img 
                src={organization.logo_url} 
                alt="Logo" 
                className="h-14 mx-auto object-contain mb-2"
                crossOrigin="anonymous"
              />
            ) : (
              <div 
                className="w-14 h-14 mx-auto mb-2 rounded-full flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: primaryColor }}
              >
                {organization?.name?.charAt(0) || 'O'}
              </div>
            )}
            <h3 
              className="font-bold text-sm uppercase tracking-wide leading-tight"
              style={{ color: primaryColor }}
            >
              {organization?.name || "Organisation"}
            </h3>
            <div 
              className="mt-2 py-1 px-3 rounded-full inline-block"
              style={{ backgroundColor: accentColor }}
            >
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                Carte d'identité
              </span>
            </div>
          </div>

          {/* Corps principal */}
          <div className="flex-1 p-4 flex flex-col items-center justify-center gap-3">
            {/* Photo avec cadre élégant */}
            <div 
              className="p-1 rounded-lg shadow-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
            >
              {profile.photo_url ? (
                <img 
                  src={profile.photo_url} 
                  alt="Photo de profil"
                  className="w-28 h-36 rounded-md object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-28 h-36 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-400">
                    {profile.prenom?.[0]}{profile.nom?.[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Informations employé */}
            <div className="text-center text-white space-y-1">
              <h4 className="font-bold text-lg leading-tight drop-shadow-md">
                {profile.prenom} {profile.nom}
              </h4>
              
              {positionName && (
                <p 
                  className="text-sm font-medium px-3 py-1 rounded-full inline-block"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  {positionName}
                </p>
              )}
            </div>

            {/* Badges d'info */}
            <div className="flex flex-wrap justify-center gap-2">
              {profile.nif && (
                <div 
                  className="px-3 py-1.5 rounded-lg text-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
                >
                  <span className="text-[9px] opacity-80 block text-white uppercase tracking-wide">NIF</span>
                  <span className="font-mono text-xs font-bold text-white">{profile.nif}</span>
                </div>
              )}
              
              {profile.groupe_sanguin && (
                <div 
                  className="px-3 py-1.5 rounded-lg text-center"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  <span className="text-[9px] opacity-90 block text-white uppercase tracking-wide">Groupe</span>
                  <span className="font-mono text-xs font-bold text-white">{profile.groupe_sanguin}</span>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="bg-white p-2 rounded-lg shadow-lg">
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

          {/* Footer */}
          <div 
            className="px-4 py-2 text-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
          >
            <p className="text-[9px] text-white/80">
              En cas de perte, veuillez contacter les RH
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
