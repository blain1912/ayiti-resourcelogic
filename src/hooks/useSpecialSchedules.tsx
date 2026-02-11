import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SpecialSchedule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleAssignment {
  id: string;
  schedule_id: string;
  profile_id: string;
  organization_id: string;
  work_days: number[];
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    prenom: string | null;
    nom: string | null;
    photo_url: string | null;
    unit_id: string | null;
  };
}

export function useSpecialSchedules() {
  const [schedules, setSchedules] = useState<SpecialSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSchedules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from("special_schedules")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSchedules((data as SpecialSchedule[]) || []);
    } catch (error: any) {
      console.error("Error fetching schedules:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const createSchedule = async (data: {
    name: string;
    description?: string;
    start_date: string;
    end_date?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error("Pas d'organisation");

      const { error } = await supabase.from("special_schedules").insert({
        organization_id: profile.organization_id,
        name: data.name,
        description: data.description || null,
        start_date: data.start_date,
        end_date: data.end_date || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast({ title: "Horaire spécial créé avec succès" });
      await fetchSchedules();
      return true;
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const updateSchedule = async (id: string, updates: Partial<SpecialSchedule>) => {
    try {
      const { error } = await supabase
        .from("special_schedules")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Horaire mis à jour" });
      await fetchSchedules();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase
        .from("special_schedules")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Horaire supprimé" });
      await fetchSchedules();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const fetchAssignments = async (scheduleId: string) => {
    try {
      const { data, error } = await supabase
        .from("special_schedule_assignments")
        .select("*")
        .eq("schedule_id", scheduleId);

      if (error) throw error;

      // Fetch profiles separately
      const profileIds = (data || []).map((a: any) => a.profile_id);
      let profiles: any[] = [];
      if (profileIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, prenom, nom, photo_url, unit_id")
          .in("id", profileIds);
        profiles = profileData || [];
      }

      return ((data || []) as ScheduleAssignment[]).map(a => ({
        ...a,
        profile: profiles.find((p: any) => p.id === a.profile_id),
      }));
    } catch (error: any) {
      console.error("Error fetching assignments:", error);
      return [];
    }
  };

  const assignEmployee = async (scheduleId: string, data: {
    profile_id: string;
    work_days: number[];
    start_time: string;
    end_time: string;
    notes?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error("Pas d'organisation");

      const { error } = await supabase.from("special_schedule_assignments").insert({
        schedule_id: scheduleId,
        profile_id: data.profile_id,
        organization_id: profile.organization_id,
        work_days: data.work_days,
        start_time: data.start_time,
        end_time: data.end_time,
        notes: data.notes || null,
      });

      if (error) throw error;
      toast({ title: "Employé assigné avec succès" });
      return true;
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const assignUnit = async (scheduleId: string, unitId: string, data: {
    work_days: number[];
    start_time: string;
    end_time: string;
    notes?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error("Pas d'organisation");

      // Get all employees in the unit
      const { data: unitEmployees, error: empError } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .eq("unit_id", unitId)
        .eq("approval_status", "approved");

      if (empError) throw empError;
      if (!unitEmployees || unitEmployees.length === 0) {
        toast({ title: "Aucun employé dans cette unité", variant: "destructive" });
        return false;
      }

      // Get existing assignments to avoid duplicates
      const { data: existing } = await supabase
        .from("special_schedule_assignments")
        .select("profile_id")
        .eq("schedule_id", scheduleId);
      const existingIds = new Set((existing || []).map((e: any) => e.profile_id));

      const newAssignments = unitEmployees
        .filter(e => !existingIds.has(e.id))
        .map(e => ({
          schedule_id: scheduleId,
          profile_id: e.id,
          organization_id: profile.organization_id!,
          work_days: data.work_days,
          start_time: data.start_time,
          end_time: data.end_time,
          notes: data.notes || null,
        }));

      if (newAssignments.length === 0) {
        toast({ title: "Tous les employés de cette unité sont déjà assignés" });
        return true;
      }

      const { error } = await supabase.from("special_schedule_assignments").insert(newAssignments);
      if (error) throw error;

      toast({ title: `${newAssignments.length} employé(s) assigné(s) avec succès` });
      return true;
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("special_schedule_assignments")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
      toast({ title: "Assignation supprimée" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  return {
    schedules,
    loading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    fetchAssignments,
    assignEmployee,
    assignUnit,
    removeAssignment,
    refetch: fetchSchedules,
  };
}
