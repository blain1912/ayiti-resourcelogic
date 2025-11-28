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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Search, CheckCircle, XCircle, Clock, Loader2, QrCode, Users, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { QRScanner } from "@/components/attendance/QRScanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  time: string | null;
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
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<{ id: string; name: string } | null>(null);
  const [notes, setNotes] = useState("");

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
          time,
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
        time: att.time,
        employee_name: att.profiles?.full_name || "N/A",
      })) || [];

      setAttendance(formattedAttendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const markAttendance = async (profileId: string, status: string, attendanceNotes?: string) => {
    setMarkingAttendance(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const currentTime = format(new Date(), "HH:mm:ss");

      // Check if attendance already exists
      const existing = attendance.find(a => a.profile_id === profileId);

      if (existing) {
        // Update existing record
        const updateData: any = { status, time: currentTime };
        if (attendanceNotes !== undefined) {
          updateData.notes = attendanceNotes;
        }
        
        const { error } = await supabase
          .from("attendance")
          .update(updateData)
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
            time: currentTime,
            notes: attendanceNotes || null,
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

  const openNotesDialog = (employeeId: string, employeeName: string) => {
    setCurrentEmployee({ id: employeeId, name: employeeName });
    const existingRecord = attendance.find(a => a.profile_id === employeeId);
    setNotes(existingRecord?.notes || "");
    setShowNotesDialog(true);
  };

  const saveWithNotes = async (status: string) => {
    if (currentEmployee) {
      await markAttendance(currentEmployee.id, status, notes);
      setShowNotesDialog(false);
      setNotes("");
      setCurrentEmployee(null);
    }
  };

  const quickMarkAttendance = async (profileId: string, status: string) => {
    await markAttendance(profileId, status);
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

  // Calculate statistics
  const stats = {
    total: employees.length,
    present: attendance.filter(a => a.status === "present").length,
    absent: attendance.filter(a => a.status === "absent").length,
    late: attendance.filter(a => a.status === "retard").length,
    leave: attendance.filter(a => ["conge", "maladie", "permission"].includes(a.status)).length,
    notMarked: employees.length - attendance.length,
  };

  const attendanceRate = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : "0";

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Gestion de la Présence</h1>
        <Button onClick={() => setShowQRScanner(true)} className="w-full sm:w-auto">
          <QrCode className="mr-2 h-4 w-4" />
          Scanner QR Code
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col items-center text-center">
              <Users className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground mb-2" />
              <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Total</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col items-center text-center">
              <UserCheck className="h-6 w-6 md:h-8 md:w-8 text-green-600 mb-2" />
              <div className="text-xl md:text-2xl font-bold text-green-600">{stats.present}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Présents</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col items-center text-center">
              <UserX className="h-6 w-6 md:h-8 md:w-8 text-red-600 mb-2" />
              <div className="text-xl md:text-2xl font-bold text-red-600">{stats.absent}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Absents</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col items-center text-center">
              <Clock className="h-6 w-6 md:h-8 md:w-8 text-orange-600 mb-2" />
              <div className="text-xl md:text-2xl font-bold text-orange-600">{stats.late}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Retards</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col items-center text-center">
              <CalendarIcon className="h-6 w-6 md:h-8 md:w-8 text-blue-600 mb-2" />
              <div className="text-xl md:text-2xl font-bold text-blue-600">{stats.leave}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Congés</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-primary mb-2" />
              <div className="text-xl md:text-2xl font-bold text-primary">{attendanceRate}%</div>
              <div className="text-xs md:text-sm text-muted-foreground">Taux</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
        <DialogContent className="max-w-md">
          <QRScanner 
            onScanSuccess={handleQRScan}
            onClose={() => setShowQRScanner(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une note pour {currentEmployee?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Raison du retard, maladie, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => saveWithNotes("present")} 
                className="flex-1"
                disabled={markingAttendance}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Présent
              </Button>
              <Button 
                onClick={() => saveWithNotes("retard")} 
                variant="outline"
                className="flex-1"
                disabled={markingAttendance}
              >
                <Clock className="mr-2 h-4 w-4" />
                Retard
              </Button>
              <Button 
                onClick={() => saveWithNotes("absent")} 
                variant="destructive"
                className="flex-1"
                disabled={markingAttendance}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Absent
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Pointage du {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
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
                <Button variant="outline" className={cn("w-full sm:w-auto justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
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

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Employé</TableHead>
                  <TableHead className="hidden md:table-cell">Poste</TableHead>
                  <TableHead className="hidden lg:table-cell">Unité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden sm:table-cell">Heure</TableHead>
                  <TableHead className="text-right min-w-[280px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Aucun employé trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => {
                    const currentStatus = getAttendanceStatus(employee.id);
                    const attendanceRecord = attendance.find(a => a.profile_id === employee.id);
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.full_name}
                          <div className="md:hidden text-xs text-muted-foreground mt-1">
                            {employee.position_name}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{employee.position_name}</TableCell>
                        <TableCell className="hidden lg:table-cell">{employee.unit_name}</TableCell>
                        <TableCell>
                          {currentStatus ? (
                            <div className="space-y-1">
                              {getStatusBadge(currentStatus)}
                              {attendanceRecord?.notes && (
                                <div className="text-xs text-muted-foreground line-clamp-2">
                                  {attendanceRecord.notes}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Non pointé</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {attendanceRecord?.time ? (
                            <span className="text-sm">{attendanceRecord.time.substring(0, 5)}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">--:--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1.5 md:gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => quickMarkAttendance(employee.id, "present")}
                              disabled={markingAttendance}
                              className="h-8 px-2 md:px-3"
                            >
                              <CheckCircle className="h-3.5 w-3.5 md:mr-1.5 text-green-600" />
                              <span className="hidden md:inline">Présent</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => quickMarkAttendance(employee.id, "absent")}
                              disabled={markingAttendance}
                              className="h-8 px-2 md:px-3"
                            >
                              <XCircle className="h-3.5 w-3.5 md:mr-1.5 text-red-600" />
                              <span className="hidden md:inline">Absent</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openNotesDialog(employee.id, employee.full_name)}
                              disabled={markingAttendance}
                              className="h-8 px-2 md:px-3"
                            >
                              <Clock className="h-3.5 w-3.5 md:mr-1.5" />
                              <span className="hidden md:inline">+ Note</span>
                            </Button>
                            <Select
                              value={currentStatus}
                              onValueChange={(value) => markAttendance(employee.id, value)}
                              disabled={markingAttendance}
                            >
                              <SelectTrigger className="w-[90px] md:w-[120px] h-8">
                                <SelectValue placeholder="Autre" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="conge">Congé</SelectItem>
                                <SelectItem value="maladie">Maladie</SelectItem>
                                <SelectItem value="permission">Permission</SelectItem>
                                <SelectItem value="retard">Retard</SelectItem>
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
