import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const EmployeeQRCode = () => {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>("");

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setEmployeeId(profile.id);
        setEmployeeName(profile.full_name || "");
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("employee-qr-code");
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
      downloadLink.download = `qr-code-${employeeName}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (!employeeId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  const qrValue = JSON.stringify({
    employeeId,
    timestamp: Date.now(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mon QR Code de Pointage</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="p-4 bg-white rounded-lg">
          <QRCodeSVG
            id="employee-qr-code"
            value={qrValue}
            size={256}
            level="H"
            includeMargin
          />
        </div>
        
        <div className="text-center space-y-2">
          <p className="font-medium">{employeeName}</p>
          <p className="text-sm text-muted-foreground">
            Présentez ce code pour pointer votre présence
          </p>
        </div>

        <Button onClick={downloadQRCode} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Télécharger le QR Code
        </Button>
      </CardContent>
    </Card>
  );
};
