import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const ScanCentralQR = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<"success" | "error" | null>(null);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    fetchEmployeeData();
    return () => {
      stopScanning();
    };
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, organization_id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
        setEmployeeName(profile.full_name || "");
        setOrganizationId(profile.organization_id);
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
  };

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // Scanner might already be stopped
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  }, []);

  const processQRCode = async (decodedText: string) => {
    setIsProcessing(true);
    
    try {
      const data = JSON.parse(decodedText);
      
      // Validate QR code type
      if (data.type !== "central-attendance") {
        throw new Error("Code QR invalide");
      }

      // Validate organization
      if (data.organizationId !== organizationId) {
        throw new Error("Ce QR code n'appartient pas à votre organisation");
      }

      // Validate date
      const today = format(new Date(), "yyyy-MM-dd");
      if (data.date !== today) {
        throw new Error("Ce QR code a expiré");
      }

      if (!profileId || !organizationId) {
        throw new Error("Profil non trouvé");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Check if already marked today
      const { data: existingAttendance } = await supabase
        .from("attendance")
        .select("id, status")
        .eq("profile_id", profileId)
        .eq("date", today)
        .single();

      if (existingAttendance) {
        toast({
          title: "Déjà pointé",
          description: `Vous avez déjà pointé aujourd'hui (${existingAttendance.status})`,
        });
        setScanResult("success");
        return;
      }

      // Mark attendance
      const currentTime = format(new Date(), "HH:mm:ss");
      const { error } = await supabase
        .from("attendance")
        .insert({
          profile_id: profileId,
          organization_id: organizationId,
          date: today,
          status: "present",
          time: currentTime,
          marked_by: user.id,
          notes: "Pointage par QR code central",
        });

      if (error) throw error;

      setScanResult("success");
      toast({
        title: "Présence enregistrée",
        description: `Bonjour ${employeeName} ! Votre présence a été enregistrée à ${format(new Date(), "HH:mm", { locale: fr })}`,
      });

    } catch (error: any) {
      console.error("Error processing QR code:", error);
      setScanResult("error");
      toast({
        title: "Erreur",
        description: error.message || "Impossible de traiter le QR code",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startScanning = async () => {
    hasScannedRef.current = false;
    setScanResult(null);

    // 1) Forcer la demande de permission caméra (iOS Safari l'exige avant enumerateDevices)
    try {
      const probe = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      probe.getTracks().forEach((t) => t.stop());
    } catch (err: any) {
      console.error("Camera permission error:", err);
      toast({
        title: "Accès caméra refusé",
        description:
          "Autorisez la caméra dans les réglages de votre navigateur puis réessayez.",
        variant: "destructive",
      });
      return;
    }

    // 2) Marquer comme scanning AVANT pour que le <div> cible soit monté
    setIsScanning(true);
    await new Promise((r) => setTimeout(r, 50));

    try {
      const qrCodeScanner = new Html5Qrcode("central-qr-reader");
      scannerRef.current = qrCodeScanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const onScan = (decodedText: string) => {
        if (hasScannedRef.current) return;
        hasScannedRef.current = true;
        stopScanning();
        processQRCode(decodedText);
      };

      // 3) Essai : facingMode environment (ideal puis exact)
      try {
        await qrCodeScanner.start(
          { facingMode: "environment" },
          config,
          onScan,
          () => {}
        );
        return;
      } catch (e1) {
        console.warn("environment failed, enumerating cameras", e1);
      }

      // 4) Fallback : énumération + caméra arrière par nom
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error("Aucune caméra détectée");
      }
      const back =
        cameras.find((c) => /back|rear|environment|arrière/i.test(c.label)) ||
        cameras[cameras.length - 1];

      await qrCodeScanner.start(back.id, config, onScan, () => {});
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setIsScanning(false);
      toast({
        title: "Erreur caméra",
        description:
          err?.message ||
          "Impossible de démarrer la caméra. Vérifiez que vous êtes en HTTPS et que les permissions sont accordées.",
        variant: "destructive",
      });
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    hasScannedRef.current = false;
  };

  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Scanner pour Pointer</CardTitle>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {employeeName && (
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Connecté en tant que</p>
            <p className="font-semibold">{employeeName}</p>
          </div>
        )}

        {scanResult === "success" && (
          <div className="flex flex-col items-center space-y-4 p-6">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-lg font-medium text-center">Présence enregistrée !</p>
            <Button onClick={resetScanner} variant="outline">
              Scanner à nouveau
            </Button>
          </div>
        )}

        {scanResult === "error" && (
          <div className="flex flex-col items-center space-y-4 p-6">
            <XCircle className="h-16 w-16 text-destructive" />
            <p className="text-lg font-medium text-center">Échec du scan</p>
            <Button onClick={resetScanner} variant="outline">
              Réessayer
            </Button>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center space-y-4 p-6">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-lg font-medium text-center">Traitement en cours...</p>
          </div>
        )}

        {!scanResult && !isProcessing && (
          <>
            <div id="central-qr-reader" className="w-full rounded-lg overflow-hidden"></div>
            
            {!isScanning ? (
              <Button onClick={startScanning} className="w-full" size="lg">
                <Camera className="mr-2 h-5 w-5" />
                Démarrer le scan
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="destructive" className="w-full">
                Arrêter le scan
              </Button>
            )}

            <p className="text-sm text-muted-foreground text-center">
              Scannez le QR code de pointage affiché à l'entrée
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
