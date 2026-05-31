import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, GraduationCap, Calendar, Shield, Phone, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * Aperçu badge élève — style SaaS moderne
 * Palette par défaut : Bleu institutionnel #0F4C81, Bleu clair #3A86FF,
 * Blanc, Gris clair #F5F7FA, Gris foncé #2C3E50
 * Typo : Poppins
 */
const BadgePreview = () => {
  const [primary, setPrimary] = useState("#0F4C81");
  const [accent, setAccent] = useState("#3A86FF");
  const [schoolName, setSchoolName] = useState("Lycée National de Port-au-Prince");
  const [schoolShort, setSchoolShort] = useState("LNPP");
  const [year, setYear] = useState("2025 – 2026");

  const student = {
    prenom: "Marie-Claire",
    nom: "DESROSIERS",
    classe: "Terminale C",
    matricule: "LNPP-2025-0427",
    section: "Sciences Expérimentales",
    naissance: "14 / 03 / 2008",
    tuteur: "Jean DESROSIERS",
    tel: "+509 3712 4488",
    adresse: "Delmas 75, Port-au-Prince",
  };

  const font = "'Poppins', system-ui, sans-serif";
  const headerGradient = `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`;
  const softGradient = `linear-gradient(180deg, #FFFFFF 0%, #F5F7FA 100%)`;

  const Badge = (
    <div
      style={{
        width: 340,
        height: 540,
        borderRadius: 22,
        fontFamily: font,
        background: softGradient,
        boxShadow:
          "0 30px 60px -20px rgba(15,76,129,0.35), 0 10px 25px -10px rgba(15,76,129,0.25)",
        overflow: "hidden",
        position: "relative",
        border: "1px solid rgba(15,76,129,0.08)",
      }}
    >
      {/* Header gradient */}
      <div
        style={{
          height: 130,
          background: headerGradient,
          position: "relative",
          padding: "16px 18px",
          color: "#fff",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: -30,
            width: 90,
            height: 90,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        <div className="flex items-start justify-between relative">
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            <GraduationCap size={22} color="#fff" />
          </div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.18em",
              background: "rgba(255,255,255,0.18)",
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            CARTE ÉLÈVE
          </div>
        </div>

        <div style={{ marginTop: 14, position: "relative" }}>
          <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85, letterSpacing: "0.05em" }}>
            {schoolShort}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              lineHeight: 1.15,
              marginTop: 2,
              maxWidth: 240,
            }}
          >
            {schoolName}
          </div>
        </div>
      </div>

      {/* Photo flottante */}
      <div
        style={{
          position: "absolute",
          top: 92,
          left: "50%",
          transform: "translateX(-50%)",
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: "#fff",
          padding: 4,
          boxShadow: "0 10px 25px -8px rgba(15,76,129,0.45)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${primary}22, ${accent}22)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 700,
            color: primary,
            fontFamily: font,
          }}
        >
          {student.prenom[0]}
          {student.nom[0]}
        </div>
      </div>

      {/* Identité */}
      <div style={{ paddingTop: 56, paddingInline: 22, textAlign: "center" }}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#2C3E50",
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
          }}
        >
          {student.prenom} <span style={{ fontWeight: 800 }}>{student.nom}</span>
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 6,
            fontSize: 10,
            fontWeight: 600,
            color: primary,
            background: `${accent}15`,
            padding: "4px 12px",
            borderRadius: 999,
          }}
        >
          {student.classe} · {student.section}
        </div>
      </div>

      {/* Infos */}
      <div
        style={{
          margin: "14px 18px 0",
          padding: "10px 14px",
          background: "#F5F7FA",
          borderRadius: 12,
          fontSize: 10,
          color: "#2C3E50",
          display: "grid",
          gap: 6,
        }}
      >
        <div className="flex justify-between">
          <span style={{ opacity: 0.6, fontWeight: 500 }}>Matricule</span>
          <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
            {student.matricule}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ opacity: 0.6, fontWeight: 500 }}>Né(e) le</span>
          <span style={{ fontWeight: 600 }}>{student.naissance}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ opacity: 0.6, fontWeight: 500 }}>Tuteur</span>
          <span style={{ fontWeight: 600 }}>{student.tuteur}</span>
        </div>
      </div>

      {/* QR + statuts */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "12px 18px 0",
        }}
      >
        <div
          style={{
            padding: 6,
            background: "#fff",
            border: `1.5px solid ${accent}33`,
            borderRadius: 10,
          }}
        >
          <QRCodeSVG value={`STUDENT:${student.matricule}`} size={70} level="M" fgColor={primary} />
        </div>
        <div style={{ flex: 1, display: "grid", gap: 5 }}>
          {[
            { label: "Élève actif", color: "#10B981" },
            { label: "Inscription validée", color: accent },
            { label: `Année ${year}`, color: primary },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 9.5,
                fontWeight: 600,
                color: "#2C3E50",
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: s.color,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Check size={9} color="#fff" strokeWidth={3.5} />
              </span>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "8px 18px",
          background: headerGradient,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 8.5,
          fontWeight: 500,
        }}
      >
        <span className="flex items-center gap-1">
          <Shield size={10} /> Document officiel
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={10} /> {year}
        </span>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #F5F7FA 0%, #E8EEF5 100%)",
        fontFamily: font,
        padding: "32px 16px",
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1
            style={{
              fontFamily: font,
              fontSize: 32,
              fontWeight: 800,
              color: "#0F4C81",
              letterSpacing: "-0.02em",
            }}
          >
            Aperçu — Badge Élève
          </h1>
          <p style={{ color: "#2C3E50", opacity: 0.7, marginTop: 6, fontWeight: 500 }}>
            Style SaaS moderne · Poppins · Personnalisable par école
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr_auto] gap-10 items-start justify-items-center">
          {/* Customizer */}
          <Card className="p-6 w-full max-w-sm" style={{ fontFamily: font, borderRadius: 16 }}>
            <h3 className="font-bold mb-4" style={{ color: "#2C3E50" }}>
              Personnalisation école
            </h3>
            <div className="space-y-4">
              <div>
                <Label>Nom de l'école</Label>
                <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
              </div>
              <div>
                <Label>Sigle</Label>
                <Input value={schoolShort} onChange={(e) => setSchoolShort(e.target.value)} />
              </div>
              <div>
                <Label>Année académique</Label>
                <Input value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Bleu institutionnel</Label>
                  <Input
                    type="color"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                    className="h-10 p-1"
                  />
                </div>
                <div>
                  <Label>Bleu clair</Label>
                  <Input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-10 p-1"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 rounded-lg" style={{ background: "#F5F7FA", fontSize: 11 }}>
              <p style={{ color: "#2C3E50", fontWeight: 600, marginBottom: 6 }}>
                Palette par défaut
              </p>
              <div className="flex gap-2">
                {["#0F4C81", "#3A86FF", "#FFFFFF", "#F5F7FA", "#2C3E50"].map((c) => (
                  <div
                    key={c}
                    title={c}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: c,
                      border: "1px solid rgba(0,0,0,0.1)",
                    }}
                  />
                ))}
              </div>
            </div>
          </Card>

          {/* Badge */}
          <div>{Badge}</div>
        </div>
      </div>
    </div>
  );
};

export default BadgePreview;
