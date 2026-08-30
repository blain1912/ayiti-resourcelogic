// Pointage sécurisé GRHPro — QR central, QR individuel et validation serveur.
// Toute la validation (organisation, agent, permission, token, statut, méthode, anti-double)
// est réalisée côté serveur : les données envoyées par le client ne sont jamais reprises telles quelles.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HR_ROLES = [
  "admin",
  "directeur_general",
  "directeur_administratif",
  "directeur_rh",
  "secretaire",
];

const PRESENT_LATE = (late: number) => (late > 0 ? "retard" : "present");

const toMinutes = (t?: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return json({ error: "Non authentifié" }, 401);

    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body.token;
    const requestedType: string | undefined = body.punch_type;
    if (!token) return json({ error: "Token de pointage manquant" }, 400);

    // 1) Token
    const { data: qrToken } = await admin
      .from("attendance_qr_tokens")
      .select("id, organization_id, scope, profile_id, status")
      .eq("token", token)
      .maybeSingle();

    if (!qrToken || qrToken.status !== "active") {
      return json({ error: "QR code invalide ou révoqué." }, 403);
    }

    // 2) Profil de l'utilisateur connecté
    const { data: actorProfile } = await admin
      .from("profiles")
      .select("id, full_name, organization_id, unit_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: actorRoles } = await admin
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", user.id);

    const isHr = (actorRoles || []).some(
      (r: { role: string; organization_id: string | null }) =>
        r.organization_id === qrToken.organization_id && HR_ROLES.includes(r.role)
    );

    // 3) Paramètres de l'organisation
    const { data: settings } = await admin
      .from("attendance_settings")
      .select("*")
      .eq("organization_id", qrToken.organization_id)
      .maybeSingle();

    const centralEnabled = settings ? settings.central_qr_enabled : false;
    const individualEnabled = settings ? settings.individual_qr_enabled : false;
    const antiDouble = settings?.anti_double_seconds ?? 60;

    // 4) Détermination de l'agent pointé + contrôle multi-tenant
    let targetProfileId: string;
    let method: string;

    if (qrToken.scope === "central") {
      if (!centralEnabled) return json({ error: "Le pointage par QR central est désactivé." }, 403);
      if (!actorProfile || actorProfile.organization_id !== qrToken.organization_id) {
        return json({ error: "Ce QR code appartient à une autre organisation." }, 403);
      }
      targetProfileId = actorProfile.id;
      method = "qr_central";
    } else {
      if (!individualEnabled) return json({ error: "Le pointage par QR individuel est désactivé." }, 403);
      const isSelf = actorProfile?.id === qrToken.profile_id;
      if (!isSelf && !isHr) {
        return json({ error: "Vous n'êtes pas autorisé à scanner ce QR code." }, 403);
      }
      targetProfileId = qrToken.profile_id as string;
      method = "qr_individuel";
    }

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id, full_name, organization_id, unit_id")
      .eq("id", targetProfileId)
      .maybeSingle();

    if (!targetProfile || targetProfile.organization_id !== qrToken.organization_id) {
      return json({ error: "Agent introuvable dans cette organisation." }, 403);
    }

    const organizationId = qrToken.organization_id;
    const now = new Date();

    // 5) Anti-double pointage
    const { data: lastPunch } = await admin
      .from("attendance_punches")
      .select("id, punch_type, punched_at, date")
      .eq("profile_id", targetProfileId)
      .eq("is_deleted", false)
      .order("punched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastPunch) {
      const elapsed = (now.getTime() - new Date(lastPunch.punched_at).getTime()) / 1000;
      if (elapsed < antiDouble) {
        return json(
          {
            error: "Pointage déjà enregistré récemment.",
            code: "anti_double",
            retry_in_seconds: Math.ceil(antiDouble - elapsed),
          },
          429
        );
      }
    }

    // 6) Date locale de l'organisation transmise par le client, sinon UTC
    const localDate: string =
      typeof body.local_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.local_date)
        ? body.local_date
        : now.toISOString().slice(0, 10);
    const localTime: string =
      typeof body.local_time === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(body.local_time)
        ? body.local_time.length === 5
          ? `${body.local_time}:00`
          : body.local_time
        : now.toISOString().slice(11, 19);

    // 7) Arrivée / départ
    const { data: dayPunches } = await admin
      .from("attendance_punches")
      .select("punch_type")
      .eq("profile_id", targetProfileId)
      .eq("date", localDate)
      .eq("is_deleted", false)
      .order("punched_at", { ascending: true });

    const validTypes = ["arrivee", "depart", "pause", "reprise", "sortie_temporaire", "retour"];
    let punchType = validTypes.includes(requestedType || "") ? (requestedType as string) : null;
    if (!punchType) {
      const hasArrival = (dayPunches || []).some((p: { punch_type: string }) => p.punch_type === "arrivee");
      punchType = hasArrival ? "depart" : "arrivee";
    }

    // 8) Moteur RH central : horaire applicable + congé / mission / autorisation
    //    C'est la source de vérité serveur pour l'heure attendue et la tolérance.
    const { data: hrStatusRaw } = await admin.rpc("hr_day_status", {
      _profile_id: targetProfileId,
      _date: localDate,
    });
    const hr = (hrStatusRaw || {}) as {
      status?: string;
      detail?: string | null;
      expected_arrival?: string | null;
      expected_departure?: string | null;
      tolerance_minutes?: number | null;
    };

    // Repli sur les horaires bruts si le moteur ne renvoie pas d'heure attendue
    const { data: schedules } = await admin
      .from("work_schedules")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    const schedule =
      (schedules || []).find((s: any) => s.scope === "profile" && s.profile_id === targetProfileId) ||
      (schedules || []).find(
        (s: any) => s.scope === "unit" && targetProfile.unit_id && s.unit_id === targetProfile.unit_id
      ) ||
      (schedules || []).find((s: any) => s.scope === "organization") ||
      null;

    const tolerance = hr.tolerance_minutes ?? schedule?.tolerance_minutes ?? 15;
    const expected =
      punchType === "depart"
        ? hr.expected_departure ?? schedule?.departure_time ?? null
        : hr.expected_arrival ?? schedule?.arrival_time ?? null;

    // Un agent en congé / mission / autorisation journée complète, un jour férié
    // ou un jour non travaillé ne peut pas générer de retard.
    const noLateStatuses = ["leave", "mission", "authorization", "holiday", "non_working_day", "suspended"];
    const hrJustified = noLateStatuses.includes(hr.status || "");

    let lateMinutes = 0;
    if (punchType === "arrivee" && !hrJustified) {
      const actual = toMinutes(localTime);
      const exp = toMinutes(expected);
      if (actual !== null && exp !== null) lateMinutes = Math.max(0, actual - (exp + tolerance));
    }


    // 9) Enregistrement du pointage
    const { data: punch, error: punchError } = await admin
      .from("attendance_punches")
      .insert({
        organization_id: organizationId,
        profile_id: targetProfileId,
        date: localDate,
        punch_time: localTime,
        punch_type: punchType,
        method,
        expected_time: expected,
        tolerance_minutes: tolerance,
        late_minutes: lateMinutes,
        token_id: qrToken.id,
        recorded_by: user.id,
      })
      .select()
      .single();

    if (punchError) return json({ error: punchError.message }, 400);

    // 10) Synchronisation de la feuille de présence journalière
    const { data: existing } = await admin
      .from("attendance")
      .select("id, status, check_in_time, late_minutes")
      .eq("profile_id", targetProfileId)
      .eq("date", localDate)
      .maybeSingle();

    if (punchType === "arrivee") {
      // Le statut RH justifié prime sur "present"/"retard"
      const status =
        hr.status === "leave"
          ? "conge"
          : hr.status === "mission"
          ? "mission"
          : hr.status === "authorization"
          ? "permission"
          : PRESENT_LATE(lateMinutes);
      if (existing) {
        await admin
          .from("attendance")
          .update({
            status,
            time: localTime,
            check_in_time: localTime,
            method,
            expected_time: expected,
            tolerance_minutes: tolerance,
            late_minutes: lateMinutes,
          })
          .eq("id", existing.id);
      } else {
        await admin.from("attendance").insert({
          organization_id: organizationId,
          profile_id: targetProfileId,
          date: localDate,
          status,
          time: localTime,
          check_in_time: localTime,
          method,
          expected_time: expected,
          tolerance_minutes: tolerance,
          late_minutes: lateMinutes,
          marked_by: user.id,
        });
      }
    } else if (punchType === "depart") {
      if (existing) {
        await admin
          .from("attendance")
          .update({ check_out_time: localTime, method })
          .eq("id", existing.id);
      } else {
        await admin.from("attendance").insert({
          organization_id: organizationId,
          profile_id: targetProfileId,
          date: localDate,
          status: "present",
          time: localTime,
          check_out_time: localTime,
          method,
          marked_by: user.id,
        });
      }
    }

    // 11) Audit
    await admin.from("attendance_audit_log").insert({
      organization_id: organizationId,
      profile_id: targetProfileId,
      actor_user_id: user.id,
      action: "pointage_qr",
      method,
      new_value: {
        punch_type: punchType,
        date: localDate,
        time: localTime,
        late_minutes: lateMinutes,
      },
    });

    return json({
      success: true,
      punch,
      punch_type: punchType,
      late_minutes: lateMinutes,
      employee_name: targetProfile.full_name,
      method,
    });
  } catch (error) {
    console.error("attendance-punch error", error);
    return json({ error: error instanceof Error ? error.message : "Erreur inattendue" }, 500);
  }
});
