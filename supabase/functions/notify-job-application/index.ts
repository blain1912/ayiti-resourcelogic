import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  jobTitle: string;
  applicantName: string;
  applicantEmail: string;
  organizationId: string;
  organizationName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const notificationRequest: NotificationRequest = await req.json();
    console.log("Processing job application notification:", notificationRequest);

    // Get HR emails for this organization
    const { data: hrUsers, error: hrError } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        profiles!inner(email, full_name)
      `)
      .eq("organization_id", notificationRequest.organizationId)
      .in("role", ["admin", "directeur_rh", "directeur_administratif"]);

    if (hrError) {
      console.error("Error fetching HR users:", hrError);
      throw hrError;
    }

    if (!hrUsers || hrUsers.length === 0) {
      console.log("No HR users found for organization");
      return new Response(
        JSON.stringify({ success: true, message: "No HR users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract unique emails
    const hrEmails = [...new Set(hrUsers.map((u: any) => u.profiles?.email).filter(Boolean))];
    console.log("Sending notifications to:", hrEmails);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #2563eb; margin-bottom: 20px;">📋 Nouvelle candidature interne</h1>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Un employé a postulé à une offre interne.
          </p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Poste :</strong> ${notificationRequest.jobTitle}</p>
            <p style="margin: 0 0 10px 0;"><strong>Candidat :</strong> ${notificationRequest.applicantName}</p>
            <p style="margin: 0;"><strong>Email :</strong> ${notificationRequest.applicantEmail}</p>
          </div>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Connectez-vous à la plateforme pour examiner cette candidature.
          </p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 14px; color: #6b7280;">
              Cordialement,<br>
              Système RH - ${notificationRequest.organizationName}
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email to all HR personnel
    const emailResponse = await resend.emails.send({
      from: "Système RH <onboarding@resend.dev>",
      to: hrEmails as string[],
      subject: `Nouvelle candidature interne: ${notificationRequest.jobTitle}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-job-application function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
