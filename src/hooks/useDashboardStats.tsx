import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { startOfMonth, endOfMonth, format } from "date-fns";

export interface DashboardStats {
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

export const useDashboardStats = () => {
  const { organization } = useOrganization();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id) {
      fetchStats();
    }
  }, [organization?.id]);

  const fetchStats = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      const today = format(new Date(), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

      // Get total employees
      const { count: totalEmployees } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .eq("approval_status", "approved");

      // Get today's attendance
      const { data: todayAttendance } = await supabase
        .from("attendance")
        .select("status")
        .eq("organization_id", organization.id)
        .eq("date", today);

      const presentToday = todayAttendance?.filter((a) => a.status === "present").length || 0;
      const absentToday = todayAttendance?.filter((a) => a.status === "absent").length || 0;
      const onLeaveToday = todayAttendance?.filter((a) => ["conge", "maladie"].includes(a.status)).length || 0;

      const attendanceRate = totalEmployees ? Math.round((presentToday / (totalEmployees || 1)) * 100) : 0;

      // Get monthly attendance for chart
      const { data: monthlyData } = await supabase
        .from("attendance")
        .select("date, status")
        .eq("organization_id", organization.id)
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

      // Get recent activity
      const { data: recentActivity } = await supabase
        .from("attendance")
        .select(`
          profile_id,
          status,
          date,
          created_at,
          profiles!inner(full_name)
        `)
        .eq("organization_id", organization.id)
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
        totalEmployees: totalEmployees || 0,
        presentToday,
        absentToday,
        onLeaveToday,
        attendanceRate,
        monthlyAttendance,
        recentActivity: formattedActivity,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
};
