import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Camera, AlertTriangle, Clock, MapPin } from "lucide-react";
import { QRScanner } from "@/components/attendance/QRScanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { parseSecureQrToken, PUNCH_TYPE_LABELS, type PunchType } from "@/lib/attendance";
import { locationStatusLabel } from "@/lib/worksites";

interface PunchResult {
  employee_name: string | null;
  punch_type: PunchType;
  late_minutes: number;
  time: string;
  site: { id: string; name: string } | null;
  location_status: string | null;
  needs_review: boolean;
}

/**
 * Position demandée UNIQUEMENT au moment du pointage, jamais en arrière-plan
 * et jamais de façon continue (principe de minimisation).
 */
const requestPosition = () =>
  new Promise<{ latitude: number; longitude: number; accuracy: number } | null>((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

export const PunchScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<PunchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geoEnabled, setGeoEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile?.organization_id) return;
      const { data: settings } = await supabase
        .from("attendance_settings")
        .select("geo_control_enabled")
        .eq("organization_id", profile.organization_id)
        .maybeSingle();
      setGeoEnabled(Boolean((settings as { geo_control_enabled?: boolean } | null)?.geo_control_enabled));
    };
    load();
  }, []);

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
      const position = geoEnabled ? await requestPosition() : null;

      // L'heure officielle est calculée par le serveur ; l'heure de l'appareil
      // n'est transmise qu'à titre technique.
      const { data, error: fnError } = await supabase.functions.invoke("attendance-punch", {
        body: {
          token,
          device_time: new Date().toISOString(),
          ...(position ?? {}),
        },
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
        time: (data.time || "").slice(0, 5),
        site: data.site ?? null,
        location_status: data.location_status ?? null,
        needs_review: Boolean(data.needs_review),
      });
      toast({
        title: "Pointage enregistré",
        description: `${PUNCH_TYPE_LABELS[data.punch_type as PunchType]} à ${(data.time || "").slice(0, 5)}`,
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
          L'heure enregistrée est celle du serveur.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">{result.employee_name || "Agent"}</span> —{" "}
              {PUNCH_TYPE_LABELS[result.punch_type]} enregistrée à {result.time}
              {result.site && (
                <span className="block text-muted-foreground mt-1">
                  <MapPin className="inline h-3 w-3 mr-1" />
                  {result.site.name}
                  {result.location_status ? ` — ${locationStatusLabel(result.location_status)}` : ""}
                </span>
              )}
              {result.needs_review && (
                <span className="block text-amber-600 mt-1">
                  Pointage marqué à vérifier par le service RH (hors zone autorisée).
                </span>
              )}
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

        {geoEnabled && (
          <p className="text-xs text-muted-foreground">
            <MapPin className="inline h-3 w-3 mr-1" />
            Votre organisation vérifie le lieu de pointage : la localisation est demandée
            uniquement au moment du scan, jamais en arrière-plan.
          </p>
        )}

        <Button className="w-full" onClick={() => setScanning(true)} disabled={processing}>
          <Camera className="h-4 w-4 mr-2" />
          {processing ? "Enregistrement..." : "Démarrer le scan"}
        </Button>
      </CardContent>
    </Card>
  );
};
