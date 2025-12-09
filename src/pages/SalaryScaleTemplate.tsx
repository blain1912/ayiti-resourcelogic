import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useSalaryScale } from "@/hooks/useSalaryScale";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";

export default function SalaryScaleTemplate() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const {
    categories,
    positions,
    loading: salaryLoading,
    createCategory,
    createPosition,
    deletePosition,
    deleteCategory,
  } = useSalaryScale(null, true); // isTemplate = true

  const [categoryName, setCategoryName] = useState("");
  const [positionName, setPositionName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [positionSalary, setPositionSalary] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: role } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .is("organization_id", null)
        .maybeSingle();

      if (!role) {
        navigate("/dashboard");
        return;
      }

      setIsSuperAdmin(true);
    } catch (error) {
      console.error("Error checking super admin:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return;
    await createCategory(categoryName);
    setCategoryName("");
    setCategoryDialogOpen(false);
  };

  const handleCreatePosition = async () => {
    if (!positionName.trim() || !selectedCategory || !positionSalary) return;
    await createPosition(positionName, selectedCategory, parseFloat(positionSalary));
    setPositionName("");
    setSelectedCategory("");
    setPositionSalary("");
    setPositionDialogOpen(false);
  };

  const getPositionsByCategory = (categoryId: string) => {
    return positions.filter((p) => p.category_id === categoryId);
  };

  if (loading || salaryLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/super-admin")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Grille Salariale Template</CardTitle>
            <CardDescription>
              Cette grille sera automatiquement copiée vers chaque nouvelle organisation approuvée
            </CardDescription>
            <div className="flex gap-2 mt-4">
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nouvelle Catégorie
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer une Catégorie</DialogTitle>
                    <DialogDescription>
                      Ajoutez une nouvelle catégorie d'employés au template
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="category-name">Nom de la catégorie</Label>
                      <Input
                        id="category-name"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="Ex: PERSONNEL DE DÉCISION"
                      />
                    </div>
                    <Button onClick={handleCreateCategory} className="w-full">
                      Créer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={positionDialogOpen} onOpenChange={setPositionDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nouveau Poste
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un Poste</DialogTitle>
                    <DialogDescription>
                      Ajoutez un nouveau poste avec son salaire au template
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="category-select">Catégorie</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position-name">Nom du poste</Label>
                      <Input
                        id="position-name"
                        value={positionName}
                        onChange={(e) => setPositionName(e.target.value)}
                        placeholder="Ex: Directeur"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salary">Salaire (HTG)</Label>
                      <Input
                        id="salary"
                        type="number"
                        step="0.01"
                        value={positionSalary}
                        onChange={(e) => setPositionSalary(e.target.value)}
                        placeholder="Ex: 86400.00"
                      />
                    </div>
                    <Button onClick={handleCreatePosition} className="w-full">
                      Créer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucune catégorie template. Créez-en une pour commencer.
              </p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {categories.map((category) => (
                  <AccordionItem key={category.id} value={category.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-semibold">{category.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCategory(category.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-4">
                        {getPositionsByCategory(category.id).map((position) => (
                          <div
                            key={position.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{position.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {position.salary.toLocaleString("fr-FR")} HTG
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePosition(position.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {getPositionsByCategory(category.id).length === 0 && (
                          <p className="text-sm text-muted-foreground py-2">
                            Aucun poste dans cette catégorie
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
