import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Palette, CreditCard } from "lucide-react";
import { LogoUpload } from "@/components/ui/logo-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  
  // Badge customization fields
  const [badgeHeaderText, setBadgeHeaderText] = useState((organization as any).badge_header_text || "");
  const [badgeFooterText, setBadgeFooterText] = useState((organization as any).badge_footer_text || "En cas de perte, veuillez contacter les RH");
  const [badgeBorderStyle, setBadgeBorderStyle] = useState((organization as any).badge_border_style || "solid");
  const [badgeValidityMonths, setBadgeValidityMonths] = useState((organization as any).badge_validity_months || 12);

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
          badge_header_text: badgeHeaderText || null,
          badge_footer_text: badgeFooterText || null,
          badge_border_style: badgeBorderStyle,
          badge_validity_months: badgeValidityMonths,
        } as any)
        .eq("id", organization.id);

      if (error) throw error;

      toast({
        title: "Personnalisation mise à jour",
        description: "Les couleurs, le logo et les paramètres du badge ont été sauvegardés",
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
          <p className="text-sm font-medium">Aperçu des couleurs</p>
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

        <Separator />

        {/* Badge Customization Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <h3 className="font-semibold">Personnalisation du badge</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Personnalisez l'apparence des badges employés de votre organisation
          </p>

          <div>
            <Label>Texte en-tête du badge</Label>
            <Input
              value={badgeHeaderText}
              onChange={(e) => setBadgeHeaderText(e.target.value)}
              placeholder="Ex: Ministère de la Culture"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Texte affiché sous le nom de l'organisation
            </p>
          </div>

          <div>
            <Label>Texte pied de page du badge</Label>
            <Input
              value={badgeFooterText}
              onChange={(e) => setBadgeFooterText(e.target.value)}
              placeholder="En cas de perte, veuillez contacter les RH"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Message affiché en bas du badge
            </p>
          </div>

          <div>
            <Label>Style de bordure</Label>
            <Select value={badgeBorderStyle} onValueChange={setBadgeBorderStyle}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Sélectionner un style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solide</SelectItem>
                <SelectItem value="rounded">Arrondi</SelectItem>
                <SelectItem value="gold">Doré</SelectItem>
                <SelectItem value="silver">Argenté</SelectItem>
                <SelectItem value="gradient">Dégradé</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Style de la bordure du badge
            </p>
          </div>

          <div>
            <Label>Durée de validité du badge</Label>
            <Select value={String(badgeValidityMonths)} onValueChange={(v) => setBadgeValidityMonths(Number(v))}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Sélectionner une durée" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 mois</SelectItem>
                <SelectItem value="12">1 an</SelectItem>
                <SelectItem value="24">2 ans</SelectItem>
                <SelectItem value="36">3 ans</SelectItem>
                <SelectItem value="60">5 ans</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              La date de validité sera calculée à partir de la date d'entrée en fonction de l'employé
            </p>
          </div>

          {/* Badge Preview */}
          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Aperçu du badge</p>
            <div 
              className="w-40 h-24 mx-auto rounded-lg flex flex-col items-center justify-center text-white text-xs"
              style={{ 
                background: `linear-gradient(145deg, ${primaryColor}, ${secondaryColor})`,
                border: badgeBorderStyle === 'gold' ? '3px solid #D4AF37' :
                        badgeBorderStyle === 'silver' ? '3px solid #C0C0C0' :
                        badgeBorderStyle === 'gradient' ? '3px solid transparent' :
                        '3px solid ' + primaryColor,
                borderRadius: badgeBorderStyle === 'rounded' ? '1rem' : '0.5rem',
                backgroundClip: badgeBorderStyle === 'gradient' ? 'padding-box, border-box' : undefined,
              }}
            >
              <span className="font-bold">{organization?.name || "Organisation"}</span>
              {badgeHeaderText && <span className="text-[10px] opacity-80">{badgeHeaderText}</span>}
              <span className="text-[8px] mt-2 opacity-70">{badgeFooterText || "Pied de page"}</span>
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