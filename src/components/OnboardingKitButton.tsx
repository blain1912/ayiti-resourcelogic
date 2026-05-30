import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadKit } from "@/utils/onboardingKit";

interface Props {
  organization: { name: string; type?: string | null; logo_url?: string | null };
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  label?: string;
}

export const OnboardingKitButton = ({
  organization,
  variant = "outline",
  size = "default",
  label = "Télécharger le kit d'onboarding",
}: Props) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!organization?.name) {
      toast.error("Organisation introuvable");
      return;
    }
    setLoading(true);
    try {
      await downloadKit(organization);
      toast.success("Kit téléchargé. Contient les PDF et le template Excel.");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du kit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
};
