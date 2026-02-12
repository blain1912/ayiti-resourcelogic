import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthlyAttendanceReport } from "@/components/attendance/MonthlyAttendanceReport";
import { LeaveReport } from "@/components/reports/LeaveReport";
import { SeniorityReport } from "@/components/reports/SeniorityReport";
import { StaffingReport } from "@/components/reports/StaffingReport";
import { DemographicsReport } from "@/components/reports/DemographicsReport";
import { PayrollReport } from "@/components/reports/PayrollReport";
import { CheckSquare, Calendar, Award, Users, FileBarChart, UserCircle, DollarSign } from "lucide-react";

const Reports = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FileBarChart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Rapports</h1>
          </div>
          <p className="text-muted-foreground">Consultez et exportez les rapports RH de votre organisation</p>
        </div>

        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto">
            <TabsTrigger value="attendance" className="gap-2 py-3">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Présences</span>
            </TabsTrigger>
            <TabsTrigger value="leaves" className="gap-2 py-3">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Congés</span>
            </TabsTrigger>
            <TabsTrigger value="seniority" className="gap-2 py-3">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Ancienneté</span>
            </TabsTrigger>
            <TabsTrigger value="staffing" className="gap-2 py-3">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Effectifs</span>
            </TabsTrigger>
            <TabsTrigger value="payroll" className="gap-2 py-3">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Masse Salariale</span>
            </TabsTrigger>
            <TabsTrigger value="demographics" className="gap-2 py-3">
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Démographie</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <MonthlyAttendanceReport />
          </TabsContent>
          <TabsContent value="leaves">
            <LeaveReport />
          </TabsContent>
          <TabsContent value="seniority">
            <SeniorityReport />
          </TabsContent>
          <TabsContent value="staffing">
            <StaffingReport />
          </TabsContent>
          <TabsContent value="payroll">
            <PayrollReport />
          </TabsContent>
          <TabsContent value="demographics">
            <DemographicsReport />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Reports;
