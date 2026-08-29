import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Camera, AlertTriangle, Clock } from "lucide-react";
import { QRScanner } from "@/components/attendance/QRScanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { parseSecureQrToken, PUNCH_TYPE_LABELS, type PunchType } from "@/lib/attendance";

interface PunchResult {
  employee_name: string | null;
  punch_type: PunchType;
  late_minutes: number;
  time: string;
}

const localParts = () => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    local_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    local_time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  };
};

export const PunchScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<PunchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (decoded: string) => {
    setScanning(false);
    setError(null);
    setResult(null);

    const token = parseSecureQrToken(decoded);
    if (!token) {
      setError("Ce QR code n'est pas un code de pointage GRHPro valide.");
      return;
    }

    setProcessing(true);
    try {
      const parts = localParts();
      const { data, error: fnError } = await supabase.functions.invoke("attendance-punch", {
        body: { token, ...parts },
      });

      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
        return;
      }

      setResult({
        employee_name: data.employee_name,
        punch_type: data.punch_type,
        late_minutes: data.late_minutes || 0,
        time: parts.local_time.slice(0, 5),
      });
      toast({
        title: "Pointage enregistré",
        description: `${PUNCH_TYPE_LABELS[data.punch_type as PunchType]} à ${parts.local_time.slice(0, 5)}`,
      });
    } catch (e: any) {
      setError(e.message || "Impossible d'enregistrer le pointage.");
    } finally {
      setProcessing(false);
    }
  };

  if (scanning) {
    return <QRScanner onScanSuccess={handleScan} onClose={() => setScanning(false)} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pointage par QR code</CardTitle>
        <CardDescription>
          Scannez le QR code central affiché sur site ou le QR individuel d'un agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">{result.employee_name || "Agent"}</span> —{" "}
              {PUNCH_TYPE_LABELS[result.punch_type]} enregistrée à {result.time}
              {result.late_minutes > 0 && (
                <span className="block text-destructive mt-1">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Retard de {result.late_minutes} minutes
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button className="w-full" onClick={() => setScanning(true)} disabled={processing}>
          <Camera className="h-4 w-4 mr-2" />
          {processing ? "Enregistrement..." : "Démarrer le scan"}
        </Button>
      </CardContent>
    </Card>
  );
};
