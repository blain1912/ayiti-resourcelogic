import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Palette } from "lucide-react";
import { LogoUpload } from "@/components/ui/logo-upload";
import type { Database } from "@/integrations/supabase/types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface CustomizationSettingsProps {
  organization: Organization;
  onUpdate: () => void;
}

export const CustomizationSettings = ({ organization, onUpdate }: CustomizationSettingsProps) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [logoUrl, setLogoUrl] = useState(organization.logo_url || "");
  const [primaryColor, setPrimaryColor] = useState(organization.primary_color || "#0EA5E9");
  const [secondaryColor, setSecondaryColor] = useState(organization.secondary_color || "#8B5CF6");
  const [accentColor, setAccentColor] = useState(organization.accent_color || "#F59E0B");

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          logo_url: logoUrl || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
        })
        .eq("id", organization.id);

      if (error) throw error;

      toast({
        title: "Personnalisation mise à jour",
        description: "Les couleurs et le logo ont été sauvegardés",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          <CardTitle>Personnalisation</CardTitle>
        </div>
        <CardDescription>
          Personnalisez l'apparence de votre interface avec votre logo et vos couleurs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo */}
        <div className="space-y-2">
          <Label>Logo de l'organisation</Label>
          <LogoUpload 
            value={logoUrl} 
            onChange={setLogoUrl} 
            organizationId={organization.id}
          />
        </div>

        {/* Colors */}
        <div className="space-y-4">
          <div>
            <Label>Couleur primaire</Label>
            <div className="flex gap-2 items-center mt-2">
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-20 h-10 p-1 cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#0EA5E9"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Utilisée pour les boutons principaux et les éléments importants
            </p>
          </div>

          <div>
            <Label>Couleur secondaire</Label>
            <div className="flex gap-2 items-center mt-2">
              <Input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-20 h-10 p-1 cursor-pointer"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#8B5CF6"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Utilisée pour les éléments secondaires et les accents
            </p>
          </div>

          <div>
            <Label>Couleur d'accentuation</Label>
            <div className="flex gap-2 items-center mt-2">
              <Input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-20 h-10 p-1 cursor-pointer"
              />
              <Input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#F59E0B"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Utilisée pour les notifications et les éléments d'attention
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Aperçu</p>
          <div className="flex gap-2">
            <div 
              className="px-4 py-2 rounded text-white text-sm font-medium"
              style={{ backgroundColor: primaryColor }}
            >
              Bouton primaire
            </div>
            <div 
              className="px-4 py-2 rounded text-white text-sm font-medium"
              style={{ backgroundColor: secondaryColor }}
            >
              Bouton secondaire
            </div>
            <div 
              className="px-4 py-2 rounded text-white text-sm font-medium"
              style={{ backgroundColor: accentColor }}
            >
              Accent
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isUpdating} className="w-full">
          {isUpdating ? "Sauvegarde..." : "Sauvegarder la personnalisation"}
        </Button>
      </CardContent>
    </Card>
  );
};
