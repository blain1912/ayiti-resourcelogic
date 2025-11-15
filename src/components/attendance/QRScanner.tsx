import { useEffect, useRef, useState } from "react";
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
  const [cameras, setCameras] = useState<any[]>([]);

  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices);
      }
    }).catch(err => {
      console.error("Error getting cameras:", err);
    });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
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
          onScanSuccess(decodedText);
          stopScanning();
        },
        (errorMessage) => {
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

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
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
