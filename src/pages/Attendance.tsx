import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Search, CheckCircle, XCircle, Clock, Loader2, QrCode } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { QRScanner } from "@/components/attendance/QRScanner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Employee {
  id: string;
  full_name: string;
  position_name: string;
  unit_name: string;
}

interface AttendanceRecord {
  id: string;
  profile_id: string;
  date: string;
  status: string;
  notes: string | null;
  employee_name: string;
}

const Attendance = () => {
  const navigate = useNavigate();
  const { organization, loading: orgLoading } = useOrganization();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  useEffect(() => {
    if (organization) {
      fetchEmployees();
      fetchAttendance();
    }
  }, [organization, selectedDate]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          positions (name),
          organizational_units (name)
        `)
        .eq("organization_id", organization!.id)
        .eq("approval_status", "approved")
        .order("full_name");

      if (error) throw error;

      const formattedEmployees = data?.map((emp: any) => ({
        id: emp.id,
        full_name: emp.full_name || "N/A",
        position_name: emp.positions?.name || "N/A",
        unit_name: emp.organizational_units?.name || "N/A",
      })) || [];

      setEmployees(formattedEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les employés",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id,
          profile_id,
          date,
          status,
          notes,
          profiles (full_name)
        `)
        .eq("organization_id", organization!.id)
        .eq("date", dateStr);

      if (error) throw error;

      const formattedAttendance = data?.map((att: any) => ({
        id: att.id,
        profile_id: att.profile_id,
        date: att.date,
        status: att.status,
        notes: att.notes,
        employee_name: att.profiles?.full_name || "N/A",
      })) || [];

      setAttendance(formattedAttendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const markAttendance = async (profileId: string, status: string) => {
    setMarkingAttendance(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const dateStr = format(selectedDate, "yyyy-MM-dd");

      // Check if attendance already exists
      const existing = attendance.find(a => a.profile_id === profileId);

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("attendance")
          .update({ status })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("attendance")
          .insert({
            profile_id: profileId,
            organization_id: organization!.id,
            date: dateStr,
            status,
            marked_by: user.id,
          });

        if (error) throw error;
      }

      toast({
        title: "Présence enregistrée",
        description: "La présence a été mise à jour avec succès",
      });

      fetchAttendance();
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la présence",
        variant: "destructive",
      });
    } finally {
      setMarkingAttendance(false);
    }
  };

  const handleQRScan = async (qrData: string) => {
    try {
      const data = JSON.parse(qrData);
      const { employeeId } = data;

      if (!employeeId) {
        toast({
          title: "QR Code invalide",
          description: "Le QR code scanné n'est pas valide",
          variant: "destructive",
        });
        return;
      }

      // Verify employee exists
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) {
        toast({
          title: "Employé non trouvé",
          description: "L'employé n'a pas été trouvé dans la base de données",
          variant: "destructive",
        });
        return;
      }

      // Mark attendance as present
      await markAttendance(employeeId, "present");
      
      setShowQRScanner(false);
      
      toast({
        title: "Pointage réussi",
        description: `Présence enregistrée pour ${employee.full_name}`,
      });
    } catch (error) {
      console.error("Error processing QR scan:", error);
      toast({
        title: "Erreur de scan",
        description: "Impossible de traiter le QR code",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
      present: { label: "Présent", variant: "default" },
      absent: { label: "Absent", variant: "destructive" },
      conge: { label: "Congé", variant: "secondary" },
      maladie: { label: "Maladie", variant: "outline" },
      retard: { label: "Retard", variant: "secondary" },
      permission: { label: "Permission", variant: "outline" },
    };

    const config = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getAttendanceStatus = (employeeId: string) => {
    const record = attendance.find(a => a.profile_id === employeeId);
    return record?.status;
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.unit_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestion de la Présence</h1>
        <Button onClick={() => setShowQRScanner(true)}>
          <QrCode className="mr-2 h-4 w-4" />
          Scanner QR Code
        </Button>
      </div>

      <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
        <DialogContent className="max-w-md">
          <QRScanner 
            onScanSuccess={handleQRScan}
            onClose={() => setShowQRScanner(false)}
          />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Pointage du {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un employé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Aucun employé trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => {
                    const currentStatus = getAttendanceStatus(employee.id);
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.full_name}</TableCell>
                        <TableCell>{employee.position_name}</TableCell>
                        <TableCell>{employee.unit_name}</TableCell>
                        <TableCell>
                          {currentStatus ? getStatusBadge(currentStatus) : <span className="text-muted-foreground">Non pointé</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Select
                              value={currentStatus}
                              onValueChange={(value) => markAttendance(employee.id, value)}
                              disabled={markingAttendance}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Marquer" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    Présent
                                  </div>
                                </SelectItem>
                                <SelectItem value="absent">
                                  <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    Absent
                                  </div>
                                </SelectItem>
                                <SelectItem value="retard">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-orange-600" />
                                    Retard
                                  </div>
                                </SelectItem>
                                <SelectItem value="conge">Congé</SelectItem>
                                <SelectItem value="maladie">Maladie</SelectItem>
                                <SelectItem value="permission">Permission</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
