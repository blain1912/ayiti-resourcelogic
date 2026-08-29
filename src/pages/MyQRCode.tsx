import { useEffect, useState } from "react";
import { EmployeeQRCode } from "@/components/attendance/EmployeeQRCode";
import { SecureAttendanceQR } from "@/components/attendance/SecureAttendanceQR";
import { AttendanceCorrections } from "@/components/attendance/AttendanceCorrections";
import { supabase } from "@/integrations/supabase/client";
import { useAttendanceSettings } from "@/hooks/useAttendanceConfig";

const MyQRCode = () => {
  const [profile, setProfile] = useState<{ id: string; organization_id: string | null } | null>(null);
  const { data: settings } = useAttendanceSettings(profile?.organization_id);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, organization_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile(data);
    };
    load();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mon QR Code de Pointage</h1>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {profile?.organization_id && settings?.individual_qr_enabled ? (
          <SecureAttendanceQR
            organizationId={profile.organization_id}
            scope="individual"
            profileId={profile.id}
            canManage
          />
        ) : (
          <EmployeeQRCode />
        )}
      </div>

      {profile?.organization_id && (
        <div className="max-w-3xl mx-auto">
          <AttendanceCorrections
            organizationId={profile.organization_id}
            profileId={profile.id}
          />
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Comment utiliser mon QR Code ?</h2>

          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-medium mb-1">Affichez votre QR Code</h3>
                <p className="text-muted-foreground">
                  Votre code personnel est sécurisé et ne contient aucune donnée personnelle
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
                  Votre présence est enregistrée avec l'heure exacte et le calcul du retard éventuel
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-background rounded-lg border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Gardez votre QR Code en sécurité.
              En cas de perte, régénérez-le : l'ancien code est immédiatement invalidé.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyQRCode;
