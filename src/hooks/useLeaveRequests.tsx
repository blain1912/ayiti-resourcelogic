import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logHrEvent } from "@/lib/hrAudit";
import { detectHrConflicts, isBlockingConflict, describeConflicts } from "@/hooks/useHrDayStatus";


export interface LeaveRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    full_name: string | null;
    prenom: string | null;
    nom: string | null;
    photo_url: string | null;
    email: string | null;
  };
  reviewer?: {
    id: string;
    full_name: string | null;
    prenom: string | null;
    nom: string | null;
  };
}

interface UserProfile {
  id: string;
  organization_id: string;
  full_name: string | null;
  prenom: string | null;
  nom: string | null;
  email: string | null;
}

const sendLeaveNotification = async (data: {
  type: "submitted" | "approved" | "rejected";
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  reviewComment?: string;
  reviewerName?: string;
}) => {
  try {
    const response = await supabase.functions.invoke("send-leave-notification", {
      body: data,
    });
    
    if (response.error) {
      console.error("Error sending notification:", response.error);
    } else {
      console.log("Notification sent successfully");
    }
  } catch (error) {
    console.error("Error invoking notification function:", error);
  }
};

export function useLeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchRequests();
    }
  }, [userProfile]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, organization_id, full_name, prenom, nom, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile) {
      setUserProfile(profile);
    }
  };

  const fetchRequests = async () => {
    if (!userProfile?.organization_id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("leave_requests")
      .select(`
        *,
        employee:profiles!leave_requests_employee_id_fkey(id, full_name, prenom, nom, photo_url, email),
        reviewer:profiles!leave_requests_reviewed_by_fkey(id, full_name, prenom, nom)
      `)
      .eq("organization_id", userProfile.organization_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leave requests:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes de congés",
        variant: "destructive",
      });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getEmployeeName = (profile: UserProfile | null) => {
    if (!profile) return "";
    if (profile.prenom && profile.nom) {
      return `${profile.prenom} ${profile.nom}`;
    }
    return profile.full_name || "";
  };

  const createRequest = async (data: {
    leave_type: string;
    start_date: string;
    end_date: string;
    reason?: string;
  }) => {
    if (!userProfile) return { error: "Profile not found" };

    // Moteur serveur de conflits (mission / autorisation / autre congé)
    try {
      const conflicts = (
        await detectHrConflicts(userProfile.id, data.start_date, data.end_date)
      ).filter(isBlockingConflict);
      if (conflicts.length > 0) {
        const message = `Conflit détecté : ${describeConflicts(conflicts)}`;
        toast({ title: "Demande bloquée", description: message, variant: "destructive" });
        return { error: message };
      }
    } catch (conflictError) {
      console.error("hr_detect_conflicts", conflictError);
    }

    const { data: created, error } = await supabase.from("leave_requests").insert([{
      organization_id: userProfile.organization_id,
      employee_id: userProfile.id,
      leave_type: data.leave_type as "conge_annuel" | "conge_maladie" | "conge_maternite" | "conge_paternite" | "conge_sans_solde" | "conge_exceptionnel" | "conge_etudes",
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason || null,
    }]).select("id").maybeSingle();

    if (error) {
      console.error("Error creating leave request:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la demande de congé",
        variant: "destructive",
      });
      return { error };
    }

    await logHrEvent({
      organization_id: userProfile.organization_id,
      profile_id: userProfile.id,
      entity_type: "leave_request",
      entity_id: created?.id ?? null,
      action: "submitted",
      new_value: data,
      comment: data.reason ?? null,
    });

    toast({
      title: "Succès",
      description: "Demande de congé soumise avec succès",
    });


    // Send email notification
    if (userProfile.email) {
      sendLeaveNotification({
        type: "submitted",
        employeeName: getEmployeeName(userProfile),
        employeeEmail: userProfile.email,
        leaveType: data.leave_type,
        startDate: formatDate(data.start_date),
        endDate: formatDate(data.end_date),
        reason: data.reason,
      });
    }
    
    fetchRequests();
    return { error: null };
  };

  const updateRequestStatus = async (
    requestId: string,
    status: "approved" | "rejected",
    comment?: string
  ) => {
    if (!userProfile) return { error: "Profile not found" };

    // Find the request to get employee info
    const request = requests.find(r => r.id === requestId);
    if (!request) return { error: "Request not found" };

    // Auto-approbation interdite (double barrière : RLS serveur + garde UI)
    if (status === "approved" && request.employee_id === userProfile.id) {
      const message = "Vous ne pouvez pas approuver votre propre demande de congé.";
      toast({ title: "Action refusée", description: message, variant: "destructive" });
      return { error: message };
    }

    // Conflits avant validation (mission / autorisation / autre congé approuvé)
    if (status === "approved") {
      try {
        const conflicts = (
          await detectHrConflicts(request.employee_id, request.start_date, request.end_date, requestId)
        ).filter(isBlockingConflict);
        if (conflicts.length > 0) {
          const message = `Conflit détecté : ${describeConflicts(conflicts)}`;
          toast({ title: "Approbation bloquée", description: message, variant: "destructive" });
          return { error: message };
        }
      } catch (conflictError) {
        console.error("hr_detect_conflicts", conflictError);
      }
    }

    const { data: updated, error } = await supabase
      .from("leave_requests")
      .update({
        status,
        reviewed_by: userProfile.id,
        reviewed_at: new Date().toISOString(),
        review_comment: comment || null,
      })
      .eq("id", requestId)
      .select("id")
      .maybeSingle();

    if (error || !updated) {
      console.error("Error updating leave request:", error);
      toast({
        title: "Erreur",
        description: error
          ? "Impossible de mettre à jour la demande"
          : "Action refusée : demande hors de votre périmètre ou auto-validation interdite.",
        variant: "destructive",
      });
      return { error: error ?? "not permitted" };
    }

    await logHrEvent({
      organization_id: request.organization_id,
      profile_id: request.employee_id,
      entity_type: "leave_request",
      entity_id: requestId,
      action: status,
      old_value: {
        status: request.status,
        start_date: request.start_date,
        end_date: request.end_date,
        leave_type: request.leave_type,
      },
      new_value: { status, reviewed_by: userProfile.id },
      comment: comment ?? null,
    });

    toast({
      title: "Succès",
      description: `Demande ${status === "approved" ? "approuvée" : "rejetée"}`,
    });


    // Send email notification to employee
    if (request.employee?.email) {
      const employeeName = request.employee.prenom && request.employee.nom
        ? `${request.employee.prenom} ${request.employee.nom}`
        : request.employee.full_name || "";
      
      sendLeaveNotification({
        type: status,
        employeeName,
        employeeEmail: request.employee.email,
        leaveType: request.leave_type,
        startDate: formatDate(request.start_date),
        endDate: formatDate(request.end_date),
        reviewComment: comment,
        reviewerName: getEmployeeName(userProfile),
      });
    }
    
    fetchRequests();
    return { error: null };
  };

  const cancelRequest = async (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    const { error } = await supabase
      .from("leave_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId);

    if (error) {
      console.error("Error cancelling leave request:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la demande",
        variant: "destructive",
      });
      return { error };
    }

    if (request) {
      await logHrEvent({
        organization_id: request.organization_id,
        profile_id: request.employee_id,
        entity_type: "leave_request",
        entity_id: requestId,
        action: "cancelled",
        old_value: { status: request.status },
        new_value: { status: "cancelled" },
      });
    }

    toast({
      title: "Succès",
      description: "Demande annulée",
    });

    
    fetchRequests();
    return { error: null };
  };

  return {
    requests,
    loading,
    userProfile,
    createRequest,
    updateRequestStatus,
    cancelRequest,
    refetch: fetchRequests,
  };
}
