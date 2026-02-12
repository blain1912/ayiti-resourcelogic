import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Copy, Loader2, RefreshCw, FileText } from "lucide-react";

interface ProfileTextGeneratorProps {
  profile: any;
  organizationName?: string;
  positionName?: string;
  unitName?: string;
}

export function ProfileTextGenerator({ profile, organizationName, positionName, unitName }: ProfileTextGeneratorProps) {
  const [profileText, setProfileText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasCv, setHasCv] = useState(false);
  const [cvLoading, setCvLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      checkForCv();
    }
  }, [profile?.id]);

  const checkForCv = async () => {
    try {
      const { data } = await supabase
        .from("employee_documents")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("document_type", "cv")
        .limit(1);
      setHasCv((data?.length || 0) > 0);
    } catch (error) {
      console.error("Error checking for CV:", error);
    } finally {
      setCvLoading(false);
    }
  };

  const getCvContent = async (): Promise<string | null> => {
    try {
      // Get the CV document record
      const { data: docs } = await supabase
        .from("employee_documents")
        .select("file_url, file_name")
        .eq("profile_id", profile.id)
        .eq("document_type", "cv")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!docs || docs.length === 0) return null;

      const doc = docs[0];
      
      // Get a signed URL for the CV file
      const { data: urlData, error } = await supabase.storage
        .from("employee-documents")
        .createSignedUrl(doc.file_url, 300);

      if (error || !urlData?.signedUrl) return null;

      return urlData.signedUrl;
    } catch (error) {
      console.error("Error getting CV:", error);
      return null;
    }
  };

  const generateText = async () => {
    setLoading(true);
    try {
      let cvUrl: string | null = null;
      if (hasCv) {
        cvUrl = await getCvContent();
      }

      const { data, error } = await supabase.functions.invoke("generate-profile-text", {
        body: { profile, organizationName, positionName, unitName, cvUrl },
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
            {!cvLoading && hasCv && (
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <FileText className="h-4 w-4" />
                <span>Le CV de l'employé sera utilisé comme source complémentaire</span>
              </div>
            )}
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
