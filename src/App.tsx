import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Leaves from "./pages/Leaves";
import Documents from "./pages/Documents";
import Auth from "./pages/Auth";
import OrganizationSetup from "./pages/OrganizationSetup";
import Settings from "./pages/Settings";
import AdminOrganization from "./pages/AdminOrganization";
import AdminUnits from "./pages/AdminUnits";
import NotFound from "./pages/NotFound";

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
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/leaves" element={<Leaves />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/organization-setup" element={<OrganizationSetup />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin/organization" element={<AdminOrganization />} />
            <Route path="/admin/organization/:orgId/units" element={<AdminUnits />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
