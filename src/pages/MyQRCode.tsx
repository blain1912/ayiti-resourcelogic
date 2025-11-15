import { EmployeeQRCode } from "@/components/attendance/EmployeeQRCode";

const MyQRCode = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mon QR Code de Pointage</h1>
      </div>

      <div className="max-w-md mx-auto">
        <EmployeeQRCode />
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Comment utiliser mon QR Code ?</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-medium mb-1">Téléchargez votre QR Code</h3>
                <p className="text-muted-foreground">
                  Cliquez sur "Télécharger le QR Code" pour enregistrer votre code sur votre appareil
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-medium mb-1">Présentez-le pour pointer</h3>
                <p className="text-muted-foreground">
                  Montrez votre QR Code au responsable RH qui le scannera avec son appareil
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-medium mb-1">Confirmation instantanée</h3>
                <p className="text-muted-foreground">
                  Votre présence sera automatiquement enregistrée dans le système
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-background rounded-lg border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Gardez votre QR Code en sécurité. 
              Ne le partagez pas avec d'autres personnes car il est unique à votre profil.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyQRCode;
