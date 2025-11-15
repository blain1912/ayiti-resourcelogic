import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasOrganization, setHasOrganization] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log("🔍 ProtectedRoute: Checking authentication...");
      const { data: { user } } = await supabase.auth.getUser();
      console.log("👤 User:", user ? `${user.email} (${user.id})` : "Not logged in");
      
      if (!user) {
        console.log("❌ No user, redirecting to /auth");
        navigate("/auth");
        return;
      }

      // Check if user has an organization
      console.log("🔍 Checking user profile...");
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("organization_id, profile_completed, approval_status")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("📋 Profile data:", profile);
      console.log("❗ Profile error:", error);

      if (!profile?.organization_id) {
        const userType = user.user_metadata?.user_type;
        console.log("🏢 No organization, user type:", userType);
        if (userType === "employe") {
          console.log("➡️ Redirecting employee to waiting page");
          navigate("/employee-waiting");
        } else {
          console.log("➡️ Redirecting to onboarding");
          navigate("/onboarding");
        }
        return;
      }

      // Check if employee profile is completed
      const userType = user.user_metadata?.user_type;
      const currentPath = window.location.pathname;
      console.log("🛤️ Current path:", currentPath);
      console.log("👤 User type:", userType);
      console.log("✅ Profile completed:", profile.profile_completed);
      console.log("✅ Approval status:", profile.approval_status);
      
      // Allow access to employee-profile page for approved employees
      if (currentPath === "/employee-profile" && profile.approval_status === "approved") {
        console.log("✅ Allowing access to employee-profile page");
        setHasOrganization(true);
        return;
      }
      
      if (userType === "employe" && !profile.profile_completed && profile.approval_status === "approved") {
        console.log("➡️ Redirecting to employee-profile to complete profile");
        navigate("/employee-profile");
        return;
      }

      console.log("✅ All checks passed, allowing access");
      setHasOrganization(true);
    } catch (error) {
      console.error("💥 Error checking auth:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return hasOrganization ? <>{children}</> : null;
};

export default ProtectedRoute;