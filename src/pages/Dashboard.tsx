import { useLanguage } from "@/contexts/LanguageContext";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, FileCheck, Building2 } from "lucide-react";
import heroImage from "@/assets/hero-admin.jpg";

export default function Dashboard() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/80" />
        </div>
        <div className="relative h-full container mx-auto px-4 flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t("welcomeTitle")}
          </h1>
          <p className="text-xl text-white/90 max-w-2xl">
            {t("welcomeSubtitle")}
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 -mt-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={t("totalEmployees")}
            value="1,247"
            icon={Users}
            trend="+12% ce mois"
          />
          <StatCard
            title={t("activeLeaves")}
            value="45"
            icon={Calendar}
            trend="8 nouvelles"
          />
          <StatCard
            title={t("pendingRequests")}
            value="23"
            icon={FileCheck}
            trend="En attente"
          />
          <StatCard
            title={t("departments")}
            value="18"
            icon={Building2}
            trend="Actifs"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Activité Récente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Marie Jean", action: "Demande de congé approuvée", time: "Il y a 2h" },
                  { name: "Jean Baptiste", action: "Nouveau document ajouté", time: "Il y a 4h" },
                  { name: "Pierre Dupont", action: "Profil mis à jour", time: "Il y a 6h" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistiques du Mois</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nouvelles embauches</span>
                    <span className="font-medium">24</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[60%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Congés validés</span>
                    <span className="font-medium">89</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-accent w-[80%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Documents traités</span>
                    <span className="font-medium">156</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[90%]" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
