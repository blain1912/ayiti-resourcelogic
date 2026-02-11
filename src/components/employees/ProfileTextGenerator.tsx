import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Copy, Loader2, RefreshCw } from "lucide-react";

interface ProfileTextGeneratorProps {
  profile: any;
  organizationName?: string;
  positionName?: string;
  unitName?: string;
}

export function ProfileTextGenerator({ profile, organizationName, positionName, unitName }: ProfileTextGeneratorProps) {
  const [profileText, setProfileText] = useState("");
  const [loading, setLoading] = useState(false);

  const generateText = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-profile-text", {
        body: { profile, organizationName, positionName, unitName },
      });

      if (error) throw error;
      setProfileText(data.profileText);
    } catch (error: any) {
      console.error("Error generating profile text:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le texte du profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileText);
    toast({ title: "Copié", description: "Le texte a été copié dans le presse-papiers" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Texte de profil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!profileText ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Générez automatiquement un texte de profil professionnel à partir des informations de l'employé.
            </p>
            <Button onClick={generateText} disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Génération en cours...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Générer le texte du profil</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              rows={8}
              className="resize-y"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" /> Copier
              </Button>
              <Button variant="outline" size="sm" onClick={generateText} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Régénérer
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
