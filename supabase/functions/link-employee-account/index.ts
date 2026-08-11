// Link a real user account to an existing employee record (merge) or invite an imported employee
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const body = await req.json();
    const action: string = body.action;
    if (!["merge", "invite"].includes(action)) return json({ error: "Action invalide" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Non authentifié" }, 401);

    const admin = createClient(url, serviceKey);

    const isAllowed = async (orgId: string) => {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", orgId);
      return !!roles?.some((r: any) =>
        ["admin", "directeur_general", "directeur_administratif", "directeur_rh"].includes(r.role)
      );
    };

    // ---------- MERGE: attach a new signup to an existing employee record ----------
    if (action === "merge") {
      const { signup_profile_id, target_profile_id } = body;
      if (!signup_profile_id || !target_profile_id) return json({ error: "Paramètres manquants" }, 400);
      if (signup_profile_id === target_profile_id) return json({ error: "Fiches identiques" }, 400);

      const { data: profs } = await admin
        .from("profiles")
        .select("id, user_id, email, organization_id, full_name, photo_url")
        .in("id", [signup_profile_id, target_profile_id]);

      const signup = profs?.find((p: any) => p.id === signup_profile_id);
      const target = profs?.find((p: any) => p.id === target_profile_id);
      if (!signup || !target) return json({ error: "Fiche introuvable" }, 404);
      if (!target.organization_id || target.organization_id !== signup.organization_id) {
        return json({ error: "Les deux fiches doivent appartenir à la même organisation" }, 400);
      }
      if (!(await isAllowed(target.organization_id))) return json({ error: "Accès refusé" }, 403);

      const oldUserId = target.user_id;
      const newUserId = signup.user_id;

      // Free the unique user_id by removing the duplicate signup profile
      const { error: delErr } = await admin.from("profiles").delete().eq("id", signup_profile_id);
      if (delErr) return json({ error: "Suppression du doublon impossible: " + delErr.message }, 400);

      const updates: any = {
        user_id: newUserId,
        email: signup.email || target.email,
        approval_status: "approved",
      };
      if (!target.photo_url && signup.photo_url) updates.photo_url = signup.photo_url;

      const { error: upErr } = await admin.from("profiles").update(updates).eq("id", target_profile_id);
      if (upErr) return json({ error: "Liaison impossible: " + upErr.message }, 400);

      // Move roles from the technical account to the real account
      if (oldUserId && oldUserId !== newUserId) {
        const { data: oldUser } = await admin.auth.admin.getUserById(oldUserId);
        const isTechnical = (oldUser?.user?.email || "").endsWith(".imported.local");
        if (isTechnical) {
          await admin.from("user_roles").delete().eq("user_id", oldUserId);
          await admin.auth.admin.deleteUser(oldUserId);
        }
      }

      return json({ success: true, profile_id: target_profile_id });
    }

    // ---------- INVITE: give a real email/login to an imported employee record ----------
    const { profile_id, email } = body;
    if (!profile_id || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "Email invalide" }, 400);
    }

    const { data: prof } = await admin
      .from("profiles")
      .select("id, user_id, organization_id, full_name")
      .eq("id", profile_id)
      .single();
    if (!prof) return json({ error: "Fiche introuvable" }, 404);
    if (!prof.organization_id || !(await isAllowed(prof.organization_id))) {
      return json({ error: "Accès refusé" }, 403);
    }

    const { error: emailErr } = await admin.auth.admin.updateUserById(prof.user_id, {
      email,
      email_confirm: true,
    });
    if (emailErr) return json({ error: "Impossible de définir l'email: " + emailErr.message }, 400);

    await admin.from("profiles").update({ email, approval_status: "approved" }).eq("id", profile_id);

    const siteUrl = req.headers.get("origin") || "";
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });
    if (linkErr) return json({ error: "Lien impossible: " + linkErr.message }, 400);

    const actionLink = linkData?.properties?.action_link;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendKey && actionLink) {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "AYITI RH <onboarding@resend.dev>",
          to: [email],
          subject: "Activez votre compte AYITI RH",
          html: `<p>Bonjour ${prof.full_name || ""},</p>
<p>Votre fiche employé est prête. Cliquez sur le lien ci-dessous pour définir votre mot de passe et accéder à votre espace :</p>
<p><a href="${actionLink}">Activer mon compte</a></p>
<p>Ce lien est personnel et temporaire.</p>`,
        }),
      });
      emailSent = resp.ok;
      if (!resp.ok) console.error("Resend error:", await resp.text());
    }

    return json({ success: true, email_sent: emailSent, action_link: actionLink });
  } catch (e: any) {
    console.error("link-employee-account error:", e);
    return json({ error: e.message }, 500);
  }
});
