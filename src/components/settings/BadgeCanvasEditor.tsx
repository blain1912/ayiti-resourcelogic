import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Rect, Circle, FabricText, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Square, 
  Circle as CircleIcon, 
  Type, 
  Image, 
  Trash2, 
  Save, 
  RotateCcw,
  Palette,
  Move
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "@/integrations/supabase/types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface BadgeCanvasEditorProps {
  organization: Organization;
  onSave: () => void;
}

const BADGE_WIDTH = 340;
const BADGE_HEIGHT = 540;

export const BadgeCanvasEditor = ({ organization, onSave }: BadgeCanvasEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState(organization.primary_color || "#1e3a5f");
  const [activeTool, setActiveTool] = useState<"select" | "rectangle" | "circle" | "text">("select");
  const [textInput, setTextInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: BADGE_WIDTH,
      height: BADGE_HEIGHT,
      backgroundColor: "#ffffff",
      selection: true,
    });

    // Add default badge background
    const bgGradient = new Rect({
      left: 0,
      top: 0,
      width: BADGE_WIDTH,
      height: BADGE_HEIGHT,
      selectable: false,
      evented: false,
    });
    bgGradient.set('fill', organization.primary_color || '#1e3a5f');
    canvas.add(bgGradient);

    // Add header zone
    const header = new Rect({
      left: 0,
      top: 0,
      width: BADGE_WIDTH,
      height: 80,
      fill: "rgba(255,255,255,0.95)",
      selectable: false,
      evented: false,
    });
    canvas.add(header);

    // Add organization name
    const orgName = new FabricText(organization.name || "Organisation", {
      left: BADGE_WIDTH / 2,
      top: 45,
      fontSize: 14,
      fontWeight: "bold",
      fill: organization.primary_color || '#1e3a5f',
      originX: "center",
      originY: "center",
      fontFamily: "Arial",
    });
    canvas.add(orgName);

    // Add photo placeholder
    const photoPlaceholder = new Rect({
      left: BADGE_WIDTH / 2 - 56,
      top: 100,
      width: 112,
      height: 144,
      fill: "rgba(255,255,255,0.9)",
      rx: 8,
      ry: 8,
      stroke: "rgba(255,255,255,0.5)",
      strokeWidth: 2,
    });
    canvas.add(photoPlaceholder);

    const photoLabel = new FabricText("PHOTO", {
      left: BADGE_WIDTH / 2,
      top: 172,
      fontSize: 12,
      fill: "#999999",
      originX: "center",
      originY: "center",
      fontFamily: "Arial",
    });
    canvas.add(photoLabel);

    // Add name placeholder
    const namePlaceholder = new FabricText("[Prénom Nom]", {
      left: BADGE_WIDTH / 2,
      top: 270,
      fontSize: 18,
      fontWeight: "bold",
      fill: "#ffffff",
      originX: "center",
      originY: "center",
      fontFamily: "Arial",
    });
    canvas.add(namePlaceholder);

    // Add position placeholder
    const positionPlaceholder = new FabricText("[Poste]", {
      left: BADGE_WIDTH / 2,
      top: 295,
      fontSize: 12,
      fill: "rgba(255,255,255,0.8)",
      originX: "center",
      originY: "center",
      fontFamily: "Arial",
    });
    canvas.add(positionPlaceholder);

    // Add QR placeholder
    const qrPlaceholder = new Rect({
      left: BADGE_WIDTH / 2 - 40,
      top: 420,
      width: 80,
      height: 80,
      fill: "#ffffff",
      rx: 8,
      ry: 8,
    });
    canvas.add(qrPlaceholder);

    const qrLabel = new FabricText("QR", {
      left: BADGE_WIDTH / 2,
      top: 460,
      fontSize: 14,
      fill: "#999999",
      originX: "center",
      originY: "center",
      fontFamily: "Arial",
    });
    canvas.add(qrLabel);

    // Add footer
    const footer = new Rect({
      left: 0,
      top: BADGE_HEIGHT - 30,
      width: BADGE_WIDTH,
      height: 30,
      fill: "rgba(0,0,0,0.2)",
      selectable: false,
      evented: false,
    });
    canvas.add(footer);

    canvas.renderAll();
    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [organization]);

  const addRectangle = useCallback(() => {
    if (!fabricCanvas) return;
    const rect = new Rect({
      left: 100,
      top: 200,
      fill: activeColor,
      width: 80,
      height: 40,
      rx: 4,
      ry: 4,
    });
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    fabricCanvas.renderAll();
  }, [fabricCanvas, activeColor]);

  const addCircle = useCallback(() => {
    if (!fabricCanvas) return;
    const circle = new Circle({
      left: 100,
      top: 200,
      fill: activeColor,
      radius: 30,
    });
    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    fabricCanvas.renderAll();
  }, [fabricCanvas, activeColor]);

  const addText = useCallback(() => {
    if (!fabricCanvas || !textInput.trim()) return;
    const text = new FabricText(textInput, {
      left: BADGE_WIDTH / 2,
      top: 350,
      fontSize: 14,
      fill: activeColor,
      originX: "center",
      fontFamily: "Arial",
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    setTextInput("");
  }, [fabricCanvas, textInput, activeColor]);

  const deleteSelected = useCallback(() => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    activeObjects.forEach(obj => {
      if (obj.selectable) {
        fabricCanvas.remove(obj);
      }
    });
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  const resetCanvas = useCallback(() => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    toast({
      title: "Canvas réinitialisé",
      description: "Le design a été effacé",
    });
  }, [fabricCanvas, toast]);

  const handleSave = async () => {
    if (!fabricCanvas) return;
    setIsSaving(true);

    try {
      const templateData = fabricCanvas.toJSON();
      
      const { error } = await supabase
        .from("badge_templates")
        .upsert({
          organization_id: organization.id,
          name: "Modèle personnalisé",
          template_data: templateData,
          is_default: true,
        } as any);

      if (error) throw error;

      // Update organization to use custom template
      await supabase
        .from("organizations")
        .update({ badge_template: "custom" } as any)
        .eq("id", organization.id);

      toast({
        title: "Modèle sauvegardé",
        description: "Votre design de badge personnalisé a été enregistré",
      });
      onSave();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="tools" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tools">Outils</TabsTrigger>
          <TabsTrigger value="properties">Propriétés</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTool === "select" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("select")}
            >
              <Move className="h-4 w-4 mr-1" />
              Sélection
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addRectangle}
            >
              <Square className="h-4 w-4 mr-1" />
              Rectangle
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addCircle}
            >
              <CircleIcon className="h-4 w-4 mr-1" />
              Cercle
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deleteSelected}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetCanvas}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Réinitialiser
            </Button>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Texte à ajouter</Label>
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Entrez le texte..."
                className="mt-1"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addText}
              disabled={!textInput.trim()}
            >
              <Type className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          <div>
            <Label>Couleur active</Label>
            <div className="flex gap-2 items-center mt-2">
              <Input
                type="color"
                value={activeColor}
                onChange={(e) => setActiveColor(e.target.value)}
                className="w-20 h-10 p-1 cursor-pointer"
              />
              <Input
                value={activeColor}
                onChange={(e) => setActiveColor(e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {[organization.primary_color, organization.secondary_color, organization.accent_color].filter(Boolean).map((color, i) => (
              <button
                key={i}
                className="w-8 h-8 rounded-full border-2 border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color || undefined }}
                onClick={() => setActiveColor(color!)}
                title={`Couleur ${i + 1}`}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="border rounded-lg p-4 bg-muted/30 flex justify-center overflow-auto">
        <div className="shadow-xl rounded-lg overflow-hidden">
          <canvas ref={canvasRef} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onSave()}>
          Annuler
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Sauvegarde..." : "Sauvegarder le modèle"}
        </Button>
      </div>
    </div>
  );
};
