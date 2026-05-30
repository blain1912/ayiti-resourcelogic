import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import {
  normalizePolicy,
  computeAnnualLeaveDays,
  type LeavePolicy,
} from "@/lib/leavePolicy";

type LeaveType = Database["public"]["Enums"]["leave_type"];

export interface LeaveBalance {
  id: string;
  organization_id: string;
  employee_id: string;
  leave_type: LeaveType;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

interface RawLeaveBalance {
  id: string;
  organization_id: string;
  employee_id: string;
  leave_type: LeaveType;
  year: number;
  total_days: number;
  used_days: number;
}

function defaultsFromPolicy(
  policy: LeavePolicy,
  dateEntreeFonction?: string | null
): Record<LeaveType, number> {
  return {
    conge_annuel: computeAnnualLeaveDays(policy, dateEntreeFonction),
    conge_maladie: policy.sick_days,
    conge_maternite: policy.maternity_days,
    conge_paternite: policy.paternity_days,
    conge_sans_solde: 0,
    conge_exceptionnel: policy.exceptional_days,
    conge_etudes: policy.study_days,
  };
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  conge_annuel: "Congé Annuel",
  conge_maladie: "Congé Maladie",
  conge_maternite: "Congé Maternité",
  conge_paternite: "Congé Paternité",
  conge_sans_solde: "Congé Sans Solde",
  conge_exceptionnel: "Congé Exceptionnel",
  conge_etudes: "Congé Études",
};


export function useLeaveBalances(employeeId?: string) {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (employeeId) {
      fetchBalances();
    } else {
      fetchCurrentUserBalances();
    }
  }, [employeeId]);

  const fetchCurrentUserBalances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        await fetchBalancesForEmployee(profile.id, profile.organization_id);
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    if (!employeeId) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", employeeId)
        .maybeSingle();

      if (profile) {
        await fetchBalancesForEmployee(employeeId, profile.organization_id);
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalancesForEmployee = async (empId: string, orgId: string | null) => {
    if (!orgId) return;

    // Fetch employee seniority + org leave policy in parallel
    const [profileRes, orgRes, balancesRes] = await Promise.all([
      supabase.from("profiles").select("date_entree_fonction").eq("id", empId).maybeSingle(),
      supabase.from("organizations").select("leave_policy").eq("id", orgId).maybeSingle(),
      supabase.from("leave_balances").select("*").eq("employee_id", empId).eq("year", currentYear),
    ]);

    if (balancesRes.error) {
      console.error("Error fetching leave balances:", balancesRes.error);
      return;
    }

    const policy = normalizePolicy((orgRes.data as any)?.leave_policy);
    const defaults = defaultsFromPolicy(policy, (profileRes.data as any)?.date_entree_fonction);

    const leaveTypes: LeaveType[] = [
      "conge_annuel",
      "conge_maladie",
      "conge_maternite",
      "conge_paternite",
      "conge_sans_solde",
      "conge_exceptionnel",
      "conge_etudes",
    ];

    const allBalances: LeaveBalance[] = leaveTypes.map((leaveType) => {
      const existing = (balancesRes.data as RawLeaveBalance[] || []).find(
        (b) => b.leave_type === leaveType
      );

      const totalDays = existing?.total_days ?? defaults[leaveType];
      const usedDays = existing?.used_days || 0;

      return {
        id: existing?.id || `temp-${leaveType}`,
        organization_id: orgId,
        employee_id: empId,
        leave_type: leaveType,
        year: currentYear,
        total_days: totalDays,
        used_days: usedDays,
        remaining_days: Math.max(0, totalDays - usedDays),
      };
    });

    setBalances(allBalances);
  };


  const updateBalance = async (
    employeeId: string,
    leaveType: LeaveType,
    totalDays: number
  ) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", employeeId)
      .maybeSingle();

    if (!profile?.organization_id) {
      toast({
        title: "Erreur",
        description: "Impossible de trouver l'organisation",
        variant: "destructive",
      });
      return { error: "Organization not found" };
    }

    const { error } = await supabase
      .from("leave_balances")
      .upsert(
        {
          organization_id: profile.organization_id,
          employee_id: employeeId,
          leave_type: leaveType,
          year: currentYear,
          total_days: totalDays,
        },
        {
          onConflict: "employee_id,leave_type,year",
        }
      );

    if (error) {
      console.error("Error updating balance:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le solde",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Succès",
      description: "Solde de congé mis à jour",
    });

    await fetchBalances();
    return { error: null };
  };

  return {
    balances,
    loading,
    updateBalance,
    refetch: employeeId ? fetchBalances : fetchCurrentUserBalances,
  };
}
