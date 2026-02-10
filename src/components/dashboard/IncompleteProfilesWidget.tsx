import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserX, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface IncompleteProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  approval_status: string | null;
  created_at: string;
}

interface Props {
  organizationId: string | null;
}

export default function IncompleteProfilesWidget({ organizationId }: Props) {
  const [profiles, setProfiles] = useState<IncompleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHR, setIsHR] = useState(false);

  useEffect(() => {
    if (organizationId) {
      checkRoleAndFetch();
    }
  }, [organizationId]);

  const checkRoleAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organizationId) return;

      const { data: hasAdmin } = await supabase.rpc("has_admin_role", {
        _user_id: user.id,
        _organization_id: organizationId,
      });

      if (!hasAdmin) {
        setLoading(false);
        return;
      }

      setIsHR(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, approval_status, created_at")
        .eq("organization_id", organizationId)
        .eq("profile_completed", false)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });

      if (!error) {
        setProfiles(data || []);
      }
    } catch (error) {
      console.error("Error fetching incomplete profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isHR && !loading) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <UserX className="h-5 w-5 text-destructive" />
          Fiches incomplètes
          {!loading && profiles.length > 0 && (
            <Badge variant="destructive" className="ml-2">{profiles.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Toutes les fiches employés sont complétées ✅
          </p>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">
                    {profile.full_name || "Nom non renseigné"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {profile.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Inscrit {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <Link to={`/employee/${profile.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Compléter
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
