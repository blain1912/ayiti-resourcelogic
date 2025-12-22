import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Palette, Edit3, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BadgeCanvasEditor } from "./BadgeCanvasEditor";
import type { Database } from "@/integrations/supabase/types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface BadgeTemplateSelectorProps {
  organization: Organization;
  onUpdate: () => void;
}

const PREDEFINED_TEMPLATES = [
  {
    id: "classic",
    name: "Classique",
    description: "Design professionnel avec dégradé subtil",
    preview: {
      borderStyle: "solid",
      gradient: "linear-gradient(145deg, #1e3a5f, #2563eb)",
      headerBg: "white",
    }
  },
  {
    id: "modern",
    name: "Moderne",
    description: "Style épuré avec bordure dorée",
    preview: {
      borderStyle: "gold",
      gradient: "linear-gradient(180deg, #1a1a2e, #16213e)",
      headerBg: "white",
    }
  },
  {
    id: "elegant",
    name: "Élégant",
    description: "Design arrondi avec tons argentés",
    preview: {
      borderStyle: "silver",
      gradient: "linear-gradient(135deg, #2c3e50, #4ca1af)",
      headerBg: "white",
    }
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Style institutionnel formel",
    preview: {
      borderStyle: "solid",
      gradient: "linear-gradient(145deg, #0f2027, #203a43, #2c5364)",
      headerBg: "white",
    }
  },
  {
    id: "vibrant",
    name: "Vibrant",
    description: "Couleurs vives avec bordure dégradée",
    preview: {
      borderStyle: "gradient",
      gradient: "linear-gradient(145deg, #667eea, #764ba2)",
      headerBg: "white",
    }
  },
];

export const BadgeTemplateSelector = ({ organization, onUpdate }: BadgeTemplateSelectorProps) => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState((organization as any).badge_template || "classic");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplate(templateId);
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ badge_template: templateId } as any)
        .eq("id", organization.id);

      if (error) throw error;

      toast({
        title: "Modèle sélectionné",
        description: "Le modèle de badge a été mis à jour",
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Modèles de badge</CardTitle>
          </div>
          <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit3 className="h-4 w-4 mr-2" />
                Éditeur avancé
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Éditeur de badge personnalisé</DialogTitle>
              </DialogHeader>
              <BadgeCanvasEditor 
                organization={organization} 
                onSave={() => {
                  setIsEditorOpen(false);
                  onUpdate();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Choisissez un modèle prédéfini ou créez votre propre design
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PREDEFINED_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-lg ${
                selectedTemplate === template.id 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => handleSelectTemplate(template.id)}
            >
              {selectedTemplate === template.id && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="h-3 w-3" />
                </div>
              )}
              
              {/* Mini preview */}
              <div 
                className="w-full h-24 rounded-md mb-3 flex flex-col overflow-hidden"
                style={{ 
                  background: template.preview.gradient,
                  border: template.preview.borderStyle === 'gold' ? '2px solid #D4AF37' :
                          template.preview.borderStyle === 'silver' ? '2px solid #C0C0C0' :
                          template.preview.borderStyle === 'gradient' ? '2px solid transparent' :
                          '2px solid rgba(255,255,255,0.2)',
                  borderRadius: template.preview.borderStyle === 'rounded' ? '1rem' : '0.5rem',
                }}
              >
                <div className="bg-white/90 h-6 flex items-center justify-center">
                  <div className="w-4 h-4 bg-gray-300 rounded-full" />
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-1">
                  <div className="w-8 h-10 bg-white/20 rounded" />
                  <div className="w-12 h-2 bg-white/40 rounded" />
                </div>
                <div className="bg-black/20 h-4" />
              </div>
              
              <h4 className="font-medium text-sm">{template.name}</h4>
              <p className="text-xs text-muted-foreground">{template.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Utilisez l'éditeur avancé pour créer des badges totalement personnalisés avec Canvas
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
