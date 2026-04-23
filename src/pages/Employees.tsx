import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, MoreVertical, Eye, Trash2, FileText, Upload } from "lucide-react";
import enartsPayload from "@/data/enartsImportPayload.json";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { toast } from "@/hooks/use-toast";
import { useProfessorGrades } from "@/hooks/useProfessorGrades";
import { generateBlankEmployeeForm } from "@/lib/generateBlankEmployeeForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Employee {
  id: string;
  full_name: string | null;
  position_name: string | null;
  position_salary: number | null;
  unit_name: string | null;
}

export default function Employees() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [units, setUnits] = useState<Array<{ id: string; name: string; type?: string; parent_id?: string | null }>>([]);
  const [positions, setPositions] = useState<Array<{ id: string; name: string; salary: number }>>([]);
  const { grades: professorGrades } = useProfessorGrades(organization?.id);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  useEffect(() => {
    if (organization?.id) {
      fetchEmployees();
      fetchUnits();
      fetchPositions();
    }
  }, [organization]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          position:positions(name, salary),
          unit:organizational_units(name)
        `)
        .eq("organization_id", organization!.id);

      if (error) throw error;

      const formattedEmployees: Employee[] = (data || []).map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name,
        position_name: profile.position?.name || null,
        position_salary: profile.position?.salary || null,
        unit_name: profile.unit?.name || null,
      }));

      setEmployees(formattedEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from("organizational_units")
        .select("id, name, type, parent_id")
        .eq("organization_id", organization!.id)
        .order("name");

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error("Error fetching units:", error);
    }
  };

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from("positions")
        .select("id, name, salary")
        .eq("organization_id", organization!.id)
        .order("name");

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error("Error fetching positions:", error);
    }
  };

  const handleCreateEmployee = async (formData: any) => {
    try {
      const { error } = await supabase.from("profiles").insert({
        ...formData,
        organization_id: organization!.id,
        full_name: `${formData.prenom} ${formData.nom}`,
      });

      if (error) throw error;

      toast({
        title: "Employé créé",
        description: "L'employé a été créé avec succès",
      });

      setIsDialogOpen(false);
      fetchEmployees();
    } catch (error: any) {
      console.error("Error creating employee:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", employeeToDelete.id);

      if (error) throw error;

      toast({
        title: "Employé supprimé",
        description: `${employeeToDelete.full_name || "L'employé"} a été supprimé avec succès`,
      });
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
      fetchEmployees();
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer cet employé",
        variant: "destructive",
      });
    }
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.unit_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-2xl">{t("employeeList")}</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("addEmployee")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Ajouter un employé</DialogTitle>
                </DialogHeader>
                <EmployeeForm
                  onSubmit={handleCreateEmployee}
                  units={units}
                  positions={positions}
                  professorGrades={professorGrades}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search")}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">{t("filter")}</Button>
            <Button variant="outline">{t("export")}</Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => generateBlankEmployeeForm(organization?.name)}
            >
              <FileText className="h-4 w-4" />
              Fiche vierge PDF
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("position")}</TableHead>
                <TableHead>Salaire</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun employé trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.full_name || "Non renseigné"}
                    </TableCell>
                    <TableCell>{employee.position_name || "-"}</TableCell>
                    <TableCell>
                      {employee.position_salary 
                        ? `${employee.position_salary.toLocaleString("fr-FR")} HTG`
                        : "-"}
                    </TableCell>
                    <TableCell>{employee.unit_name || "-"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/employee/${employee.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir le profil
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setEmployeeToDelete(employee);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{employeeToDelete?.full_name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
