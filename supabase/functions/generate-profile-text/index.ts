import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { profile, organizationName, positionName, unitName } = await req.json();

    if (!profile) {
      throw new Error("Profile data is required");
    }

    const profileDetails = [];
    if (profile.full_name) profileDetails.push(`Nom complet: ${profile.full_name}`);
    if (profile.sexe) profileDetails.push(`Sexe: ${profile.sexe === 'M' ? 'Masculin' : 'Féminin'}`);
    if (profile.nationalite) profileDetails.push(`Nationalité: ${profile.nationalite}`);
    if (profile.date_naissance) profileDetails.push(`Date de naissance: ${profile.date_naissance}`);
    if (profile.lieu_naissance) profileDetails.push(`Lieu de naissance: ${profile.lieu_naissance}`);
    if (profile.etat_civil) profileDetails.push(`État civil: ${profile.etat_civil}`);
    if (profile.email) profileDetails.push(`Email: ${profile.email}`);
    if (profile.tel_1) profileDetails.push(`Téléphone: ${profile.tel_1}`);
    if (profile.adresse_ville) profileDetails.push(`Ville: ${profile.adresse_ville}`);
    if (profile.adresse_departement) profileDetails.push(`Département: ${profile.adresse_departement}`);
    if (profile.date_entree_fonction) profileDetails.push(`Date d'entrée en fonction: ${profile.date_entree_fonction}`);
    if (profile.employment_type) profileDetails.push(`Type d'emploi: ${profile.employment_type}`);
    if (profile.employee_status) profileDetails.push(`Statut: ${profile.employee_status}`);
    if (profile.employee_category) profileDetails.push(`Catégorie: ${profile.employee_category}`);
    if (profile.professor_grade) profileDetails.push(`Grade professoral: ${profile.professor_grade}`);
    if (organizationName) profileDetails.push(`Organisation: ${organizationName}`);
    if (positionName) profileDetails.push(`Poste: ${positionName}`);
    if (unitName) profileDetails.push(`Unité: ${unitName}`);

    const prompt = `Tu es un rédacteur professionnel RH. À partir des informations suivantes d'un employé, rédige un texte de profil professionnel en français, en 2-3 paragraphes. Le texte doit être formel, respectueux et mettre en valeur le parcours et le rôle de l'employé au sein de l'organisation. Ne mentionne pas les informations manquantes. Ne commence pas par "Voici" ou similaire, commence directement par le texte du profil.

Informations de l'employé:
${profileDetails.join('\n')}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Tu es un assistant RH spécialisé dans la rédaction de profils professionnels en français." },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const profileText = data.choices?.[0]?.message?.content || "Impossible de générer le texte du profil.";

    return new Response(JSON.stringify({ profileText }), {
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
