import { useState } from "react";
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
import { Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalaryScale } from "@/hooks/useSalaryScale";
import { useOrganization } from "@/hooks/useOrganization";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SalaryScale() {
  const { t } = useLanguage();
  const { organization } = useOrganization();
  const {
    categories,
    positions,
    loading,
    createCategory,
    createPosition,
    deletePosition,
    deleteCategory,
  } = useSalaryScale(organization?.id);

  const [categoryName, setCategoryName] = useState("");
  const [positionName, setPositionName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [positionSalary, setPositionSalary] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);

  // Champs étendus (extension institutions / missions diplomatiques)
  const [positionCode, setPositionCode] = useState("");
  const [positionUnitId, setPositionUnitId] = useState("none");
  const [positionLevel, setPositionLevel] = useState("");
  const [reportsTo, setReportsTo] = useState("none");
  const [positionDescription, setPositionDescription] = useState("");
  const [positionResponsibilities, setPositionResponsibilities] = useState("");
  const [positionVacant, setPositionVacant] = useState(false);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!organization?.id) return;
    supabase
      .from("organizational_units")
      .select("id, name")
      .eq("organization_id", organization.id)
      .order("name")
      .then(({ data }) => setUnits(data || []));
  }, [organization?.id]);

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return;
    await createCategory(categoryName);
    setCategoryName("");
    setCategoryDialogOpen(false);
  };

  const handleCreatePosition = async () => {
    if (!positionName.trim() || !selectedCategory || !positionSalary) return;
    await createPosition(positionName, selectedCategory, parseFloat(positionSalary), {
      code: positionCode.trim() || null,
      unit_id: positionUnitId === "none" ? null : positionUnitId,
      level: positionLevel.trim() || null,
      reports_to_position_id: reportsTo === "none" ? null : reportsTo,
      description: positionDescription.trim() || null,
      responsibilities: positionResponsibilities.trim() || null,
      is_vacant: positionVacant,
    });
    setPositionName("");
    setSelectedCategory("");
    setPositionSalary("");
    setPositionCode("");
    setPositionUnitId("none");
    setPositionLevel("");
    setReportsTo("none");
    setPositionDescription("");
    setPositionResponsibilities("");
    setPositionVacant(false);
    setPositionDialogOpen(false);
  };


  const getPositionsByCategory = (categoryId: string) => {
    return positions.filter((p) => p.category_id === categoryId);
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grille Salariale</CardTitle>
        <CardDescription>
          Gérez les catégories d'employés et leurs postes avec les salaires associés
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
                  Ajoutez une nouvelle catégorie d'employés
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
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un Poste</DialogTitle>
                <DialogDescription>
                  Définissez le poste, son rattachement et son salaire
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position-name">Intitulé du poste</Label>
                    <Input
                      id="position-name"
                      value={positionName}
                      onChange={(e) => setPositionName(e.target.value)}
                      placeholder="Ex: Consul général"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position-code">Code du poste (optionnel)</Label>
                    <Input
                      id="position-code"
                      value={positionCode}
                      onChange={(e) => setPositionCode(e.target.value)}
                      placeholder="Ex: CG-001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Structure de rattachement (optionnel)</Label>
                    <Select value={positionUnitId} onValueChange={setPositionUnitId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Aucune" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position-level">Niveau hiérarchique (optionnel)</Label>
                    <Input
                      id="position-level"
                      value={positionLevel}
                      onChange={(e) => setPositionLevel(e.target.value)}
                      placeholder="Ex: Direction, Cadre, Exécution"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Supérieur hiérarchique (optionnel)</Label>
                  <Select value={reportsTo} onValueChange={setReportsTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {positions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div className="space-y-2">
                  <Label htmlFor="position-description">Description (optionnel)</Label>
                  <Textarea
                    id="position-description"
                    rows={2}
                    value={positionDescription}
                    onChange={(e) => setPositionDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position-resp">Responsabilités (optionnel)</Label>
                  <Textarea
                    id="position-resp"
                    rows={2}
                    value={positionResponsibilities}
                    onChange={(e) => setPositionResponsibilities(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="position-vacant" className="mb-0">
                    Poste vacant
                  </Label>
                  <Switch
                    id="position-vacant"
                    checked={positionVacant}
                    onCheckedChange={setPositionVacant}
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
            Aucune catégorie. Créez-en une pour commencer.
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
  );
}
