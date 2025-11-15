import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Link } from "react-router-dom";
import { Users, Building2, ChevronRight } from "lucide-react";

interface Unit {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  employeeCount?: number;
}

export default function UnitsList() {
  const { organization } = useOrganization();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id) {
      fetchUnits();
    }
  }, [organization?.id]);

  const fetchUnits = async () => {
    if (!organization?.id) return;

    try {
      // Fetch all units
      const { data: unitsData } = await supabase
        .from("organizational_units")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");

      if (unitsData) {
        // Get employee counts for each unit
        const unitsWithCounts = await Promise.all(
          unitsData.map(async (unit) => {
            const { count } = await supabase
              .from("profiles")
              .select("*", { count: "exact", head: true })
              .eq("unit_id", unit.id)
              .eq("approval_status", "approved");

            return {
              ...unit,
              employeeCount: count || 0,
            };
          })
        );

        setUnits(unitsWithCounts);
      }
    } catch (error) {
      console.error("Error fetching units:", error);
    } finally {
      setLoading(false);
    }
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

  const getUnitIcon = (type: string) => {
    return type === "direction_generale" || type === "direction_technique" ? Building2 : Users;
  };

  // Group units by parent
  const topLevelUnits = units.filter((u) => !u.parent_id);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Unités Organisationnelles</h1>
          <p className="text-muted-foreground">
            Accédez aux tableaux de bord de chaque unité organisationnelle
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : units.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Aucune unité organisationnelle trouvée
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {topLevelUnits.map((topUnit) => {
              const Icon = getUnitIcon(topUnit.type);
              const childUnits = units.filter((u) => u.parent_id === topUnit.id);

              return (
                <div key={topUnit.id}>
                  <Link to={`/unit/${topUnit.id}/dashboard`}>
                    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/50 mb-4">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold text-foreground mb-1">
                                {topUnit.name}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {getUnitTypeLabel(topUnit.type)}
                              </p>
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-primary" />
                                <span className="text-foreground font-medium">
                                  {topUnit.employeeCount} employés
                                </span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  {childUnits.length > 0 && (
                    <div className="ml-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {childUnits.map((childUnit) => {
                        const ChildIcon = getUnitIcon(childUnit.type);
                        return (
                          <Link key={childUnit.id} to={`/unit/${childUnit.id}/dashboard`}>
                            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/50">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <ChildIcon className="h-6 w-6 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground truncate">
                                      {childUnit.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {getUnitTypeLabel(childUnit.type)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {childUnit.employeeCount} employés
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
