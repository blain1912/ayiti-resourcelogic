import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);

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

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  const startScanning = async () => {
    hasScannedRef.current = false;

    try {
      const probe = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      probe.getTracks().forEach((t) => t.stop());
    } catch (err) {
      console.error("Camera permission error:", err);
      toast({
        title: "Accès caméra refusé",
        description: "Autorisez la caméra dans votre navigateur puis réessayez.",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    await new Promise((r) => setTimeout(r, 50));

    try {
      const qrCodeScanner = new Html5Qrcode("qr-reader");
      scannerRef.current = qrCodeScanner;

      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
      const onScan = (decodedText: string) => {
        if (hasScannedRef.current) return;
        hasScannedRef.current = true;
        stopScanning();
        onScanSuccess(decodedText);
      };

      try {
        await qrCodeScanner.start({ facingMode: "environment" }, config, onScan, () => {});
        return;
      } catch (e1) {
        console.warn("environment failed, enumerating cameras", e1);
      }

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) throw new Error("Aucune caméra détectée");
      const back =
        cameras.find((c) => /back|rear|environment|arrière/i.test(c.label)) ||
        cameras[cameras.length - 1];

      await qrCodeScanner.start(back.id, config, onScan, () => {});
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setIsScanning(false);
      toast({
        title: "Erreur caméra",
        description: err?.message || "Impossible de démarrer la caméra.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Scanner le QR Code</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            stopScanning();
            onClose();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
        
        {!isScanning && (
          <Button onClick={startScanning} className="w-full">
            <Camera className="mr-2 h-4 w-4" />
            Démarrer le scan
          </Button>
        )}

        {isScanning && (
          <Button onClick={stopScanning} variant="destructive" className="w-full">
            Arrêter le scan
          </Button>
        )}

        <p className="text-sm text-muted-foreground text-center">
          Positionnez le QR code de l'employé devant la caméra
        </p>
      </CardContent>
    </Card>
  );
};
