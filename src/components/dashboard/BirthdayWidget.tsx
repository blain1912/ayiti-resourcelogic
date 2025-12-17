import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cake, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

interface Profile {
  id: string;
  prenom: string | null;
  nom: string | null;
  full_name: string | null;
  date_naissance: string | null;
  photo_url: string | null;
}

interface BirthdayWidgetProps {
  organizationId: string | null;
}

export default function BirthdayWidget({ organizationId }: BirthdayWidgetProps) {
  const [birthdays, setBirthdays] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      loadBirthdays();
    }
  }, [organizationId]);

  const loadBirthdays = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, prenom, nom, full_name, date_naissance, photo_url")
        .eq("organization_id", organizationId)
        .not("date_naissance", "is", null);

      if (error) throw error;

      // Filter for this week's birthdays
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const weekBirthdays = (data || []).filter((profile) => {
        if (!profile.date_naissance) return false;
        const birthDate = parseISO(profile.date_naissance);
        const thisYearBirthday = new Date(
          new Date().getFullYear(),
          birthDate.getMonth(),
          birthDate.getDate()
        );
        return thisYearBirthday >= weekStart && thisYearBirthday <= weekEnd;
      });

      // Sort by date
      weekBirthdays.sort((a, b) => {
        const dateA = parseISO(a.date_naissance!);
        const dateB = parseISO(b.date_naissance!);
        const thisYearA = new Date(new Date().getFullYear(), dateA.getMonth(), dateA.getDate());
        const thisYearB = new Date(new Date().getFullYear(), dateB.getMonth(), dateB.getDate());
        return thisYearA.getTime() - thisYearB.getTime();
      });

      setBirthdays(weekBirthdays);
    } catch (error) {
      console.error("Error loading birthdays:", error);
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

  const isBirthdayToday = (dateStr: string) => {
    const birthDate = parseISO(dateStr);
    const today = new Date();
    return birthDate.getDate() === today.getDate() && birthDate.getMonth() === today.getMonth();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-primary" />
            Anniversaires de la semaine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cake className="h-5 w-5 text-primary" />
          Anniversaires de la semaine
        </CardTitle>
        <Link to="/birthdays">
          <Button variant="ghost" size="sm" className="text-xs">
            Voir tout <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {birthdays.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun anniversaire cette semaine
          </p>
        ) : (
          <div className="space-y-3">
            {birthdays.slice(0, 5).map((profile) => (
              <div
                key={profile.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  isBirthdayToday(profile.date_naissance!)
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/50"
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.photo_url || ""} />
                  <AvatarFallback className="text-xs">{getInitials(profile)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getDisplayName(profile)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(profile.date_naissance!), "d MMMM", { locale: fr })}
                  </p>
                </div>
                {isBirthdayToday(profile.date_naissance!) && (
                  <Badge variant="default" className="text-xs">
                    🎂
                  </Badge>
                )}
              </div>
            ))}
            {birthdays.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{birthdays.length - 5} autres anniversaires
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
