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
    const { profile, organizationName, positionName, unitName, cvUrl } = await req.json();

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

    // Try to extract text from CV if URL is provided
    let cvText = "";
    if (cvUrl) {
      try {
        console.log("Fetching CV from signed URL...");
        const cvResponse = await fetch(cvUrl);
        if (cvResponse.ok) {
          const contentType = cvResponse.headers.get("content-type") || "";
          
          if (contentType.includes("text") || contentType.includes("json")) {
            cvText = await cvResponse.text();
          } else {
            // For PDF/Word/images, we'll pass the URL to the AI model for analysis
            const cvBytes = await cvResponse.arrayBuffer();
            const base64Cv = btoa(String.fromCharCode(...new Uint8Array(cvBytes)));
            
            // Use the AI to extract CV content
            const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: "Extrais le texte brut de ce document CV. Retourne uniquement le contenu textuel sans formatage." },
                  { role: "user", content: [
                    { type: "text", text: "Extrais tout le contenu textuel de ce CV :" },
                    { type: "image_url", image_url: { url: `data:${contentType};base64,${base64Cv}` } }
                  ]}
                ],
                max_tokens: 2000,
                temperature: 0.1,
              }),
            });

            if (extractResponse.ok) {
              const extractData = await extractResponse.json();
              cvText = extractData.choices?.[0]?.message?.content || "";
              console.log("CV text extracted successfully, length:", cvText.length);
            }
          }
        }
      } catch (cvError) {
        console.error("Error extracting CV content:", cvError);
        // Continue without CV content
      }
    }

    let prompt = `Tu es un rédacteur professionnel RH. À partir des informations suivantes d'un employé, rédige un texte de profil professionnel en français, en 2-3 paragraphes. Le texte doit être formel, respectueux et mettre en valeur le parcours et le rôle de l'employé au sein de l'organisation. Ne mentionne pas les informations manquantes. Ne commence pas par "Voici" ou similaire, commence directement par le texte du profil.

Informations de l'employé (source principale - inscription):
${profileDetails.join('\n')}`;

    if (cvText) {
      prompt += `\n\nInformations complémentaires extraites du CV de l'employé (utilise ces informations pour enrichir le profil, notamment les compétences, formations, expériences professionnelles et réalisations):
${cvText.substring(0, 3000)}`;
    }

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
