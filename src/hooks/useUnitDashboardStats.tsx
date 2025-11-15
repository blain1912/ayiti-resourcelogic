import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

export interface UnitDashboardStats {
  unitName: string;
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  attendanceRate: number;
  monthlyAttendance: Array<{ date: string; present: number; absent: number }>;
  recentActivity: Array<{
    profile_id: string;
    full_name: string;
    status: string;
    date: string;
    created_at: string;
  }>;
}

export const useUnitDashboardStats = (unitId: string | undefined) => {
  const [stats, setStats] = useState<UnitDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (unitId) {
      fetchStats();
    }
  }, [unitId]);

  const fetchStats = async () => {
    if (!unitId) return;

    try {
      setLoading(true);
      const today = format(new Date(), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

      // Get unit info
      const { data: unit } = await supabase
        .from("organizational_units")
        .select("name")
        .eq("id", unitId)
        .single();

      // Get total employees in this unit
      const { count: totalEmployees } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("unit_id", unitId)
        .eq("approval_status", "approved");

      // Get today's attendance for employees in this unit
      const { data: todayAttendance } = await supabase
        .from("attendance")
        .select("status, profiles!inner(unit_id)")
        .eq("profiles.unit_id", unitId)
        .eq("date", today);

      const presentToday = todayAttendance?.filter((a) => a.status === "present").length || 0;
      const absentToday = todayAttendance?.filter((a) => a.status === "absent").length || 0;
      const onLeaveToday = todayAttendance?.filter((a) => ["conge", "maladie"].includes(a.status)).length || 0;

      const attendanceRate = totalEmployees ? Math.round((presentToday / (totalEmployees || 1)) * 100) : 0;

      // Get monthly attendance for chart
      const { data: monthlyData } = await supabase
        .from("attendance")
        .select("date, status, profiles!inner(unit_id)")
        .eq("profiles.unit_id", unitId)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date");

      // Group by date
      const attendanceByDate = monthlyData?.reduce((acc: any, curr) => {
        if (!acc[curr.date]) {
          acc[curr.date] = { date: curr.date, present: 0, absent: 0 };
        }
        if (curr.status === "present") acc[curr.date].present++;
        else acc[curr.date].absent++;
        return acc;
      }, {});

      const monthlyAttendance = Object.values(attendanceByDate || {}).slice(-7) as any[];

      // Get recent activity for this unit
      const { data: recentActivity } = await supabase
        .from("attendance")
        .select(`
          profile_id,
          status,
          date,
          created_at,
          profiles!inner(full_name, unit_id)
        `)
        .eq("profiles.unit_id", unitId)
        .order("created_at", { ascending: false })
        .limit(5);

      const formattedActivity = recentActivity?.map((activity: any) => ({
        profile_id: activity.profile_id,
        full_name: activity.profiles.full_name || "Employé",
        status: activity.status,
        date: activity.date,
        created_at: activity.created_at,
      })) || [];

      setStats({
        unitName: unit?.name || "Unité",
        totalEmployees: totalEmployees || 0,
        presentToday,
        absentToday,
        onLeaveToday,
        attendanceRate,
        monthlyAttendance,
        recentActivity: formattedActivity,
      });
    } catch (error) {
      console.error("Error fetching unit dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
};
