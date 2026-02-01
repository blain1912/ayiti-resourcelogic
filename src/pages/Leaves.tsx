import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { LeaveRequestForm } from "@/components/leaves/LeaveRequestForm";
import { LeaveRequestCard } from "@/components/leaves/LeaveRequestCard";
import { LeaveBalanceOverview } from "@/components/leaves/LeaveBalanceOverview";
import { supabase } from "@/integrations/supabase/client";

export default function Leaves() {
  const { t } = useLanguage();
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);

  const {
    requests,
    loading,
    userProfile,
    createRequest,
    updateRequestStatus,
    cancelRequest,
  } = useLeaveRequests();

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const adminRoles = ["admin", "directeur_rh", "directeur_administratif", "directeur_general", "approbateur_conges"];
    const hasAdminRole = roles?.some((r) => adminRoles.includes(r.role)) || false;
    setIsAdmin(hasAdminRole);
  };

  const filteredRequests = requests.filter((request) => {
    if (statusFilter === "all") return true;
    return request.status === statusFilter;
  });

  const myRequests = filteredRequests.filter(
    (r) => r.employee_id === userProfile?.id
  );
  const teamRequests = filteredRequests.filter(
    (r) => r.employee_id !== userProfile?.id
  );

  const handleApprove = async (id: string, comment?: string) => {
    return updateRequestStatus(id, "approved", comment);
  };

  const handleReject = async (id: string, comment?: string) => {
    return updateRequestStatus(id, "rejected", comment);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Leave Balance Overview */}
      <LeaveBalanceOverview />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">{t("leaveRequests")}</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvés</SelectItem>
              <SelectItem value="rejected">Rejetés</SelectItem>
              <SelectItem value="cancelled">Annulés</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("requestLeave")}
          </Button>
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="team" className="space-y-4">
          <TabsList>
            <TabsTrigger value="team">
              Équipe ({teamRequests.length})
            </TabsTrigger>
            <TabsTrigger value="mine">
              Mes demandes ({myRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-4">
            {teamRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucune demande de congé de l'équipe
              </p>
            ) : (
              <div className="grid gap-4">
                {teamRequests.map((request) => (
                  <LeaveRequestCard
                    key={request.id}
                    request={request}
                    isAdmin={isAdmin}
                    currentUserId={userProfile?.id}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onCancel={cancelRequest}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mine" className="space-y-4">
            {myRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Vous n'avez pas encore de demandes de congé
              </p>
            ) : (
              <div className="grid gap-4">
                {myRequests.map((request) => (
                  <LeaveRequestCard
                    key={request.id}
                    request={request}
                    isAdmin={false}
                    currentUserId={userProfile?.id}
                    onCancel={cancelRequest}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          {myRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Vous n'avez pas encore de demandes de congé
            </p>
          ) : (
            <div className="grid gap-4">
              {myRequests.map((request) => (
                <LeaveRequestCard
                  key={request.id}
                  request={request}
                  isAdmin={false}
                  currentUserId={userProfile?.id}
                  onCancel={cancelRequest}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <LeaveRequestForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={createRequest}
      />
    </div>
  );
}
