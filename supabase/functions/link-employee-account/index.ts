// Gestion du lien entre PROFIL AGENT (registre RH) et COMPTE UTILISATEUR (GRHPro)
// Actions : merge | invite | resend | revoke | suspend | reactivate
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INVITE_TTL_DAYS = 7;

// Rôles applicatifs pouvant être attribués via une invitation (jamais Super administrateur)
const ASSIGNABLE_ROLES = [
  "employe",
  "secretaire",
  "secretaire_academique",
  "approbateur_conges",
  "directeur_rh",
  "directeur_administratif",
  "directeur_general",
];

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
    if (!["merge", "invite", "resend", "revoke", "suspend", "reactivate"].includes(action)) {
      return json({ error: "Action invalide" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Non authentifié" }, 401);

    const admin = createClient(url, serviceKey);

    // Isolation multi-tenant : le demandeur doit avoir un rôle de direction/RH DANS l'organisation ciblée
    const callerRoles = async (orgId: string) => {
      const { data } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", orgId);
      return (data || []).map((r: any) => r.role as string);
    };
    const isAllowed = async (orgId: string) => {
      const roles = await callerRoles(orgId);
      return roles.some((r) =>
        ["admin", "directeur_general", "directeur_administratif", "directeur_rh"].includes(r)
      );
    };

    const audit = async (
      orgId: string,
      profileId: string | null,
      act: string,
      oldValue?: string | null,
      newValue?: string | null,
      details: Record<string, unknown> = {},
    ) => {
      await admin.from("account_audit_log").insert({
        organization_id: orgId,
        profile_id: profileId,
        actor_user_id: user.id,
        action: act,
        old_value: oldValue ?? null,
        new_value: newValue ?? null,
        details,
      });
    };

    // ---------- MERGE : rattacher une inscription à une fiche agent existante ----------
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

      const { error: delErr } = await admin.from("profiles").delete().eq("id", signup_profile_id);
      if (delErr) return json({ error: "Suppression du doublon impossible: " + delErr.message }, 400);

      const updates: any = {
        user_id: newUserId,
        email: signup.email || target.email,
        approval_status: "approved",
        account_status: "active",
      };
      if (!target.photo_url && signup.photo_url) updates.photo_url = signup.photo_url;

      const { error: upErr } = await admin.from("profiles").update(updates).eq("id", target_profile_id);
      if (upErr) return json({ error: "Liaison impossible: " + upErr.message }, 400);

      if (oldUserId && oldUserId !== newUserId) {
        const { data: oldUser } = await admin.auth.admin.getUserById(oldUserId);
        const isTechnical = (oldUser?.user?.email || "").endsWith(".imported.local");
        if (isTechnical) {
          await admin.from("user_roles").delete().eq("user_id", oldUserId);
          await admin.auth.admin.deleteUser(oldUserId);
        }
      }

      await audit(target.organization_id, target_profile_id, "account_linked", oldUserId, newUserId);
      return json({ success: true, profile_id: target_profile_id });
    }

    // ---------- Actions sur une fiche agent ----------
    const { profile_id } = body;
    if (!profile_id) return json({ error: "Paramètres manquants" }, 400);

    const { data: prof } = await admin
      .from("profiles")
      .select("id, user_id, organization_id, full_name, email, account_status")
      .eq("id", profile_id)
      .single();
    if (!prof) return json({ error: "Fiche introuvable" }, 404);
    if (!prof.organization_id || !(await isAllowed(prof.organization_id))) {
      return json({ error: "Accès refusé" }, 403);
    }
    const orgId = prof.organization_id as string;

    // ---------- REVOKE : annuler une invitation non utilisée ----------
    if (action === "revoke") {
      if (prof.account_status === "active") {
        return json({ error: "Ce compte est déjà activé : utilisez la suspension." }, 400);
      }
      if (prof.user_id) {
        await admin.from("user_roles").delete().eq("user_id", prof.user_id);
        await admin.auth.admin.deleteUser(prof.user_id);
      }
      await admin
        .from("profiles")
        .update({
          user_id: null,
          account_status: "no_account",
          invitation_sent_at: null,
          invitation_expires_at: null,
          invited_by: null,
        })
        .eq("id", profile_id);
      await audit(orgId, profile_id, "invitation_revoked", prof.account_status, "no_account");
      return json({ success: true, account_status: "no_account" });
    }

    // ---------- SUSPEND / REACTIVATE ----------
    if (action === "suspend" || action === "reactivate") {
      if (!prof.user_id) return json({ error: "Cet agent n'a pas encore de compte" }, 400);
      const suspend = action === "suspend";
      const { error: banErr } = await admin.auth.admin.updateUserById(prof.user_id, {
        ban_duration: suspend ? "876000h" : "none",
      } as any);
      if (banErr) return json({ error: banErr.message }, 400);
      const newStatus = suspend ? "suspended" : "active";
      await admin.from("profiles").update({ account_status: newStatus }).eq("id", profile_id);
      await audit(
        orgId,
        profile_id,
        suspend ? "account_suspended" : "account_reactivated",
        prof.account_status,
        newStatus,
      );
      return json({ success: true, account_status: newStatus });
    }

    // ---------- INVITE / RESEND ----------
    const email = (body.email || prof.email || "").trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "Email invalide" }, 400);
    }

    // Rôle applicatif (jamais déduit du poste, jamais Super administrateur)
    let role: string | null = body.role ?? null;
    if (role) {
      if (!ASSIGNABLE_ROLES.includes(role)) {
        return json({ error: "Rôle non attribuable via une invitation" }, 400);
      }
      const roles = await callerRoles(orgId);
      const isOrgAdmin = roles.some((r) => ["admin", "directeur_general", "directeur_rh"].includes(r));
      if (!isOrgAdmin && role !== "employe") {
        return json({ error: "Vous ne pouvez attribuer que le rôle Employé" }, 403);
      }
    }

    // Un compte existe déjà pour cette adresse ?
    let userId = prof.user_id as string | null;
    if (userId) {
      const { error: emailErr } = await admin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
      });
      if (emailErr) return json({ error: "Impossible de définir l'email: " + emailErr.message }, 400);
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: prof.full_name, organization_id: orgId },
      });
      if (createErr || !created?.user) {
        return json({ error: "Création du compte impossible: " + (createErr?.message || "") }, 400);
      }
      userId = created.user.id;
      // Le trigger handle_new_user peut avoir créé une fiche parasite : la supprimer
      await admin.from("profiles").delete().eq("user_id", userId).neq("id", profile_id);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 86400000);

    await admin
      .from("profiles")
      .update({
        user_id: userId,
        email,
        approval_status: "approved",
        account_status: "invitation_sent",
        invitation_sent_at: now.toISOString(),
        invitation_expires_at: expiresAt.toISOString(),
        invited_by: user.id,
      })
      .eq("id", profile_id);

    // Rôle applicatif toujours attaché à l'organisation de l'agent (jamais organization_id NULL)
    if (role && userId) {
      await admin.from("user_roles").delete().eq("user_id", userId).eq("organization_id", orgId);
      await admin.from("user_roles").insert({ user_id: userId, role, organization_id: orgId });
      await audit(orgId, profile_id, "role_changed", null, role);
    }

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
          subject: "Activez votre compte GRHPro",
          html: `<p>Bonjour ${prof.full_name || ""},</p>
<p>Votre fiche agent est prête. Cliquez sur le lien ci-dessous pour définir votre mot de passe et accéder à votre espace :</p>
<p><a href="${actionLink}">Activer mon compte</a></p>
<p>Ce lien est personnel et expire le ${expiresAt.toLocaleDateString("fr-FR")}.</p>`,
        }),
      });
      emailSent = resp.ok;
      if (!resp.ok) console.error("Resend error:", await resp.text());
    }

    await audit(
      orgId,
      profile_id,
      action === "resend" ? "invitation_resent" : "invitation_created",
      prof.account_status,
      "invitation_sent",
      { email, email_sent: emailSent },
    );

    return json({
      success: true,
      email_sent: emailSent,
      action_link: actionLink,
      account_status: "invitation_sent",
      invitation_expires_at: expiresAt.toISOString(),
    });
  } catch (e: any) {
    console.error("link-employee-account error:", e);
    return json({ error: e.message }, 500);
  }
});
