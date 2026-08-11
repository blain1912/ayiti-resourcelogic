// Create employee profiles from unmatched émargement rows
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const splitName = (full: string) => {
  // MEF format: "NOM, PRENOM AUTRES"
  const parts = full.split(",");
  if (parts.length >= 2) {
    return { nom: parts[0].trim(), prenom: parts.slice(1).join(" ").trim() };
  }
  const words = full.trim().split(/\s+/);
  return { nom: words[0] || full, prenom: words.slice(1).join(" ") };
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

    const { emargement_document_id } = await req.json();
    if (!emargement_document_id) return json({ error: "emargement_document_id requis" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Non authentifié" }, 401);

    const admin = createClient(url, serviceKey);

    const { data: doc } = await admin
      .from("emargement_documents")
      .select("id, organization_id")
      .eq("id", emargement_document_id)
      .single();
    if (!doc) return json({ error: "Document introuvable" }, 404);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", doc.organization_id);
    const allowed = ["admin", "directeur_general", "directeur_administratif", "directeur_rh"];
    if (!roles?.some((r: any) => allowed.includes(r.role))) return json({ error: "Accès refusé" }, 403);

    const { data: rows } = await admin
      .from("payroll_payments")
      .select("id, nif, nom_complet, poste, montant_brut, code_employe")
      .eq("emargement_document_id", emargement_document_id)
      .is("profile_id", null);

    if (!rows?.length) return json({ created: 0, linked: 0, skipped: 0, errors: [] });

    const { data: existing } = await admin
      .from("profiles")
      .select("id, nif, full_name")
      .eq("organization_id", doc.organization_id);

    const norm = (s: string) => s.replace(/\s|-/g, "");
    const byNif = new Map<string, string>();
    (existing || []).forEach((p: any) => { if (p.nif) byNif.set(norm(String(p.nif)), p.id); });

    let created = 0, linked = 0, skipped = 0;
    const errors: any[] = [];

    for (const r of rows) {
      const nifKey = r.nif ? norm(String(r.nif)) : "";
      // Already exists -> just link
      if (nifKey && byNif.has(nifKey)) {
        await admin.from("payroll_payments").update({ profile_id: byNif.get(nifKey) }).eq("id", r.id);
        linked++;
        continue;
      }
      if (!r.nom_complet || r.nom_complet === "—") { skipped++; continue; }

      const { nom, prenom } = splitName(r.nom_complet);
      const slug = `${prenom}.${nom}.${r.code_employe || r.nif || crypto.randomUUID().slice(0, 6)}`
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, "")
        .slice(0, 60);
      const email = `${slug}@emargement.imported.local`;

      try {
        const { data: cu, error: cErr } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          password: crypto.randomUUID(),
          user_metadata: { full_name: `${prenom} ${nom}`.trim(), imported: true },
        });
        if (cErr) throw cErr;

        const { data: prof, error: upErr } = await admin
          .from("profiles")
          .update({
            organization_id: doc.organization_id,
            nom,
            prenom,
            full_name: `${prenom} ${nom}`.trim(),
            nif: r.nif || null,
            code_budgetaire: r.code_employe || null,
            approval_status: "approved",
            profile_completed: false,
          })
          .eq("user_id", cu.user!.id)
          .select("id")
          .single();
        if (upErr) throw upErr;

        await admin.from("payroll_payments").update({ profile_id: prof.id }).eq("id", r.id);
        if (nifKey) byNif.set(nifKey, prof.id);
        created++;
      } catch (e: any) {
        errors.push({ nom_complet: r.nom_complet, error: e.message });
      }
    }

    return json({ created, linked, skipped, errors });
  } catch (e: any) {
    console.error("create-employees-from-emargement error:", e);
    return json({ error: e.message }, 500);
  }
});
