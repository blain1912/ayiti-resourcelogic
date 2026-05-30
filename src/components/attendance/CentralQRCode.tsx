import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const CentralQRCode = () => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [dailyCode, setDailyCode] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchOrganizationData();
    generateDailyCode();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);

        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", profile.organization_id)
          .single();

        if (org) {
          setOrganizationName(org.name);
        }
      }
    } catch (error) {
      console.error("Error fetching organization data:", error);
    }
  };

  const generateDailyCode = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const randomPart = Math.random().toString(36).substring(2, 8);
    setDailyCode(`${today}-${randomPart}`);
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("central-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-pointage-${organizationName}-${format(new Date(), "yyyy-MM-dd")}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  if (!organizationId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  const qrValue = JSON.stringify({
    type: "central-attendance",
    organizationId,
    dailyCode,
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  return (
    <Card className={isFullscreen ? "fixed inset-0 z-50 rounded-none flex flex-col items-center justify-center bg-background" : ""}>
      <CardHeader className="text-center">
        <CardTitle className={isFullscreen ? "text-3xl" : ""}>
          QR Code de Pointage Central
        </CardTitle>
        <p className={`text-muted-foreground capitalize ${isFullscreen ? "text-xl" : "text-sm"}`}>
          {today}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        <div className="p-8 bg-white rounded-2xl shadow-2xl border-4 border-primary/20">
          <QRCodeSVG
            id="central-qr-code"
            value={qrValue}
            size={isFullscreen ? 480 : 320}
            level="H"
            includeMargin
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>
        
        <div className="text-center space-y-2">
          <p className={`font-semibold ${isFullscreen ? "text-2xl" : "text-lg"}`}>
            {organizationName}
          </p>
          <p className={`text-muted-foreground ${isFullscreen ? "text-lg" : "text-sm"}`}>
            Scannez ce code pour pointer votre présence
          </p>
        </div>

        {!isFullscreen && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={toggleFullscreen} variant="outline">
              <Monitor className="mr-2 h-4 w-4" />
              Plein écran
            </Button>
            <Button onClick={generateDailyCode} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Régénérer
            </Button>
            <Button onClick={downloadQRCode} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
          </div>
        )}

        {isFullscreen && (
          <Button onClick={toggleFullscreen} variant="outline" size="lg">
            Quitter le plein écran
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
