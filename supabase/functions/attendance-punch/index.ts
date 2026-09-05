// Pointage sécurisé GRHPro — chaîne UNIQUE : QR -> scanner -> validation serveur
// -> contrôles métier (organisation, agent, permission, token, horaire, lieu)
// -> enregistrement -> audit.
// L'heure faisant foi est celle du SERVEUR. L'heure de l'appareil n'est conservée
// qu'à titre technique (audit / détection d'écart).
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

/** Date/heure locales d'une organisation ou d'un site, calculées côté serveur. */
const localParts = (instant: Date, timeZone: string) => {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(instant).map((p) => [p.type, p.value]));
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      time: `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}:${parts.second}`,
    };
  } catch {
    return {
      date: instant.toISOString().slice(0, 10),
      time: instant.toISOString().slice(11, 19),
    };
  }
};

const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
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
      .select("id, organization_id, scope, profile_id, status, site_id")
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
    const geoEnabled = settings?.geo_control_enabled === true;
    const offsitePolicy: string = settings?.offsite_policy || "autorise";
    const storeCoordinates = settings?.store_coordinates === true;

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

    // 6) SITE : le QR central porte le site ; sinon site principal de l'agent.
    let site: any = null;
    if (qrToken.site_id) {
      const { data } = await admin
        .from("work_sites")
        .select("*")
        .eq("id", qrToken.site_id)
        .eq("organization_id", organizationId)
        .maybeSingle();
      site = data;
    }
    if (!site) {
      const { data: links } = await admin
        .from("profile_work_sites")
        .select("site_id, site_role, work_sites(*)")
        .eq("profile_id", targetProfileId)
        .eq("is_current", true);
      const ordered = (links || []).sort((a: any, b: any) => {
        const rank = (r: string) => (r === "temporaire" ? 0 : r === "principal" ? 1 : 2);
        return rank(a.site_role) - rank(b.site_role);
      });
      site = ordered[0]?.work_sites ?? null;
    }

    // Sites autorisés de l'agent (pour distinguer HORS_SITE_AUTORISE de HORS_ZONE)
    const { data: allowedLinks } = await admin
      .from("profile_work_sites")
      .select("site_id, work_sites(*)")
      .eq("profile_id", targetProfileId)
      .eq("is_current", true);

    // 7) HORODATAGE SERVEUR — heure officielle dans le fuseau du site,
    //    à défaut celui de l'organisation, à défaut UTC.
    const { data: org } = await admin
      .from("organizations")
      .select("time_zone")
      .eq("id", organizationId)
      .maybeSingle();

    const timeZone = site?.time_zone || org?.time_zone || "UTC";
    const server = localParts(now, timeZone);
    const localDate = server.date;
    const localTime = server.time;

    const deviceReportedAt =
      typeof body.device_time === "string" && !Number.isNaN(Date.parse(body.device_time))
        ? new Date(body.device_time)
        : null;
    const deviceDriftSeconds = deviceReportedAt
      ? Math.round((deviceReportedAt.getTime() - now.getTime()) / 1000)
      : null;

    // 8) CONTRÔLE DE LIEU (uniquement si activé pour l'organisation)
    let locationStatus: string | null = null;
    let distance: number | null = null;
    let needsReview = false;
    const lat = typeof body.latitude === "number" ? body.latitude : null;
    const lon = typeof body.longitude === "number" ? body.longitude : null;
    const accuracy = typeof body.accuracy === "number" ? body.accuracy : null;

    if (geoEnabled) {
      if (!site || site.latitude === null || site.longitude === null) {
        locationStatus = "SITE_NON_CONFIGURE";
      } else if (lat === null || lon === null) {
        locationStatus = "LOCALISATION_INDISPONIBLE";
      } else {
        distance = distanceMeters(lat, lon, Number(site.latitude), Number(site.longitude));
        if (distance <= (site.radius_meters ?? 150) + (accuracy ?? 0)) {
          locationStatus = "SUR_SITE";
        } else {
          // un autre site autorisé de l'agent couvre-t-il la position ?
          const match = (allowedLinks || [])
            .map((l: any) => l.work_sites)
            .filter((s: any) => s && s.latitude !== null && s.longitude !== null)
            .find(
              (s: any) =>
                distanceMeters(lat, lon, Number(s.latitude), Number(s.longitude)) <=
                (s.radius_meters ?? 150) + (accuracy ?? 0)
            );
          if (match) {
            locationStatus = "HORS_SITE_AUTORISE";
            site = match;
            distance = distanceMeters(lat, lon, Number(match.latitude), Number(match.longitude));
          } else {
            locationStatus = "HORS_ZONE";
          }
        }
      }

      const outside =
        locationStatus === "HORS_ZONE" || locationStatus === "LOCALISATION_INDISPONIBLE";

      if (outside) {
        if (offsitePolicy === "interdit") {
          await admin.from("attendance_audit_log").insert({
            organization_id: organizationId,
            profile_id: targetProfileId,
            actor_user_id: user.id,
            action: "pointage_refuse_lieu",
            method,
            new_value: { location_status: locationStatus, distance_meters: distance },
          });
          return json(
            {
              error:
                locationStatus === "HORS_ZONE"
                  ? "Pointage refusé : vous n'êtes pas dans la zone autorisée du site."
                  : "Pointage refusé : localisation indisponible.",
              code: locationStatus,
              distance_meters: distance,
            },
            403
          );
        }
        if (offsitePolicy === "justification" || offsitePolicy === "approbation") {
          needsReview = true;
        }
      }
    }

    // 9) Arrivée / départ
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

    // 10) Moteur RH central : horaire applicable (spécial, enseignant, individuel,
    //     structure, organisation) + congé / mission / autorisation.
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

    const tolerance = hr.tolerance_minutes ?? 15;
    const expected =
      punchType === "depart" ? hr.expected_departure ?? null : hr.expected_arrival ?? null;

    const noLateStatuses = ["leave", "mission", "authorization", "holiday", "non_working_day", "suspended"];
    const hrJustified = noLateStatuses.includes(hr.status || "");

    let lateMinutes = 0;
    if (punchType === "arrivee" && !hrJustified) {
      const actual = toMinutes(localTime);
      const exp = toMinutes(expected);
      if (actual !== null && exp !== null) lateMinutes = Math.max(0, actual - (exp + tolerance));
    }

    // 11) Enregistrement du pointage (minimisation : coordonnées conservées
    //     uniquement si l'organisation l'a explicitement demandé)
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
        server_recorded_at: now.toISOString(),
        device_reported_at: deviceReportedAt?.toISOString() ?? null,
        device_drift_seconds: deviceDriftSeconds,
        site_id: site?.id ?? null,
        location_status: locationStatus,
        distance_meters: distance,
        location_accuracy_meters: geoEnabled ? accuracy : null,
        latitude: geoEnabled && storeCoordinates ? lat : null,
        longitude: geoEnabled && storeCoordinates ? lon : null,
        needs_review: needsReview,
      })
      .select()
      .single();

    if (punchError) return json({ error: punchError.message }, 400);

    // 12) Synchronisation de la feuille de présence journalière
    const { data: existing } = await admin
      .from("attendance")
      .select("id, status, check_in_time, late_minutes")
      .eq("profile_id", targetProfileId)
      .eq("date", localDate)
      .maybeSingle();

    if (punchType === "arrivee") {
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

    // 13) Audit
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
        time_zone: timeZone,
        late_minutes: lateMinutes,
        site_id: site?.id ?? null,
        location_status: locationStatus,
        distance_meters: distance,
        device_drift_seconds: deviceDriftSeconds,
        needs_review: needsReview,
      },
    });

    return json({
      success: true,
      punch,
      punch_type: punchType,
      late_minutes: lateMinutes,
      employee_name: targetProfile.full_name,
      method,
      time: localTime,
      date: localDate,
      time_zone: timeZone,
      site: site ? { id: site.id, name: site.name } : null,
      location_status: locationStatus,
      distance_meters: distance,
      needs_review: needsReview,
    });
  } catch (error) {
    console.error("attendance-punch error", error);
    return json({ error: error instanceof Error ? error.message : "Erreur inattendue" }, 500);
  }
});
