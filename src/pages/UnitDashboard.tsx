import { useLanguage } from "@/contexts/LanguageContext";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, UserX, TrendingUp, Calendar, ArrowLeft } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useUnitDashboardStats } from "@/hooks/useUnitDashboardStats";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function UnitDashboard() {
  const { t } = useLanguage();
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { stats, loading } = useUnitDashboardStats(unitId);
  const [subUnits, setSubUnits] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);

  useEffect(() => {
    if (unitId) {
      fetchSubUnits();
    }
  }, [unitId]);

  const fetchSubUnits = async () => {
    if (!unitId) return;

    try {
      const { data } = await supabase
        .from("organizational_units")
        .select("id, name, type")
        .eq("parent_id", unitId)
        .order("name");

      setSubUnits(data || []);
    } catch (error) {
      console.error("Error fetching sub-units:", error);
    } finally {
      setLoadingUnits(false);
    }
  };

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

  const getUnitTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      direction_generale: "Direction Générale",
      direction_technique: "Direction Technique",
      service: "Service",
      section: "Section",
      departement: "Département",
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-accent py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">
            {loading ? <Skeleton className="h-10 w-64" /> : stats?.unitName}
          </h1>
          <p className="text-primary-foreground/90 mt-2">
            Tableau de bord de l'unité organisationnelle
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
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
              title="Employés de l'unité"
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

        {/* Sub-units Section */}
        {subUnits.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Sous-unités organisationnelles</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUnits ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subUnits.map((unit) => (
                    <Link key={unit.id} to={`/unit/${unit.id}/dashboard`}>
                      <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/50">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Users className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{unit.name}</p>
                              <p className="text-xs text-muted-foreground">{getUnitTypeLabel(unit.type)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
