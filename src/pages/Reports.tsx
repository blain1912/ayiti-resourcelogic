import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthlyAttendanceReport } from "@/components/attendance/MonthlyAttendanceReport";
import { LeaveReport } from "@/components/reports/LeaveReport";
import { SeniorityReport } from "@/components/reports/SeniorityReport";
import { StaffingReport } from "@/components/reports/StaffingReport";
import { DemographicsReport } from "@/components/reports/DemographicsReport";
import { PayrollReport } from "@/components/reports/PayrollReport";
import { PayrollDetailReport } from "@/components/reports/PayrollDetailReport";
import { CheckSquare, Calendar, Award, Users, FileBarChart, UserCircle, DollarSign, Receipt } from "lucide-react";

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
          <TabsList className="flex w-full overflow-x-auto h-auto flex-nowrap justify-start md:justify-center gap-1">
            <TabsTrigger value="attendance" className="gap-2 py-3 flex-shrink-0">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Présences</span>
            </TabsTrigger>
            <TabsTrigger value="leaves" className="gap-2 py-3 flex-shrink-0">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Congés</span>
            </TabsTrigger>
            <TabsTrigger value="seniority" className="gap-2 py-3 flex-shrink-0">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Ancienneté</span>
            </TabsTrigger>
            <TabsTrigger value="staffing" className="gap-2 py-3 flex-shrink-0">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Effectifs</span>
            </TabsTrigger>
            <TabsTrigger value="payroll" className="gap-2 py-3 flex-shrink-0">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Masse Salariale</span>
            </TabsTrigger>
            <TabsTrigger value="demographics" className="gap-2 py-3 flex-shrink-0">
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Démographie</span>
            </TabsTrigger>
            <TabsTrigger value="emargement" className="gap-2 py-3 flex-shrink-0">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Émargement</span>
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
          <TabsContent value="emargement">
            <PayrollDetailReport />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Reports;
