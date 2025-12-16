import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("Received application:", body);

    const {
      job_posting_id,
      organization_id,
      applicant_name,
      applicant_email,
      applicant_phone,
      cover_letter,
      applicant_cv_url,
    } = body;

    // Validate required fields
    if (!job_posting_id || !organization_id || !applicant_name || !applicant_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(applicant_email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify job posting exists and is open for external recruitment
    const { data: jobPosting, error: jobError } = await supabase
      .from("job_postings")
      .select("id, title, recruitment_type, status")
      .eq("id", job_posting_id)
      .eq("organization_id", organization_id)
      .maybeSingle();

    if (jobError || !jobPosting) {
      console.error("Job posting not found:", jobError);
      return new Response(
        JSON.stringify({ error: "Job posting not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (jobPosting.recruitment_type !== "external" || jobPosting.status !== "open") {
      return new Response(
        JSON.stringify({ error: "This job posting is not accepting external applications" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert the application
    const { data: application, error: insertError } = await supabase
      .from("job_applications")
      .insert({
        job_posting_id,
        organization_id,
        applicant_name: applicant_name.trim(),
        applicant_email: applicant_email.trim().toLowerCase(),
        applicant_phone: applicant_phone?.trim() || null,
        cover_letter: cover_letter?.trim() || null,
        applicant_cv_url: applicant_cv_url || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting application:", insertError);
      throw insertError;
    }

    console.log("Application created:", application.id);

    // Notify HR (fire and forget)
    try {
      const { data: organization } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", organization_id)
        .maybeSingle();

      // Get HR emails
      const { data: hrUsers } = await supabase
        .from("user_roles")
        .select(`user_id, profiles!inner(email)`)
        .eq("organization_id", organization_id)
        .in("role", ["admin", "directeur_rh", "directeur_administratif"]);

      if (hrUsers && hrUsers.length > 0) {
        const hrEmails = [...new Set(hrUsers.map((u: any) => u.profiles?.email).filter(Boolean))];
        
        // Use Resend to send notification
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey && hrEmails.length > 0) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Système RH <onboarding@resend.dev>",
              to: hrEmails,
              subject: `Nouvelle candidature externe: ${jobPosting.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #2563eb;">📋 Nouvelle candidature externe</h1>
                  <p>Un candidat externe a postulé à une offre d'emploi.</p>
                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Poste :</strong> ${jobPosting.title}</p>
                    <p><strong>Candidat :</strong> ${applicant_name}</p>
                    <p><strong>Email :</strong> ${applicant_email}</p>
                    ${applicant_phone ? `<p><strong>Téléphone :</strong> ${applicant_phone}</p>` : ''}
                  </div>
                  <p>Connectez-vous à la plateforme pour examiner cette candidature.</p>
                </div>
              `,
            }),
          });
        }
      }
    } catch (notifyError) {
      console.error("Error sending notification:", notifyError);
      // Don't fail the application if notification fails
    }

    return new Response(
      JSON.stringify({ success: true, applicationId: application.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in submit-external-application:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
