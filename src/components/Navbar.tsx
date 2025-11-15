import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, FileText, Settings, Globe, LogOut, LogIn, UserCircle, ClipboardCheck, CreditCard, CheckSquare } from "lucide-react";
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

  useEffect(() => {
    const checkRHRole = async () => {
      if (!user || !organization) return;
      
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", organization.id)
        .in("role", ["admin", "directeur_rh"])
        .maybeSingle();
      
      setIsRH(!!data);
    };

    checkRHRole();
  }, [user, organization]);

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: t("dashboard") },
    { path: "/employees", icon: Users, label: t("employees") },
    { path: "/leaves", icon: Calendar, label: t("leaves") },
    { path: "/documents", icon: FileText, label: t("documents") },
  ];

  if (isRH) {
    navItems.push({ path: "/approvals", icon: ClipboardCheck, label: "Approbations" });
    navItems.push({ path: "/badges", icon: CreditCard, label: "Badges" });
    navItems.push({ path: "/attendance", icon: CheckSquare, label: "Présence" });
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
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
            
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Globe className="h-4 w-4" />
                  {language === 'fr' ? 'Français' : 'Kreyòl'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/employee-profile" className="flex items-center">
                      <UserCircle className="h-4 w-4 mr-2" />
                      Mon profil
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

            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
