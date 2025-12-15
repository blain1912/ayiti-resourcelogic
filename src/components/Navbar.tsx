import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, FileText, Settings, Globe, LogOut, LogIn, UserCircle, ClipboardCheck, CreditCard, CheckSquare, QrCode, ChevronDown, Shield, Menu, ScanLine } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
  const [isRH, setIsRH] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkRoles = async () => {
      if (!user) return;
      
      // Get user's profile to find organization_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) {
        // Check if super admin (no organization)
        const { data: superAdminRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        
        if (superAdminRole) {
          setIsSuperAdmin(true);
        }
        return;
      }
      
      // Get role for user's organization
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", profile.organization_id)
        .maybeSingle();
      
      if (data) {
        setIsRH(["admin", "directeur_rh", "directeur_general", "directeur_administratif"].includes(data.role));
        setIsSuperAdmin(data.role === "admin");
      }
    };

    checkRoles();
  }, [user]);


  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden md:flex flex-col">
                <span className="font-semibold text-sm leading-tight">
                  {organization?.name || "GRH Haiti"}
                </span>
                {organization && (
                  <span className="text-xs text-muted-foreground leading-tight">
                    {organization.type === "ministere" && "Ministère"}
                    {organization.type === "direction_generale" && "Direction Générale"}
                    {organization.type === "organisme_autonome" && "Organisme Autonome"}
                    {organization.type === "organisme_deconcentre" && "Organisme Déconcentré"}
                  </span>
                )}
              </div>
            </Link>
            
            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-1">
            {/* Tableau de bord */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <LayoutDashboard className="h-4 w-4" />
                    Tableau de bord
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background z-50">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center cursor-pointer">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard principal
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/units" className="flex items-center cursor-pointer">
                      <Building2 className="h-4 w-4 mr-2" />
                      Unités
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Employés - Accessible à tous */}
              <Link to="/employees">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Users className="h-4 w-4" />
                  Employés
                </Button>
              </Link>

              {/* Documents - Accessible à tous */}
              <Link to="/documents">
                <Button variant="ghost" size="sm" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </Button>
              </Link>

              {/* RH Menu - Fonctions RH uniquement */}
              {isRH && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <ClipboardCheck className="h-4 w-4" />
                      RH
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-background z-50 w-56">
                    <DropdownMenuItem asChild>
                      <Link to="/approvals" className="flex items-center cursor-pointer">
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Approbations
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/badges" className="flex items-center cursor-pointer">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Badges employés
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/attendance" className="flex items-center cursor-pointer">
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Présence
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/central-qr" className="flex items-center cursor-pointer">
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Code Central
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/leaves" className="flex items-center cursor-pointer">
                        <Calendar className="h-4 w-4 mr-2" />
                        Congés
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Administration - For organization admins */}
              {(isRH && !isSuperAdmin) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Settings className="h-4 w-4" />
                      Admin
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-background z-50">
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Paramètres
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/role-management" className="flex items-center cursor-pointer">
                        <Shield className="h-4 w-4 mr-2" />
                        Gestion des Rôles
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Super Administration - Only for super admins */}
              {isSuperAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Shield className="h-4 w-4" />
                      Super Admin
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-background z-50">
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Paramètres
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/role-management" className="flex items-center cursor-pointer">
                        <Shield className="h-4 w-4 mr-2" />
                        Gestion des Rôles
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/super-admin" className="flex items-center cursor-pointer">
                        <Shield className="h-4 w-4 mr-2" />
                        Super Admin
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/organization-approvals" className="flex items-center cursor-pointer">
                        <Building2 className="h-4 w-4 mr-2" />
                        Approbation Organisations
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Globe className="h-4 w-4" />
                  {language === 'fr' ? 'Français' : 'Kreyòl'}
                </Button>
              </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background z-50">
                  <DropdownMenuItem onClick={() => setLanguage('fr')}>
                    Français
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage('ht')}>
                    Kreyòl Ayisyen
                  </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden md:inline">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background z-50">
                  <DropdownMenuItem asChild>
                    <Link to="/employee-profile" className="flex items-center cursor-pointer">
                      <UserCircle className="h-4 w-4 mr-2" />
                      Mon profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-qr-code" className="flex items-center cursor-pointer">
                      <QrCode className="h-4 w-4 mr-2" />
                      Mon QR Code
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/scan-attendance" className="flex items-center cursor-pointer">
                      <ScanLine className="h-4 w-4 mr-2" />
                      Pointer ma présence
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("logout") || "Déconnexion"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  {t("login") || "Connexion"}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-card py-4 px-2 space-y-2">
            {/* Tableau de bord */}
            <div className="space-y-1">
              <div className="px-3 py-2 text-sm font-semibold text-muted-foreground">
                Tableau de bord
              </div>
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard principal
                </Button>
              </Link>
              <Link to="/units" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <Building2 className="h-4 w-4" />
                  Unités
                </Button>
              </Link>
            </div>

            {/* Employés - Accessible à tous */}
            <div className="space-y-1 pt-2 border-t">
              <Link to="/employees" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <Users className="h-4 w-4" />
                  Employés
                </Button>
              </Link>
              <Link to="/documents" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </Button>
              </Link>
              <Link to="/scan-attendance" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <ScanLine className="h-4 w-4" />
                  Pointer ma présence
                </Button>
              </Link>
            </div>

            {/* RH Section */}
            {isRH && (
              <div className="space-y-1 pt-2 border-t">
                <div className="px-3 py-2 text-sm font-semibold text-muted-foreground">
                  RH
                </div>
                <Link to="/approvals" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    Approbations
                  </Button>
                </Link>
                <Link to="/badges" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <CreditCard className="h-4 w-4" />
                    Badges employés
                  </Button>
                </Link>
                <Link to="/attendance" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Présence
                  </Button>
                </Link>
                <Link to="/central-qr" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code Central
                  </Button>
                </Link>
                <Link to="/leaves" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Calendar className="h-4 w-4" />
                    Congés
                  </Button>
                </Link>
              </div>
            )}

            {/* Admin Section */}
            {(isRH && !isSuperAdmin) && (
              <div className="space-y-1 pt-2 border-t">
                <div className="px-3 py-2 text-sm font-semibold text-muted-foreground">
                  Admin
                </div>
                <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Settings className="h-4 w-4" />
                    Paramètres
                  </Button>
                </Link>
                <Link to="/role-management" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Shield className="h-4 w-4" />
                    Gestion des Rôles
                  </Button>
                </Link>
              </div>
            )}

            {/* Super Admin Section */}
            {isSuperAdmin && (
              <div className="space-y-1 pt-2 border-t">
                <div className="px-3 py-2 text-sm font-semibold text-muted-foreground">
                  Super Admin
                </div>
                <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Settings className="h-4 w-4" />
                    Paramètres
                  </Button>
                </Link>
                <Link to="/role-management" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Shield className="h-4 w-4" />
                    Gestion des Rôles
                  </Button>
                </Link>
                <Link to="/super-admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Shield className="h-4 w-4" />
                    Super Admin
                  </Button>
                </Link>
                <Link to="/organization-approvals" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Building2 className="h-4 w-4" />
                    Approbation Organisations
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
