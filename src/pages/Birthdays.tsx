import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake, Calendar, Users, Filter } from "lucide-react";
import { format, isSameMonth, parseISO, isToday, isSameDay, addDays, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

interface Profile {
  id: string;
  prenom: string | null;
  nom: string | null;
  full_name: string | null;
  date_naissance: string | null;
  photo_url: string | null;
  unit_id: string | null;
}

interface OrganizationalUnit {
  id: string;
  name: string;
  type: string;
}

export default function Birthdays() {
  const { organization, loading: orgLoading } = useOrganization();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()));
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id) {
      loadData();
    }
  }, [organization?.id]);

  const loadData = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      // Load profiles with birthdays
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, prenom, nom, full_name, date_naissance, photo_url, unit_id")
        .eq("organization_id", organization.id)
        .not("date_naissance", "is", null);

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Load units
      const { data: unitsData, error: unitsError } = await supabase
        .from("organizational_units")
        .select("id, name, type")
        .eq("organization_id", organization.id);

      if (unitsError) throw unitsError;
      setUnits(unitsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (profile: Profile) => {
    if (profile.prenom && profile.nom) {
      return `${profile.prenom} ${profile.nom}`;
    }
    return profile.full_name || "Sans nom";
  };

  const getInitials = (profile: Profile) => {
    const name = getDisplayName(profile);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUnitName = (unitId: string | null) => {
    if (!unitId) return "Non assigné";
    const unit = units.find((u) => u.id === unitId);
    return unit?.name || "Non assigné";
  };

  const filteredProfiles = profiles.filter((profile) => {
    if (!profile.date_naissance) return false;
    
    const birthDate = parseISO(profile.date_naissance);
    const matchesMonth = selectedMonth === "all" || birthDate.getMonth() === parseInt(selectedMonth);
    const matchesUnit = selectedUnit === "all" || profile.unit_id === selectedUnit;
    
    return matchesMonth && matchesUnit;
  });

  // Sort by birth day in the month
  const sortedProfiles = filteredProfiles.sort((a, b) => {
    const dateA = parseISO(a.date_naissance!);
    const dateB = parseISO(b.date_naissance!);
    return dateA.getDate() - dateB.getDate();
  });

  // Get today's birthdays
  const todayBirthdays = profiles.filter((profile) => {
    if (!profile.date_naissance) return false;
    const birthDate = parseISO(profile.date_naissance);
    const today = new Date();
    return birthDate.getDate() === today.getDate() && birthDate.getMonth() === today.getMonth();
  });

  // Get this week's birthdays
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekBirthdays = profiles.filter((profile) => {
    if (!profile.date_naissance) return false;
    const birthDate = parseISO(profile.date_naissance);
    const thisYearBirthday = new Date(new Date().getFullYear(), birthDate.getMonth(), birthDate.getDate());
    return thisYearBirthday >= weekStart && thisYearBirthday <= weekEnd;
  });

  const months = [
    { value: "all", label: "Tous les mois" },
    { value: "0", label: "Janvier" },
    { value: "1", label: "Février" },
    { value: "2", label: "Mars" },
    { value: "3", label: "Avril" },
    { value: "4", label: "Mai" },
    { value: "5", label: "Juin" },
    { value: "6", label: "Juillet" },
    { value: "7", label: "Août" },
    { value: "8", label: "Septembre" },
    { value: "9", label: "Octobre" },
    { value: "10", label: "Novembre" },
    { value: "11", label: "Décembre" },
  ];

  const isBirthdayToday = (dateStr: string) => {
    const birthDate = parseISO(dateStr);
    const today = new Date();
    return birthDate.getDate() === today.getDate() && birthDate.getMonth() === today.getMonth();
  };

  if (orgLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cake className="h-6 w-6 text-primary" />
            Anniversaires des employés
          </h1>
          <p className="text-muted-foreground mt-1">
            Consultez les anniversaires de vos collègues
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Cake className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayBirthdays.length}</p>
                <p className="text-sm text-muted-foreground">Aujourd'hui</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{thisWeekBirthdays.length}</p>
                <p className="text-sm text-muted-foreground">Cette semaine</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profiles.length}</p>
                <p className="text-sm text-muted-foreground">Total employés</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Birthdays */}
        {todayBirthdays.length > 0 && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Cake className="h-5 w-5" />
                🎉 Anniversaires du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {todayBirthdays.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-3 p-3 bg-background rounded-lg border"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile.photo_url || ""} />
                      <AvatarFallback>{getInitials(profile)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{getDisplayName(profile)}</p>
                      <p className="text-sm text-muted-foreground">
                        {getUnitName(profile.unit_id)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtres:</span>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sélectionner le mois" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sélectionner l'unité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les unités</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Birthday List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Liste des anniversaires ({sortedProfiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedProfiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun anniversaire trouvé pour cette période
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border ${
                      isBirthdayToday(profile.date_naissance!)
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile.photo_url || ""} />
                      <AvatarFallback>{getInitials(profile)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {getDisplayName(profile)}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {getUnitName(profile.unit_id)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {format(parseISO(profile.date_naissance!), "d MMMM", {
                            locale: fr,
                          })}
                        </span>
                        {isBirthdayToday(profile.date_naissance!) && (
                          <Badge variant="default" className="text-xs">
                            Aujourd'hui 🎂
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
