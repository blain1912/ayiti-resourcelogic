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
      const qrCodeScanner = new Html5Qrcode("qr-reader");
      scannerRef.current = qrCodeScanner;

      await qrCodeScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // Prevent multiple callbacks for the same scan
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          
          stopScanning();
          onScanSuccess(decodedText);
        },
        () => {
          // Silent error handling for continuous scanning
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la caméra",
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
