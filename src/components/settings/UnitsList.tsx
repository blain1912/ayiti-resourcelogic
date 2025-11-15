import { useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import UnitForm from "./UnitForm";

interface UnitsListProps {
  units: any[];
  onUpdate: () => void;
}

const UnitsList = ({ units, onUpdate }: UnitsListProps) => {
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [deletingUnit, setDeletingUnit] = useState<any>(null);
  const { toast } = useToast();
  const { language } = useLanguage();

  const unitTypes = {
    direction_generale: language === "fr" ? "Direction Générale" : "General Directorate",
    direction_technique: language === "fr" ? "Direction Technique" : "Technical Directorate",
    service: language === "fr" ? "Service" : "Service",
    section: language === "fr" ? "Section" : "Section",
    departement: language === "fr" ? "Département" : "Department",
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("organizational_units")
        .delete()
        .eq("id", deletingUnit.id);

      if (error) throw error;

      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: language === "fr" ? "Structure supprimée" : "Unit deleted",
      });

      setDeletingUnit(null);
      onUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
      });
    }
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return "-";
    const parent = units.find(u => u.id === parentId);
    return parent?.name || "-";
  };

  if (units.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {language === "fr" 
          ? "Aucune structure administrative créée" 
          : "No administrative units created"}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {units.map((unit) => (
          <div
            key={unit.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex-1">
              <h4 className="font-medium">{unit.name}</h4>
              <p className="text-sm text-muted-foreground">
                {unitTypes[unit.type as keyof typeof unitTypes]} • {language === "fr" ? "Parent:" : "Parent:"} {getParentName(unit.parent_id)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingUnit(unit)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeletingUnit(unit)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editingUnit} onOpenChange={() => setEditingUnit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "fr" ? "Modifier la structure" : "Edit Unit"}
            </DialogTitle>
          </DialogHeader>
          {editingUnit && (
            <UnitForm
              organizationId={editingUnit.organization_id}
              units={units}
              unitId={editingUnit.id}
              defaultValues={{
                name: editingUnit.name,
                type: editingUnit.type,
                parent_id: editingUnit.parent_id || "",
              }}
              onSuccess={() => {
                setEditingUnit(null);
                onUpdate();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingUnit} onOpenChange={() => setDeletingUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "fr" ? "Confirmer la suppression" : "Confirm Deletion"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "fr" 
                ? "Êtes-vous sûr de vouloir supprimer cette structure ? Cette action est irréversible." 
                : "Are you sure you want to delete this unit? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "fr" ? "Annuler" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {language === "fr" ? "Supprimer" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UnitsList;
