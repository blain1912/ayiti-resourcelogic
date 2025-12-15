import { MonthlyAttendanceReport } from "@/components/attendance/MonthlyAttendanceReport";

const MonthlyReport = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <MonthlyAttendanceReport />
      </main>
    </div>
  );
};

export default MonthlyReport;
