import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FileCheck2, Plus, Power } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import {
  useDeleteRequiredDocument,
  useRequiredDocuments,
  useSaveRequiredDocument,
  type RequiredDocument,
} from "@/hooks/useRequiredDocuments";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_TYPES,
  documentCategoryLabel,
  documentTypeLabel,
} from "@/lib/careerTypes";

const emptyForm = {
  id: undefined as string | undefined,
  label: "",
  category: "identite",
  document_type: "",
  is_mandatory: true,
  applies_to_category: "",
  requires_expiry: false,
  is_active: true,
  display_order: 0,
};

export default function RequiredDocuments() {
  const { organization } = useOrganization();
  const { data: items = [], isLoading } = useRequiredDocuments(organization?.id);
  const save = useSaveRequiredDocument(organization?.id);
  const deactivate = useDeleteRequiredDocument();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const openNew = () => {
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (item: RequiredDocument) => {
    setForm({
      id: item.id,
      label: item.label,
      category: item.category,
      document_type: item.document_type || "",
      is_mandatory: item.is_mandatory,
      applies_to_category: item.applies_to_category || "",
      requires_expiry: item.requires_expiry,
      is_active: item.is_active,
      display_order: item.display_order,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.label.trim()) {
      toast({ title: "Libellé requis", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({
        ...form,
        document_type: form.document_type || null,
        applies_to_category: form.applies_to_category || null,
      });
      toast({ title: "Enregistré", description: "Référentiel mis à jour." });
      setOpen(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileCheck2 className="h-7 w-7" />
            Documents requis
          </h1>
          <p className="text-muted-foreground">
            Définissez les pièces attendues au dossier administratif des agents de votre institution.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une pièce
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Référentiel de l'institution</CardTitle>
          <CardDescription>
            La complétude du dossier de chaque agent est calculée à partir de ce référentiel.
            Aucune liste n'est imposée par défaut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucune pièce définie. La complétude ne sera pas calculée tant que ce référentiel est vide.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pièce</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Type attendu</TableHead>
                    <TableHead>Portée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className={item.is_active ? undefined : "opacity-60"}>
                      <TableCell className="font-medium">
                        {item.label}
                        {item.requires_expiry && (
                          <Badge variant="outline" className="ml-2 text-xs">Expiration requise</Badge>
                        )}
                      </TableCell>
                      <TableCell>{documentCategoryLabel(item.category)}</TableCell>
                      <TableCell>{item.document_type ? documentTypeLabel(item.document_type) : "Tous"}</TableCell>
                      <TableCell>{item.applies_to_category || "Tous les agents"}</TableCell>
                      <TableCell>
                        <Badge variant={item.is_mandatory ? "default" : "secondary"}>
                          {item.is_mandatory ? "Obligatoire" : "Facultatif"}
                        </Badge>
                        {!item.is_active && <Badge variant="outline" className="ml-2">Inactif</Badge>}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          Modifier
                        </Button>
                        {item.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deactivate.mutate(item.id)}
                            title="Désactiver"
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Modifier la pièce" : "Nouvelle pièce requise"}</DialogTitle>
            <DialogDescription>
              Chaque institution définit ses propres exigences documentaires.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Libellé</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ex. Copie de la CIN"
              />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type de document attendu (facultatif)</Label>
              <Select
                value={form.document_type}
                onValueChange={(v) => setForm((f) => ({ ...f, document_type: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Tout document de la catégorie" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {DOCUMENT_TYPES.filter((t) => t.category === form.category).map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie d'agents concernée (facultatif)</Label>
              <Input
                value={form.applies_to_category}
                onChange={(e) => setForm((f) => ({ ...f, applies_to_category: e.target.value }))}
                placeholder="Laisser vide pour tous les agents"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Pièce obligatoire</Label>
              <Switch
                checked={form.is_mandatory}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_mandatory: v }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Date d'expiration exigée</Label>
              <Switch
                checked={form.requires_expiry}
                onCheckedChange={(v) => setForm((f) => ({ ...f, requires_expiry: v }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Actif</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={save.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
