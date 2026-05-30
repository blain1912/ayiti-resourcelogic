import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, Printer, User, IdCard, Calendar, Droplet, Phone, Globe } from "lucide-react";
import { format, addMonths } from "date-fns";
import { fr } from "date-fns/locale";

interface EmployeeBadgeProps {
  profile: {
    id: string;
    nom: string | null;
    prenom: string | null;
    code_budgetaire: string | null;
    nif: string | null;
    cin?: string | null;
    telephone?: string | null;
    date_naissance?: string | null;
    groupe_sanguin: string | null;
    email: string | null;
    photo_url: string | null;
    organization_id: string | null;
    position_id: string | null;
    date_entree_fonction?: string | null;
    contact_urgence_nom?: string | null;
    contact_urgence_telephone?: string | null;
    service?: string | null;
    departement?: string | null;
  };
  organization?: {
    name: string;
    logo_url?: string | null;
    primary_color?: string | null;
    secondary_color?: string | null;
    accent_color?: string | null;
    badge_header_text?: string | null;
    badge_footer_text?: string | null;
    badge_validity_months?: number | null;
    website?: string | null;
    slogan?: string | null;
    signataire_nom?: string | null;
    signataire_titre?: string | null;
    signataire_signature_url?: string | null;
  } | null;
  positionName?: string | null;
  hideActions?: boolean;
}

// Premium GRHPro-style PVC ID badge (recto + verso)
export function EmployeeBadge({ profile, organization, positionName, hideActions = false }: EmployeeBadgeProps) {
  // Institutional palette — defaults match the GRHPro reference
  const primary = organization?.primary_color || "#071b66";
  const secondary = organization?.secondary_color || "#1236c9";
  const accent = organization?.accent_color || "#facc15"; // yellow accent
  const subtitle = organization?.badge_header_text || "Carte d'identification officielle";
  const validityMonths = organization?.badge_validity_months || 12;

  const baseDate = profile.date_entree_fonction ? new Date(profile.date_entree_fonction) : new Date();
  const expirationDate = addMonths(baseDate, validityMonths);
  const academicYear = `${baseDate.getFullYear()} - ${expirationDate.getFullYear()}`;

  const fullName = `${profile.prenom || ""} ${profile.nom || ""}`.trim();
  const matricule = profile.code_budgetaire || "—";

  const qrPayload = JSON.stringify({
    uid: profile.id,
    matricule,
    org: profile.organization_id,
  });

  const handlePrint = () => window.print();
  const handleDownload = () => {
    const el = document.getElementById("employee-badge");
    if (!el) return;
    import("html2canvas").then((h) =>
      h.default(el, { backgroundColor: "#ffffff", scale: 3, useCORS: true, allowTaint: true }).then((canvas) => {
        const link = document.createElement("a");
        link.download = `badge-${matricule}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      })
    );
  };

  // PVC vertical: 53.98mm x 85.60mm → ratio ≈ 0.6307
  // Display ~ 320 x 507 px for crispness
  const CardShell = ({ children }: { children: React.ReactNode }) => (
    <div
      className="relative bg-white overflow-hidden shadow-2xl ring-1 ring-slate-200"
      style={{ width: 320, height: 507, borderRadius: 12 }}
    >
      {children}
    </div>
  );

  const Header = ({ compact = false }: { compact?: boolean }) => (
    <div
      className="relative px-4 pt-4 pb-6 text-white"
      style={{
        background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
      }}
    >
      <div className="flex items-center gap-3">
        {organization?.logo_url ? (
          <img
            src={organization.logo_url}
            alt=""
            crossOrigin="anonymous"
            className="h-12 w-12 object-contain drop-shadow"
          />
        ) : (
          <div className="h-12 w-12 rounded-md bg-white/15 flex items-center justify-center font-bold text-lg">
            {organization?.name?.charAt(0) || "O"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-xl leading-tight tracking-tight truncate">
            {organization?.name || "Institution"}
          </h2>
          {!compact && organization?.badge_header_text !== "" && (
            <p
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: accent }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {/* decorative wave */}
      <svg
        className="absolute left-0 right-0 -bottom-px w-full"
        viewBox="0 0 320 24"
        preserveAspectRatio="none"
        style={{ height: 24 }}
      >
        <path d="M0,24 C80,0 240,24 320,4 L320,24 Z" fill="#ffffff" />
        <path d="M0,24 C100,8 220,28 320,10 L320,24 Z" fill={secondary} opacity="0.35" />
      </svg>
    </div>
  );

  const Footer = ({ children }: { children: React.ReactNode }) => (
    <div
      className="absolute bottom-0 left-0 right-0 px-4 py-2 text-center"
      style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
    >
      {children}
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex text-[11px] leading-tight">
      <span className="font-semibold text-slate-700 w-[78px] shrink-0">{label} :</span>
      <span className="font-medium text-slate-900 truncate">{value || "—"}</span>
    </div>
  );

  const Recto = (
    <CardShell>
      <Header />
      {/* watermark */}
      {organization?.logo_url && (
        <img
          src={organization.logo_url}
          alt=""
          crossOrigin="anonymous"
          className="absolute right-2 bottom-24 w-40 h-40 object-contain opacity-[0.05] pointer-events-none"
        />
      )}

      <div className="px-4 pt-2 pb-16 relative">
        <div className="flex gap-3">
          <div
            className="shrink-0 rounded-md p-1 bg-white"
            style={{ boxShadow: `0 0 0 2px ${secondary}33` }}
          >
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt=""
                crossOrigin="anonymous"
                className="w-[92px] h-[112px] object-cover rounded"
              />
            ) : (
              <div className="w-[92px] h-[112px] rounded bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400">
                {profile.prenom?.[0]}
                {profile.nom?.[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3
              className="font-extrabold leading-[1.05] text-[18px] break-words"
              style={{ color: primary }}
            >
              {fullName || "Nom Prénom"}
            </h3>
            {positionName && (
              <p
                className="font-semibold text-[12px] mt-1"
                style={{ color: secondary }}
              >
                {positionName}
              </p>
            )}
            <div
              className="my-2 h-px"
              style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
            />
          </div>
        </div>

        <div className="mt-2 space-y-1">
          <InfoRow label="Matricule" value={matricule} />
          {profile.nif && <InfoRow label="NIF" value={profile.nif} />}
          {profile.cin && <InfoRow label="CIN" value={profile.cin} />}
          {profile.telephone && <InfoRow label="Téléphone" value={profile.telephone} />}
          {profile.service && <InfoRow label="Service" value={profile.service} />}
          {profile.departement && <InfoRow label="Département" value={profile.departement} />}
        </div>

        {/* signature + QR */}
        <div className="absolute left-4 right-4 bottom-12 flex items-end justify-between">
          <div className="text-[10px]">
            {organization?.signataire_signature_url ? (
              <img
                src={organization.signataire_signature_url}
                alt=""
                crossOrigin="anonymous"
                className="h-10 object-contain"
              />
            ) : (
              <div className="h-10 w-24 italic font-serif text-slate-400 flex items-end">
                {organization?.signataire_nom?.split(" ")[0] || ""}
              </div>
            )}
            <div className="border-t border-dotted border-slate-400 mt-0.5 pt-0.5">
              <div className="font-bold text-slate-800">
                {organization?.signataire_nom || "Responsable"}
              </div>
              <div className="font-semibold" style={{ color: secondary }}>
                {organization?.signataire_titre || "Directeur Général"}
              </div>
            </div>
          </div>
          <div className="bg-white p-1 rounded" style={{ boxShadow: `0 0 0 2px ${secondary}` }}>
            <QRCodeSVG value={qrPayload} size={68} level="H" includeMargin={false} />
          </div>
        </div>
      </div>

      <Footer>
        <p className="text-[11px] font-semibold italic" style={{ color: accent }}>
          Année académique {academicYear}
        </p>
      </Footer>
    </CardShell>
  );

  const VersoRow = ({
    Icon,
    label,
    value,
  }: {
    Icon: typeof User;
    label: string;
    value?: string | null;
  }) => (
    <div className="flex items-center gap-2 text-[11px]">
      <Icon className="h-4 w-4 shrink-0" style={{ color: primary }} />
      <span className="font-semibold w-[96px] shrink-0" style={{ color: primary }}>
        {label} :
      </span>
      <span className="font-bold text-slate-900 truncate" style={{ color: primary }}>
        {value || "—"}
      </span>
    </div>
  );

  const Verso = (
    <CardShell>
      <Header compact />
      <div className="px-4 pt-3 pb-16 space-y-2">
        <VersoRow Icon={User} label="Nom complet" value={fullName} />
        <VersoRow Icon={IdCard} label="Matricule" value={matricule} />
        <VersoRow
          Icon={Calendar}
          label="Date de naissance"
          value={
            profile.date_naissance
              ? format(new Date(profile.date_naissance), "dd / MM / yyyy", { locale: fr })
              : undefined
          }
        />
        <VersoRow Icon={Droplet} label="Groupe sanguin" value={profile.groupe_sanguin} />
        <VersoRow Icon={Phone} label="Contact d'urgence" value={profile.contact_urgence_nom} />
        <VersoRow
          Icon={Phone}
          label="Téléphone urgence"
          value={profile.contact_urgence_telephone}
        />

        <div className="my-3 h-px bg-slate-200" />

        <div className="flex gap-3">
          <div
            className="bg-white p-1 rounded shrink-0"
            style={{ boxShadow: `0 0 0 2px ${secondary}` }}
          >
            <QRCodeSVG value={qrPayload} size={92} level="H" includeMargin={false} />
          </div>
          <ul className="text-[10px] leading-snug text-slate-700 space-y-1.5">
            <li className="flex gap-1.5">
              <span style={{ color: secondary }}>●</span>
              <span>Cette carte demeure la propriété de l'institution.</span>
            </li>
            <li className="flex gap-1.5">
              <span style={{ color: secondary }}>●</span>
              <span>Toute perte doit être immédiatement signalée.</span>
            </li>
            <li className="flex gap-1.5">
              <span style={{ color: secondary }}>●</span>
              <span>Si vous trouvez cette carte, veuillez contacter l'administration.</span>
            </li>
          </ul>
        </div>
      </div>

      <Footer>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-white text-[10px] font-medium">
            <Globe className="h-3 w-3" />
            <span>{organization?.website || "www.institution.ht"}</span>
          </div>
          <span className="text-[10px] font-semibold italic" style={{ color: accent }}>
            {organization?.slogan || "Ensemble pour l'excellence !"}
          </span>
        </div>
      </Footer>
    </CardShell>
  );

  return (
    <div className="space-y-4">
      {!hideActions && (
        <div className="flex gap-2 print:hidden justify-center flex-wrap">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
        </div>
      )}

      <div
        id="employee-badge"
        className="flex flex-wrap items-start justify-center gap-8 p-4 bg-slate-50 rounded-lg"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-semibold tracking-widest text-slate-500">RECTO</span>
          {Recto}
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-semibold tracking-widest text-slate-500">VERSO</span>
          {Verso}
        </div>
      </div>
    </div>
  );
}
