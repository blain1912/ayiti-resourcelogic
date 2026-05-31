// Extract MEF émargement PDF using Lovable AI (Gemini) and store rows in payroll_payments
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ExtractedRow {
  no_cheque?: string;
  code_employe?: string;
  nif?: string;
  nom_complet: string;
  poste?: string;
  montant_brut: number;
  isr: number;
  cas_fdu: number;
  pension: number;
  cfgdct: number;
  aval: number;
  remboursement: number;
  autres_retenues: number;
  montant_net: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { emargement_document_id } = await req.json();
    if (!emargement_document_id) {
      return new Response(JSON.stringify({ error: "emargement_document_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Verify the user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Get document
    const { data: doc, error: docErr } = await admin
      .from("emargement_documents")
      .select("id, organization_id, file_url, file_name, period_label, upload_date")
      .eq("id", emargement_document_id)
      .single();
    if (docErr || !doc) throw new Error("Document introuvable");

    // Check user is admin/HR of this org
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", doc.organization_id);
    const allowedRoles = ["admin", "directeur_general", "directeur_administratif", "directeur_rh"];
    if (!roles?.some((r: any) => allowedRoles.includes(r.role))) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download PDF
    const path = decodeURIComponent(doc.file_url.split("/emargement-documents/")[1] || "");
    const { data: fileBlob, error: dlErr } = await admin.storage.from("emargement-documents").download(path);
    if (dlErr || !fileBlob) throw new Error("Impossible de télécharger le PDF: " + dlErr?.message);

    const arrayBuffer = await fileBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    const base64 = btoa(binary);

    // Call Lovable AI with PDF
    const prompt = `Extrait toutes les lignes d'employés de cet état d'émargement MEF (Ministère de l'Économie et des Finances - Haïti).

Pour CHAQUE employé listé, retourne un objet JSON avec ces champs (utilise 0 si absent, conserve les noms exacts):
- no_cheque (ex: "2601PCM639")
- code_employe (ex: "25151A184")
- nif (format XXX-XXX-XXX-X, ex: "003-184-425-2")
- nom_complet (ex: "ALCIN, MONETTE V.LEOPOLD")
- poste (ex: "PROFESSEUR DE TECHNIQUE")
- montant_brut (nombre, sans virgules)
- isr (nombre)
- cas_fdu (nombre, colonne CAS/FDU)
- pension (nombre)
- cfgdct (nombre)
- aval (nombre)
- remboursement (nombre, colonne Remb.)
- autres_retenues (nombre, colonne AUTRES RET.)
- montant_net (nombre, colonne Net)

IMPORTANT:
- Ignore les en-têtes, totaux, "Total pour la Direction", "Total pour le Ministère", "Grand Total".
- Ne retourne QUE les lignes d'employés individuels.
- Réponds UNIQUEMENT avec un JSON valide sous la forme: {"rows": [...]}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:application/pdf;base64,${base64}` },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error(`AI Gateway error ${aiResp.status}: ${errText.substring(0, 500)}`);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    let parsed: { rows: ExtractedRow[] };
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      throw new Error("Réponse IA invalide: " + content.substring(0, 200));
    }

    const rows = parsed.rows || [];
    if (!rows.length) {
      return new Response(JSON.stringify({ inserted: 0, message: "Aucune ligne détectée" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete existing payments for this emargement (re-extraction overrides)
    await admin.from("payroll_payments").delete().eq("emargement_document_id", emargement_document_id);

    // Get all profiles in org with NIF for matching
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nif, full_name")
      .eq("organization_id", doc.organization_id);

    const nifMap = new Map<string, string>();
    (profiles || []).forEach((p: any) => {
      if (p.nif) nifMap.set(String(p.nif).replace(/\s|-/g, ""), p.id);
    });

    const period = doc.upload_date?.substring(0, 7) || new Date().toISOString().substring(0, 7);

    const toInsert = rows.map((r) => {
      const normalizedNif = (r.nif || "").replace(/\s|-/g, "");
      return {
        organization_id: doc.organization_id,
        emargement_document_id,
        profile_id: nifMap.get(normalizedNif) || null,
        period,
        no_cheque: r.no_cheque || null,
        code_employe: r.code_employe || null,
        nif: r.nif || null,
        nom_complet: r.nom_complet || "—",
        poste: r.poste || null,
        montant_brut: Number(r.montant_brut) || 0,
        isr: Number(r.isr) || 0,
        cas_fdu: Number(r.cas_fdu) || 0,
        pension: Number(r.pension) || 0,
        cfgdct: Number(r.cfgdct) || 0,
        aval: Number(r.aval) || 0,
        remboursement: Number(r.remboursement) || 0,
        autres_retenues: Number(r.autres_retenues) || 0,
        montant_net: Number(r.montant_net) || 0,
        status: "non_paye",
      };
    });

    const { error: insErr } = await admin.from("payroll_payments").insert(toInsert);
    if (insErr) throw new Error("Erreur insertion: " + insErr.message);

    const matched = toInsert.filter((r) => r.profile_id).length;

    return new Response(
      JSON.stringify({ inserted: toInsert.length, matched, period }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("extract-emargement error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
