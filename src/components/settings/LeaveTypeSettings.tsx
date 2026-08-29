import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus } from "lucide-react";
import { useLeaveTypes, useSaveLeaveType, useToggleLeaveType, type LeaveType } from "@/hooks/useLeaveTypes";

interface Props {
  organizationId?: string | null;
}

const emptyForm = {
  id: undefined as string | undefined,
  code: "",
  label: "",
  description: "",
  is_paid: true,
  requires_justification: false,
  max_duration_days: "",
  annual_entitlement_days: "",
  applicable_sexe: "all",
  allows_carry_over: false,
  display_order: 0,
};

export const LeaveTypeSettings = ({ organizationId }: Props) => {
  const { toast } = useToast();
  const { data: types = [], isLoading } = useLeaveTypes(organizationId, true);
  const saveType = useSaveLeaveType(organizationId);
  const toggleType = useToggleLeaveType(organizationId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setForm({ ...emptyForm, display_order: types.length + 1 });
    setOpen(true);
  };

  const openEdit = (type: LeaveType) => {
    setForm({
      id: type.id,
      code: type.code,
      label: type.label,
      description: type.description ?? "",
      is_paid: type.is_paid,
      requires_justification: type.requires_justification,
      max_duration_days: type.max_duration_days?.toString() ?? "",
      annual_entitlement_days: type.annual_entitlement_days?.toString() ?? "",
      applicable_sexe: type.applicable_sexe ?? "all",
      allows_carry_over: type.allows_carry_over,
      display_order: type.display_order,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.label.trim()) {
      toast({ title: "Champs requis", description: "Le code et le libellé sont obligatoires.", variant: "destructive" });
      return;
    }
    try {
      await saveType.mutateAsync({
        id: form.id,
        code: form.code.trim().toUpperCase(),
        label: form.label.trim(),
        description: form.description || null,
        is_paid: form.is_paid,
        requires_justification: form.requires_justification,
        max_duration_days: form.max_duration_days ? Number(form.max_duration_days) : null,
        annual_entitlement_days: form.annual_entitlement_days ? Number(form.annual_entitlement_days) : null,
        applicable_sexe: form.applicable_sexe === "all" ? null : form.applicable_sexe,
        allows_carry_over: form.allows_carry_over,
        display_order: Number(form.display_order) || 0,
      });
      toast({ title: "Enregistré", description: "Le type de congé a été enregistré." });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Enregistrement impossible",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Types de congé</CardTitle>
          <CardDescription>
            Référentiel administrable de votre institution : chaque type définit s'il est rémunéré,
            s'il exige un justificatif et le droit annuel correspondant.
          </CardDescription>
        </div>
        <Button onClick={openCreate} disabled={!organizationId}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau type
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : types.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun type de congé défini.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Rémunéré</TableHead>
                  <TableHead>Justificatif</TableHead>
                  <TableHead>Droit annuel</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-mono text-xs">{type.code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{type.label}</div>
                      {type.applicable_sexe && (
                        <Badge variant="outline" className="mt-1">
                          {type.applicable_sexe === "F" ? "Femmes" : "Hommes"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{type.is_paid ? "Oui" : "Non"}</TableCell>
                    <TableCell>{type.requires_justification ? "Requis" : "—"}</TableCell>
                    <TableCell>{type.annual_entitlement_days ?? "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={type.is_active}
                        onCheckedChange={(checked) =>
                          toggleType.mutate({ id: type.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(type)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Modifier le type de congé" : "Nouveau type de congé"}</DialogTitle>
            <DialogDescription>
              Les types désactivés restent visibles dans l'historique mais ne peuvent plus être demandés.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="CA"
                />
              </div>
              <div className="space-y-2">
                <Label>Ordre d'affichage</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Libellé</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Congé annuel"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Droit annuel (jours)</Label>
                <Input
                  type="number"
                  value={form.annual_entitlement_days}
                  onChange={(e) => setForm({ ...form, annual_entitlement_days: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Durée maximale (jours)</Label>
                <Input
                  type="number"
                  value={form.max_duration_days}
                  onChange={(e) => setForm({ ...form, max_duration_days: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sexe applicable</Label>
              <Select
                value={form.applicable_sexe}
                onValueChange={(value) => setForm({ ...form, applicable_sexe: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="F">Femmes</SelectItem>
                  <SelectItem value="M">Hommes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="is_paid">Congé rémunéré</Label>
              <Switch
                id="is_paid"
                checked={form.is_paid}
                onCheckedChange={(checked) => setForm({ ...form, is_paid: checked })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="requires_justification">Justificatif obligatoire</Label>
              <Switch
                id="requires_justification"
                checked={form.requires_justification}
                onCheckedChange={(checked) => setForm({ ...form, requires_justification: checked })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="allows_carry_over">Report autorisé sur l'année suivante</Label>
              <Switch
                id="allows_carry_over"
                checked={form.allows_carry_over}
                onCheckedChange={(checked) => setForm({ ...form, allows_carry_over: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saveType.isPending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LeaveTypeSettings;
