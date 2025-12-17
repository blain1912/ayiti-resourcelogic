import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Leaves from "./pages/Leaves";
import Documents from "./pages/Documents";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import OrganizationSetup from "./pages/OrganizationSetup";
import Settings from "./pages/Settings";
import AdminOrganization from "./pages/AdminOrganization";
import AdminUnits from "./pages/AdminUnits";
import AdminUsers from "./pages/AdminUsers";
import EmployeeProfile from "./pages/EmployeeProfile";
import EmployeeWaiting from "./pages/EmployeeWaiting";
import PendingApprovals from "./pages/PendingApprovals";
import EmployeeBadges from "./pages/EmployeeBadges";
import Attendance from "./pages/Attendance";
import MyQRCode from "./pages/MyQRCode";
import ScanAttendance from "./pages/ScanAttendance";
import CentralQRDisplay from "./pages/CentralQRDisplay";
import RealtimeAttendance from "./pages/RealtimeAttendance";
import MonthlyReport from "./pages/MonthlyReport";
import UnitDashboard from "./pages/UnitDashboard";
import UnitsList from "./pages/UnitsList";
import SuperAdmin from "./pages/SuperAdmin";
import RoleManagement from "./pages/RoleManagement";
import OrganizationApprovals from "./pages/OrganizationApprovals";
import SalaryScaleTemplate from "./pages/SalaryScaleTemplate";
import UserManual from "./pages/UserManual";
import Recruitment from "./pages/Recruitment";
import InternalJobs from "./pages/InternalJobs";
import Careers from "./pages/Careers";
import Birthdays from "./pages/Birthdays";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import InitialSetup from "./pages/InitialSetup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/initial-setup" element={<InitialSetup />} />
            <Route path="/employee-waiting" element={<EmployeeWaiting />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
            <Route path="/leaves" element={<ProtectedRoute><Leaves /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/organization-setup" element={<ProtectedRoute><OrganizationSetup /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
            <Route path="/employee-profile" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
            <Route path="/profil" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
            <Route path="/approvals" element={<ProtectedRoute><PendingApprovals /></ProtectedRoute>} />
            <Route path="/badges" element={<ProtectedRoute><EmployeeBadges /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="/my-qr-code" element={<ProtectedRoute><MyQRCode /></ProtectedRoute>} />
            <Route path="/scan-attendance" element={<ProtectedRoute><ScanAttendance /></ProtectedRoute>} />
            <Route path="/central-qr" element={<ProtectedRoute><CentralQRDisplay /></ProtectedRoute>} />
            <Route path="/realtime-attendance" element={<ProtectedRoute><RealtimeAttendance /></ProtectedRoute>} />
            <Route path="/monthly-report" element={<ProtectedRoute><MonthlyReport /></ProtectedRoute>} />
            <Route path="/units" element={<ProtectedRoute><UnitsList /></ProtectedRoute>} />
            <Route path="/units" element={<ProtectedRoute><UnitsList /></ProtectedRoute>} />
            <Route path="/unit/:unitId/dashboard" element={<ProtectedRoute><UnitDashboard /></ProtectedRoute>} />
            <Route path="/admin/organization" element={<ProtectedRoute><AdminOrganization /></ProtectedRoute>} />
            <Route path="/admin/organization/:orgId/units" element={<ProtectedRoute><AdminUnits /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/role-management" element={<ProtectedRoute><RoleManagement /></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
            <Route path="/organization-approvals" element={<ProtectedRoute><OrganizationApprovals /></ProtectedRoute>} />
            <Route path="/salary-scale-template" element={<ProtectedRoute><SalaryScaleTemplate /></ProtectedRoute>} />
            <Route path="/recruitment" element={<ProtectedRoute><Recruitment /></ProtectedRoute>} />
            <Route path="/internal-jobs" element={<ProtectedRoute><InternalJobs /></ProtectedRoute>} />
            <Route path="/birthdays" element={<ProtectedRoute><Birthdays /></ProtectedRoute>} />
            <Route path="/user-manual" element={<UserManual />} />
            <Route path="/careers" element={<Careers />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
