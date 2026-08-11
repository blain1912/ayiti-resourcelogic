import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: { id: string; full_name: string | null } | null;
  onDone?: () => void;
}

export function InviteEmployeeDialog({ open, onOpenChange, profile, onDone }: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!profile) return;
    setSending(true);
    setLink(null);
    try {
      const { data, error } = await supabase.functions.invoke("link-employee-account", {
        body: { action: "invite", profile_id: profile.id, email: email.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLink(data.action_link || null);
      toast({
        title: "Invitation prête",
        description: data.email_sent
          ? `Un e-mail d'activation a été envoyé à ${email}.`
          : "E-mail non envoyé : copiez le lien d'activation ci-dessous.",
      });
      onDone?.();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setEmail(""); setLink(null); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter l'employé à se connecter</DialogTitle>
          <DialogDescription>
            Définissez l'adresse e-mail réelle de <strong>{profile?.full_name}</strong>. Elle remplacera
            l'adresse technique et l'employé recevra un lien pour créer son mot de passe — sans créer de
            doublon.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="invite-email">Adresse e-mail</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@exemple.com"
          />
        </div>

        {link && (
          <div className="space-y-1">
            <Label className="text-xs">Lien d'activation</Label>
            <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="text-xs" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={handleInvite} disabled={sending || !email.trim()}>
            {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
            Envoyer l'invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
