import { ScanCentralQR } from "@/components/attendance/ScanCentralQR";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { Link } from "react-router-dom";

const ScanAttendance = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Pointer ma Présence</h1>
        <p className="text-muted-foreground">
          Scannez le QR code de pointage affiché à l'entrée
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <ScanCentralQR />
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Comment ça marche ?</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-medium mb-1">Trouvez le QR code</h3>
                <p className="text-muted-foreground">
                  Un QR code de pointage est affiché à l'entrée de votre lieu de travail
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-medium mb-1">Lancez le scanner</h3>
                <p className="text-muted-foreground">
                  Appuyez sur "Démarrer le scan" et autorisez l'accès à la caméra
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-medium mb-1">Scannez le code</h3>
                <p className="text-muted-foreground">
                  Pointez votre caméra vers le QR code pour enregistrer votre présence
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-background rounded-lg border flex items-start gap-3">
            <QrCode className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm">
                <strong className="text-foreground">Vous avez aussi un QR code personnel</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Si votre organisation utilise le système de badge, vous pouvez aussi utiliser votre QR code personnel.
              </p>
              <Button asChild variant="link" className="p-0 h-auto mt-2">
                <Link to="/my-qr-code">Voir mon QR code personnel</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanAttendance;
