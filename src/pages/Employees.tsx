import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, MoreVertical } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Employees() {
  const { t } = useLanguage();

  const employees = [
    { id: 1, name: "Marie Jeanne Louis", position: "Directrice RH", department: "Ressources Humaines", status: "active" },
    { id: 2, name: "Jean Baptiste Pierre", position: "Comptable", department: "Finance", status: "active" },
    { id: 3, name: "Sophie Duvalsaint", position: "Assistante Administrative", department: "Administration", status: "active" },
    { id: 4, name: "Marc Antoine Joseph", position: "Chef de Service", department: "Opérations", status: "inactive" },
    { id: 5, name: "Claire Beaumont", position: "Analyste", department: "Planification", status: "active" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-2xl">{t("employeeList")}</CardTitle>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("addEmployee")}
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search")}
                className="pl-9"
              />
            </div>
            <Button variant="outline">{t("filter")}</Button>
            <Button variant="outline">{t("export")}</Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("position")}</TableHead>
                <TableHead>{t("department")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>
                    <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                      {employee.status === 'active' ? t("active") : t("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
