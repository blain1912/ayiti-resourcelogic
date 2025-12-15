import { CentralQRCode } from "@/components/attendance/CentralQRCode";

const CentralQRDisplay = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">QR Code de Pointage</h1>
        <p className="text-muted-foreground">
          Affichez ce QR code à l'entrée pour que les employés puissent pointer
        </p>
      </div>

      <div className="max-w-lg mx-auto">
        <CentralQRCode />
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Instructions</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-medium mb-1">Affichage</h3>
                <p className="text-muted-foreground">
                  Affichez ce QR code sur un écran ou imprimez-le et placez-le à l'entrée du bureau
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-medium mb-1">Scan par les employés</h3>
                <p className="text-muted-foreground">
                  Les employés scannent ce code depuis leur page "Pointer ma présence" dans l'application
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-medium mb-1">Enregistrement automatique</h3>
                <p className="text-muted-foreground">
                  La présence est automatiquement enregistrée avec l'heure exacte
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-background rounded-lg border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Le QR code est régénéré chaque jour pour des raisons de sécurité. 
              Pensez à rafraîchir l'affichage quotidiennement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CentralQRDisplay;
