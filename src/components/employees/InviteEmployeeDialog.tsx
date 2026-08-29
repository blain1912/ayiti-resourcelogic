import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, RotateCcw, Ban, ShieldCheck, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_VARIANTS,
  effectiveAccountStatus,
} from "@/lib/accountStatus";

/** Rôles applicatifs attribuables (droits d'accès GRHPro — jamais déduits du poste). */
const ROLE_OPTIONS = [
  { value: "employe", label: "Employé" },
  { value: "secretaire", label: "Secrétaire" },
  { value: "secretaire_academique", label: "Secrétariat académique" },
  { value: "approbateur_conges", label: "Approbateur de congés" },
  { value: "directeur_rh", label: "Directeur RH" },
  { value: "directeur_administratif", label: "Directeur administratif" },
  { value: "directeur_general", label: "Directeur général" },
];

export interface InvitableProfile {
  id: string;
  full_name: string | null;
  email?: string | null;
  account_status?: string | null;
  invitation_expires_at?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: InvitableProfile | null;
  onDone?: () => void;
}

export function InviteEmployeeDialog({ open, onOpenChange, profile, onDone }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employe");
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [status, setStatus] = useState(
    effectiveAccountStatus(profile?.account_status, profile?.invitation_expires_at),
  );

  useEffect(() => {
    if (profile) {
      setEmail(profile.email || "");
      setStatus(effectiveAccountStatus(profile.account_status, profile.invitation_expires_at));
      setLink(null);
    }
  }, [profile]);

  const run = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!profile) return;
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("link-employee-account", {
        body: { action, profile_id: profile.id, ...extra },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.account_status) setStatus(effectiveAccountStatus(data.account_status));
      if (action === "invite" || action === "resend") {
        setLink(data.action_link || null);
        toast({
          title: "Invitation envoyée",
          description: data.email_sent
            ? `Un e-mail d'activation a été envoyé à ${email}.`
            : "E-mail non envoyé : copiez le lien d'activation ci-dessous.",
        });
      } else {
        toast({ title: "Opération effectuée" });
      }
      onDone?.();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const canInvite = status === "no_account" || status === "invitation_pending";
  const canResend = status === "invitation_sent" || status === "invitation_expired";
  const canRevoke = canResend;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setLink(null);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter l'agent à GRHPro</DialogTitle>
          <DialogDescription>
            Le profil agent de <strong>{profile?.full_name}</strong> reste unique : l'invitation crée
            ou rattache simplement un compte utilisateur, sans créer de doublon.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Statut du compte :</span>
          <Badge variant={ACCOUNT_STATUS_VARIANTS[status]}>{ACCOUNT_STATUS_LABELS[status]}</Badge>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-email">Adresse e-mail</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@exemple.com"
            disabled={status === "active" || status === "suspended"}
          />
        </div>

        {(canInvite || canResend) && (
          <div className="space-y-2">
            <Label>Rôle GRHPro (droits d'accès)</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Le rôle définit les droits dans GRHPro, indépendamment du poste occupé.
            </p>
          </div>
        )}

        {link && (
          <div className="space-y-1">
            <Label className="text-xs">Lien d'activation</Label>
            <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="text-xs" />
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>

          {canRevoke && (
            <Button variant="outline" onClick={() => run("revoke")} disabled={!!busy}>
              {busy === "revoke" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-1" />
              )}
              Révoquer
            </Button>
          )}

          {status === "active" && (
            <Button variant="destructive" onClick={() => run("suspend")} disabled={!!busy}>
              {busy === "suspend" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-1" />
              )}
              Suspendre
            </Button>
          )}

          {status === "suspended" && (
            <Button onClick={() => run("reactivate")} disabled={!!busy}>
              {busy === "reactivate" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-1" />
              )}
              Réactiver
            </Button>
          )}

          {(canInvite || canResend) && (
            <Button
              onClick={() => run(canResend ? "resend" : "invite", { email: email.trim(), role })}
              disabled={!!busy || !email.trim()}
            >
              {busy === "invite" || busy === "resend" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : canResend ? (
                <RotateCcw className="h-4 w-4 mr-1" />
              ) : (
                <Mail className="h-4 w-4 mr-1" />
              )}
              {canResend ? "Renvoyer l'invitation" : "Envoyer l'invitation"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
