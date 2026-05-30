import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
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
  /** Live preview color override (no DB save) */
  colorOverride?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

// Pad / sanitize for MRZ strings (passport style)
const mrzClean = (s: string | null | undefined, len: number) => {
  const cleaned = (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "<");
  return (cleaned + "<".repeat(len)).slice(0, len);
};

// Biometric Security Edition — v3
export function EmployeeBadge({
  profile,
  organization,
  positionName,
  hideActions = false,
  colorOverride,
}: EmployeeBadgeProps) {
  const primary = colorOverride?.primary || organization?.primary_color || "#00209F";
  const secondary = colorOverride?.secondary || organization?.secondary_color || "#D21034";
  const accent = colorOverride?.accent || organization?.accent_color || "#FFD700";

  const subtitle = organization?.badge_header_text || "Carte d'identification officielle";
  const validityMonths = organization?.badge_validity_months || 12;
  const baseDate = profile.date_entree_fonction ? new Date(profile.date_entree_fonction) : new Date();
  const expirationDate = addMonths(baseDate, validityMonths);

  const fullName = `${profile.prenom || ""} ${profile.nom || ""}`.trim();
  const matricule = profile.code_budgetaire || "—";

  const qrPayload = JSON.stringify({
    uid: profile.id,
    matricule,
    org: profile.organization_id,
    exp: expirationDate.toISOString().slice(0, 10),
  });

  // MRZ lines (3-line ID card format, passport-inspired)
  const dob = profile.date_naissance
    ? new Date(profile.date_naissance).toISOString().slice(2, 10).replace(/-/g, "")
    : "000000";
  const expShort = expirationDate.toISOString().slice(2, 10).replace(/-/g, "");
  const mrz1 = `I<HTI${mrzClean(matricule, 9)}${"<".repeat(15)}`.slice(0, 30);
  const mrz2 = `${dob}M<<${expShort}HTI${"<".repeat(13)}`.slice(0, 30);
  const mrz3 = `${mrzClean(profile.nom, 14)}<<${mrzClean(profile.prenom, 14)}`.slice(0, 30);

  // Guilloché security background — derived from primary color
  const guilloche = encodeURIComponent(
    `<svg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'><path d='M30 0c16.569 0 30 13.431 30 30S46.569 60 30 60 0 46.569 0 30 13.431 0 30 0zm0 5c13.807 0 25 11.193 25 25S43.807 55 30 55 5 43.807 5 30 16.193 5 30 5z' fill='${primary}' fill-opacity='0.05' fill-rule='evenodd'/></svg>`
  );
  const guillocheBg = { backgroundImage: `url("data:image/svg+xml,${guilloche}")` };

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

  // PVC vertical 320 × 507 px
  const CardShell = ({ children }: { children: React.ReactNode }) => (
    <div
      className="relative bg-white overflow-hidden shadow-2xl border flex flex-col"
      style={{
        width: 320,
        height: 507,
        borderRadius: 18,
        borderColor: "#cbd5e1",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );

  // ───────────────── RECTO ─────────────────
  const Recto = (
    <CardShell>
      {/* Guilloché security pattern */}
      <div className="absolute inset-0 pointer-events-none" style={guillocheBg} />

      {/* Header */}
      <div
        className="relative flex flex-col items-center justify-center text-center px-4 shrink-0"
        style={{
          height: 96,
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 100%)`,
          borderBottom: `4px solid ${secondary}`,
        }}
      >
        {/* Haiti emblem corner */}
        <div
          className="absolute top-2 left-2 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
          style={{
            background: `conic-gradient(${secondary} 0deg 180deg, ${primary} 180deg 360deg)`,
            boxShadow: `0 0 0 1.5px ${accent}`,
          }}
          aria-hidden
        >
          <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
        </div>

        {/* Logo top-right */}
        {organization?.logo_url && (
          <img
            src={organization.logo_url}
            alt=""
            crossOrigin="anonymous"
            className="absolute top-2 right-2 w-8 h-8 object-contain rounded bg-white/10 p-0.5"
          />
        )}

        <h1 className="text-white font-extrabold text-[18px] tracking-tight leading-none uppercase">
          {organization?.name || "Institution"}
        </h1>
        <p
          className="text-[9px] font-bold mt-1.5"
          style={{ color: accent, letterSpacing: "0.2em" }}
        >
          {subtitle.toUpperCase()}
        </p>

        {/* Hologram shimmer overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            background:
              "linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 70%)",
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 p-5 relative z-10 min-h-0">
        <div className="flex gap-4">
          {/* Photo */}
          <div className="shrink-0">
            <div
              className="rounded-lg border-2 bg-slate-50 relative overflow-hidden"
              style={{ width: 96, height: 128, borderColor: "#e2e8f0", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)" }}
            >
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt=""
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-400">
                  {profile.prenom?.[0]}
                  {profile.nom?.[0]}
                </div>
              )}
              {/* Hologram dot bottom-right */}
              <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-white/40 border border-white/70 backdrop-blur-sm flex items-center justify-center">
                <div className="w-2 h-2 rounded-full" style={{ background: `${secondary}80` }} />
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <h2
              className="font-extrabold text-[19px] leading-[1.05] break-words"
              style={{ color: primary }}
            >
              {profile.prenom || "Prénom"}
              <br />
              <span className="uppercase">{profile.nom || "NOM"}</span>
            </h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-1.5 leading-tight line-clamp-2">
              {positionName || "Fonction"}
            </p>
            <div className="h-[2px] w-12 mt-2.5" style={{ background: secondary }} />
          </div>
        </div>

        {/* Field grid */}
        <div className="mt-6 space-y-2.5">
          {[
            { label: "Matricule", value: matricule },
            { label: "NIF", value: profile.nif },
            { label: "CIN", value: profile.cin },
            { label: profile.service ? "Service" : "Téléphone", value: profile.service || profile.telephone },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              className={`grid grid-cols-5 ${i < arr.length - 1 ? "border-b" : ""} pb-1`}
              style={{ borderColor: "#f1f5f9" }}
            >
              <span className="col-span-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {row.label}
              </span>
              <span className="col-span-3 text-[11px] font-bold text-slate-700 truncate">
                {row.value || "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MRZ strip */}
      <div
        className="shrink-0 px-4 py-3 flex flex-col justify-center gap-[3px]"
        style={{
          height: 84,
          background: "#0f172a",
          borderTop: `2px solid ${accent}`,
        }}
      >
        {[mrz1, mrz2, mrz3].map((line, i) => (
          <div
            key={i}
            className="text-white text-[9px] whitespace-nowrap overflow-hidden"
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              letterSpacing: "0.08em",
              lineHeight: "1.2",
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </CardShell>
  );

  // ───────────────── VERSO ─────────────────
  const Verso = (
    <CardShell>
      <div className="absolute inset-0 pointer-events-none opacity-60" style={guillocheBg} />

      {/* Mini header */}
      <div
        className="h-16 flex items-center justify-between px-6 border-b shrink-0"
        style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
      >
        <div className="flex items-center gap-2">
          {organization?.logo_url ? (
            <img
              src={organization.logo_url}
              alt=""
              crossOrigin="anonymous"
              className="w-6 h-6 rounded object-contain"
            />
          ) : (
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[10px] text-white font-bold"
              style={{ background: primary }}
            >
              {organization?.name?.[0] || "O"}
            </div>
          )}
          <span className="font-bold text-slate-800 text-xs truncate max-w-[140px]">
            {organization?.name || "Institution"}
          </span>
        </div>
        <div className="text-[8px] font-bold text-slate-400">{matricule}</div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4 relative z-10 flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[8px] font-bold uppercase text-slate-400">Date de naissance</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">
              {profile.date_naissance
                ? format(new Date(profile.date_naissance), "dd / MM / yyyy", { locale: fr })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[8px] font-bold uppercase text-slate-400">Groupe sanguin</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: secondary }}>
              {profile.groupe_sanguin || "—"}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t" style={{ borderColor: "#f1f5f9" }}>
          <p className="text-[8px] font-bold uppercase text-slate-400 mb-1">Contact d'urgence</p>
          <p className="text-xs font-bold text-slate-700 uppercase truncate">
            {profile.contact_urgence_nom || "—"}
          </p>
          <p className="text-xs font-medium text-slate-600 truncate">
            {profile.contact_urgence_telephone || "—"}
          </p>
        </div>

        {/* Signature + QR */}
        <div className="flex items-end justify-between gap-3 mt-6">
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-bold uppercase text-slate-400 mb-2">Signature autorisée</p>
            <div
              className="h-16 w-full border rounded flex items-center justify-center relative px-2"
              style={{ borderColor: "#e2e8f0", background: "rgba(248,250,252,0.6)" }}
            >
              {organization?.signataire_signature_url ? (
                <img
                  src={organization.signataire_signature_url}
                  alt=""
                  crossOrigin="anonymous"
                  className="h-12 object-contain"
                />
              ) : (
                <span
                  className="text-[20px] text-slate-700 select-none truncate"
                  style={{ fontFamily: "'Great Vibes', cursive" }}
                >
                  {organization?.signataire_nom || "Responsable"}
                </span>
              )}
              <div className="absolute -top-1.5 left-2 bg-white px-1 text-[7px] text-slate-400">
                {organization?.signataire_titre || "Directeur Général"}
              </div>
            </div>
          </div>
          <div
            className="bg-white p-1 border rounded-lg shrink-0"
            style={{ borderColor: "#e2e8f0", boxShadow: `0 0 0 1px ${primary}20` }}
          >
            <QRCodeSVG value={qrPayload} size={64} level="H" includeMargin={false} />
          </div>
        </div>

        {/* Terms */}
        <div
          className="mt-2 p-3 rounded-lg border"
          style={{ background: "#f8fafc", borderColor: "#f1f5f9" }}
        >
          <p className="text-[8px] leading-relaxed text-slate-500 italic">
            Cette carte est strictement personnelle et demeure la propriété de l'institution. En cas
            de perte, contacter immédiatement le service des Ressources Humaines.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        className="mt-auto p-3 flex flex-col items-center gap-1.5 border-t shrink-0"
        style={{ borderColor: "#f1f5f9", background: "rgba(248,250,252,0.6)" }}
      >
        <div className="flex gap-1">
          <div className="w-8 h-1" style={{ background: primary }} />
          <div className="w-8 h-1" style={{ background: secondary }} />
        </div>
        <p className="text-[10px] font-black italic text-slate-400 uppercase tracking-widest text-center truncate max-w-full">
          {organization?.slogan || "Ensemble pour l'excellence !"}
        </p>
        <p className="text-[8px] font-bold tracking-wide truncate max-w-full" style={{ color: primary }}>
          {organization?.website || "www.institution.ht"}
        </p>
      </div>
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
        className="flex flex-wrap items-start justify-center gap-8 p-6 rounded-lg"
        style={{ background: "#f1f5f9" }}
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
