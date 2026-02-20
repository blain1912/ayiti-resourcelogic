import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportType, reportData, organizationName } = await req.json();

    if (!reportType || !reportData) {
      throw new Error("reportType and reportData are required");
    }

    const prompts: Record<string, string> = {
      attendance: `Tu es un expert RH. Analyse ce rapport de présence mensuel et fournis une interprétation détaillée en français. Identifie les tendances, les points forts, les points faibles et formule des recommandations concrètes.`,
      leaves: `Tu es un expert RH. Analyse ce rapport de congés et fournis une interprétation détaillée en français. Identifie les tendances d'utilisation, les risques d'épuisement, et formule des recommandations.`,
      seniority: `Tu es un expert RH. Analyse ce rapport d'ancienneté et fournis une interprétation détaillée en français. Identifie les risques de perte de mémoire institutionnelle, les besoins en relève, et formule des recommandations.`,
      staffing: `Tu es un expert RH. Analyse ce rapport des effectifs et fournis une interprétation détaillée en français. Évalue la répartition des ressources, identifie les déséquilibres et formule des recommandations.`,
      demographics: `Tu es un expert RH. Analyse ce rapport démographique et fournis une interprétation détaillée en français. Évalue la pyramide des âges, la diversité, et formule des recommandations.`,
      payroll: `Tu es un expert RH et finances. Analyse ce rapport de masse salariale et fournis une interprétation détaillée en français. Identifie les concentrations de coûts, les écarts et formule des recommandations d'optimisation.`,
      emargement: `Tu es un expert RH. Analyse cet état d'émargement et fournis une interprétation détaillée en français. Identifie les tendances salariales et formule des recommandations.`,
      "staff-movement": `Tu es un expert RH. Analyse ce registre des mouvements du personnel et fournis une interprétation détaillée en français. Identifie les tendances de mobilité et formule des recommandations.`,
    };

    const systemPrompt = prompts[reportType] || `Tu es un expert RH. Analyse ce rapport et fournis une interprétation détaillée en français avec des recommandations concrètes.`;

    const userPrompt = `Organisation : ${organizationName || "Non spécifiée"}

Données du rapport (${reportType}) :
${JSON.stringify(reportData, null, 2)}

Fournis une analyse structurée avec :
1. **Résumé** : Synthèse des principaux chiffres
2. **Points forts** : Ce qui fonctionne bien
3. **Points d'attention** : Les risques ou problèmes identifiés
4. **Recommandations** : Actions concrètes à entreprendre

Sois concis mais pertinent. Utilise des données chiffrées du rapport pour appuyer ton analyse.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "Impossible de générer l'analyse.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
