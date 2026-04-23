import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmployeeInput {
  code: string;
  nif: string;
  nom: string;
  prenom: string;
  poste: string;
  salaire: number;
  unit_id: string;
  category_name: string;
  position_id?: string | null;
  employment_type: "permanent" | "professeur";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });
    }

    const admin = createClient(url, serviceKey);

    const body = await req.json();
    const organization_id: string = body.organization_id;
    const employees: EmployeeInput[] = body.employees;

    // Verify admin role on this org
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("organization_id", organization_id);
    const isAdmin = (roles || []).some((r: any) =>
      ["admin", "directeur_general", "directeur_administratif", "directeur_rh"].includes(r.role)
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Existing NIFs
    const { data: existing } = await admin
      .from("profiles")
      .select("nif")
      .eq("organization_id", organization_id);
    const existingNifs = new Set((existing || []).map((p: any) => p.nif).filter(Boolean));

    const results = { created: 0, skipped: 0, errors: [] as any[] };

    for (const emp of employees) {
      if (existingNifs.has(emp.nif)) {
        results.skipped++;
        continue;
      }

      // Synthesize email
      const slug = `${emp.prenom}.${emp.nom}.${emp.code}`
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, "")
        .slice(0, 60);
      const email = `${slug}@enarts.imported.local`;

      try {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: `${emp.prenom} ${emp.nom}`, imported: true },
          password: crypto.randomUUID(),
        });
        if (createErr) throw createErr;

        const userId = created.user!.id;

        // handle_new_user trigger inserted a profile with org=null. Update it.
        const updates: any = {
          organization_id,
          nom: emp.nom,
          prenom: emp.prenom,
          full_name: `${emp.prenom} ${emp.nom}`,
          nif: emp.nif,
          unit_id: emp.unit_id,
          employment_type: emp.employment_type,
          approval_status: "approved",
          profile_completed: false,
        };
        if (emp.employment_type === "professeur") {
          updates.professor_code_budgetaire = emp.code;
          updates.professor_salary = emp.salaire;
          updates.employee_category = emp.category_name;
        } else {
          updates.code_budgetaire = emp.code;
          updates.position_id = emp.position_id;
        }

        const { error: upErr } = await admin
          .from("profiles")
          .update(updates)
          .eq("user_id", userId);
        if (upErr) throw upErr;

        results.created++;
      } catch (e: any) {
        results.errors.push({ nif: emp.nif, name: `${emp.prenom} ${emp.nom}`, error: e.message });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
