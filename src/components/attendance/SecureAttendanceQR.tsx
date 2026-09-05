import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ShieldOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { buildSecureQrValue } from "@/lib/attendance";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkSites } from "@/hooks/useWorkSites";
import {
  useAttendanceQrTokens,
  useRegenerateQrToken,
  useRevokeQrToken,
} from "@/hooks/useAttendanceConfig";

interface SecureAttendanceQRProps {
  organizationId: string;
  scope: "central" | "individual";
  profileId?: string | null;
  title?: string;
  description?: string;
  /** Autorise la régénération / révocation (RH, admin) */
  canManage?: boolean;
  size?: number;
}

export const SecureAttendanceQR = ({
  organizationId,
  scope,
  profileId = null,
  title,
  description,
  canManage = false,
  size = 260,
}: SecureAttendanceQRProps) => {
  const { data: tokens, isLoading } = useAttendanceQrTokens(organizationId, scope);
  const { data: sites } = useWorkSites(organizationId, true);
  const [siteId, setSiteId] = useState<string>("none");
  const regenerate = useRegenerateQrToken(organizationId);
  const revoke = useRevokeQrToken();

  const activeToken = useMemo(
    () =>
      (tokens || []).find(
        (t) =>
          t.status === "active" &&
          (scope === "individual" ? t.profile_id === profileId : t.profile_id === null)
      ) || null,
    [tokens, scope, profileId]
  );

  const handleRegenerate = () => {
    regenerate.mutate(
      { scope, profileId, siteId: siteId === "none" ? null : siteId },
      {
        onSuccess: () =>
          toast({
            title: "QR code régénéré",
            description: "L'ancien code est immédiatement invalidé.",
          }),
        onError: (e: any) =>
          toast({ title: "Erreur", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleRevoke = () => {
    if (!activeToken) return;
    revoke.mutate(activeToken.id, {
      onSuccess: () => toast({ title: "QR code révoqué" }),
      onError: (e: any) =>
        toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{title || (scope === "central" ? "QR code central" : "Mon QR code de pointage")}</CardTitle>
            <CardDescription>
              {description ||
                (scope === "central"
                  ? "À afficher à l'entrée. Le code ne contient aucune donnée personnelle."
                  : "Code personnel sécurisé. Ne le partagez pas.")}
            </CardDescription>
          </div>
          <Badge variant={activeToken ? "default" : "secondary"}>
            {activeToken ? "Actif" : "Aucun code"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : activeToken ? (
          <div className="p-5 bg-card rounded-xl border-4 border-primary/20 shadow-lg">
            <QRCodeSVG
              value={buildSecureQrValue(activeToken.token)}
              size={size}
              level="H"
              includeMargin
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            Aucun QR code actif. {canManage ? "Générez-en un ci-dessous." : "Contactez votre service RH."}
          </p>
        )}

        {canManage && scope === "central" && (
          <div className="w-full max-w-xs space-y-2">
            <Label>Site rattaché à ce QR code</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger>
                <SelectValue placeholder="Aucun site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun site</SelectItem>
                {(sites || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Le site est appliqué lors de la génération du code : QR -> site -> organisation ->
              validation serveur.
            </p>
          </div>
        )}

        {canManage && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={handleRegenerate} disabled={regenerate.isPending}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {activeToken ? "Régénérer" : "Générer"}
            </Button>
            {activeToken && (
              <Button variant="outline" onClick={handleRevoke} disabled={revoke.isPending}>
                <ShieldOff className="h-4 w-4 mr-2" />
                Révoquer
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
