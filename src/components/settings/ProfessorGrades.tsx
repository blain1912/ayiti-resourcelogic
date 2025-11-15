import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useProfessorGrades, type ProfessorGrade } from "@/hooks/useProfessorGrades";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const GRADE_LABELS: Record<ProfessorGrade, string> = {
  assistant: "Assistant",
  adjoint: "Adjoint",
  associe: "Associé",
  titulaire: "Titulaire",
  emerite: "Émérite",
};

export function ProfessorGrades() {
  const { organization } = useOrganization();
  const { grades, loading, createGrade, updateGrade, deleteGrade } = useProfessorGrades(organization?.id);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    grade: "" as ProfessorGrade | "",
    salary: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.grade || !formData.salary) return;

    const success = editingGrade
      ? await updateGrade(editingGrade.id, parseFloat(formData.salary), formData.description)
      : await createGrade(formData.grade, parseFloat(formData.salary), formData.description);

    if (success) {
      setIsDialogOpen(false);
      setEditingGrade(null);
      setFormData({ grade: "", salary: "", description: "" });
    }
  };

  const handleEdit = (grade: any) => {
    setEditingGrade(grade);
    setFormData({
      grade: grade.grade,
      salary: grade.salary.toString(),
      description: grade.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteGrade(id);
  };

  const availableGrades = Object.keys(GRADE_LABELS).filter(
    (grade) => !grades.some((g) => g.grade === grade) || editingGrade?.grade === grade
  ) as ProfessorGrade[];

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Grille salariale des professeurs</CardTitle>
            <CardDescription>
              Gérez les grades et salaires des professeurs de votre institution
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingGrade(null);
              setFormData({ grade: "", salary: "", description: "" });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un grade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingGrade ? "Modifier le grade" : "Ajouter un grade"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade *</Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(value) => setFormData({ ...formData, grade: value as ProfessorGrade })}
                    disabled={!!editingGrade}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGrades.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {GRADE_LABELS[grade]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary">Salaire mensuel (HTG) *</Label>
                  <Input
                    id="salary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Informations additionnelles sur ce grade..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingGrade(null);
                      setFormData({ grade: "", salary: "", description: "" });
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingGrade ? "Modifier" : "Créer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {grades.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun grade de professeur configuré
          </p>
        ) : (
          <div className="space-y-3">
            {grades.map((grade) => (
              <div
                key={grade.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{GRADE_LABELS[grade.grade]}</h4>
                    <span className="text-sm text-muted-foreground">
                      ({grade.salary.toLocaleString()} HTG/mois)
                    </span>
                  </div>
                  {grade.description && (
                    <p className="text-sm text-muted-foreground mt-1">{grade.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(grade)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer ce grade ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(grade.id)}>
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
