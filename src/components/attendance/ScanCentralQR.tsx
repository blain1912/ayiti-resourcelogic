import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck } from "lucide-react";

/**
 * NEUTRALISÉ (Phase 8).
 *
 * Cet ancien parcours enregistrait un pointage directement depuis le téléphone
 * de l'agent, avec l'heure de l'appareil et sans contrôle serveur.
 * Il est remplacé par la chaîne unique :
 *   QR -> PunchScanner -> Edge Function `attendance-punch` -> contrôles métier
 *   -> enregistrement -> audit.
 *
 * Le composant est conservé (et non supprimé) pour ne casser aucun import
 * existant, mais il n'effectue plus aucune écriture.
 */
export const ScanCentralQR = () => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Ancien pointage QR</CardTitle>
      <CardDescription>Ce mode de pointage n'est plus utilisé.</CardDescription>
    </CardHeader>
    <CardContent>
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          Le pointage passe désormais par le scanner sécurisé ci-dessus : l'heure et le lieu
          sont validés par le serveur.
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
);

export default ScanCentralQR;
