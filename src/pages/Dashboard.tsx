import { useLanguage } from "@/contexts/LanguageContext";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar, UserCheck, UserX, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import heroImage from "@/assets/hero-admin.jpg";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useOrganization } from "@/hooks/useOrganization";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import BirthdayWidget from "@/components/dashboard/BirthdayWidget";

export default function Dashboard() {
  const { t } = useLanguage();
  const { stats, loading } = useDashboardStats();
  const { organization } = useOrganization();

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      present: "Présent",
      absent: "Absent",
      conge: "Congé",
      maladie: "Maladie",
      retard: "Retard",
      permission: "Permission",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      present: "text-primary",
      absent: "text-destructive",
      conge: "text-accent",
      maladie: "text-muted-foreground",
      retard: "text-accent",
      permission: "text-muted-foreground",
    };
    return colors[status] || "text-foreground";
  };

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
          <p className="text-xl text-white/90 max-w-2xl mb-4">
            {t("welcomeSubtitle")}
          </p>
          <div className="space-x-4">
            <Link to="/employee-profile">
              <Button variant="secondary" size="lg">
                🧪 Test Profil Employé
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 -mt-16 relative z-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Employés"
              value={stats?.totalEmployees || 0}
              icon={Users}
              trend={`${stats?.totalEmployees || 0} actifs`}
            />
            <StatCard
              title="Présents Aujourd'hui"
              value={stats?.presentToday || 0}
              icon={UserCheck}
              trend={`${stats?.attendanceRate || 0}% de présence`}
            />
            <StatCard
              title="Absents Aujourd'hui"
              value={stats?.absentToday || 0}
              icon={UserX}
              trend={`${stats?.onLeaveToday || 0} en congé`}
            />
            <StatCard
              title="Taux de Présence"
              value={`${stats?.attendanceRate || 0}%`}
              icon={TrendingUp}
              trend="Ce mois"
            />
          </div>
        )}

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Présence des 7 derniers jours</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ChartContainer
                  config={{
                    present: {
                      label: "Présents",
                      color: "hsl(var(--primary))",
                    },
                    absent: {
                      label: "Absents",
                      color: "hsl(var(--destructive))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.monthlyAttendance || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), "dd/MM", { locale: fr })}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="present" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activité Récente de Présence</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                    stats.recentActivity.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{item.full_name}</p>
                          <p className={`text-sm font-medium ${getStatusColor(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucune activité récente
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Birthday Widget */}
        <div className="mb-8">
          <BirthdayWidget organizationId={organization?.id || null} />
        </div>
      </div>
    </div>
  );
}
