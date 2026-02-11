import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  type: "validation_required" | "document_signed" | "document_available" | "document_rejected";
  record_id: string;
  organization_id: string;
  target_user_ids: string[];
  reference_number?: string;
  document_title?: string;
  step_label?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, record_id, organization_id, target_user_ids, reference_number, document_title, step_label }: NotificationRequest = await req.json();

    if (!type || !record_id || !organization_id || !target_user_ids?.length) {
      throw new Error("Missing required fields");
    }

    const titleMap: Record<string, string> = {
      validation_required: "Validation requise",
      document_signed: "Document signé",
      document_available: "Document disponible",
      document_rejected: "Document rejeté",
    };

    const messageMap: Record<string, string> = {
      validation_required: `Le document "${document_title}" (${reference_number || "N/A"}) nécessite votre validation${step_label ? ` — Étape : ${step_label}` : ""}.`,
      document_signed: `Le document "${document_title}" (${reference_number || "N/A"}) a été signé et est disponible.`,
      document_available: `Un nouveau document "${document_title}" (${reference_number || "N/A"}) est disponible dans votre dossier.`,
      document_rejected: `Le document "${document_title}" (${reference_number || "N/A"}) a été rejeté${step_label ? ` à l'étape : ${step_label}` : ""}.`,
    };

    // Create in-app notifications
    const notifications = target_user_ids.map(user_id => ({
      organization_id,
      user_id,
      type: type === "document_rejected" ? "warning" : "info",
      title: titleMap[type] || "Notification",
      message: messageMap[type] || "Nouvelle notification",
      link: "/correspondence",
    }));

    const { error: notifError } = await supabase.from("notifications").insert(notifications);
    if (notifError) console.error("Notification insert error:", notifError);

    // Send emails
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("user_id", target_user_ids);

    const emailResults = [];
    for (const profile of (profiles || [])) {
      if (!profile.email) continue;
      try {
        const result = await resend.emails.send({
          from: "Correspondance <noreply@resend.dev>",
          to: [profile.email],
          subject: `${titleMap[type]} — ${reference_number || document_title || "Document"}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a1a1a;">${titleMap[type]}</h2>
              <p style="color: #555; font-size: 15px;">${messageMap[type]}</p>
              <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Référence :</strong> ${reference_number || "N/A"}</p>
                <p style="margin: 4px 0;"><strong>Document :</strong> ${document_title || "N/A"}</p>
              </div>
              <p style="color: #888; font-size: 13px;">Connectez-vous à la plateforme pour consulter ce document.</p>
            </div>
          `,
        });
        emailResults.push({ email: profile.email, success: true });
      } catch (emailErr: any) {
        console.error(`Email error for ${profile.email}:`, emailErr.message);
        emailResults.push({ email: profile.email, success: false, error: emailErr.message });
      }
    }

    return new Response(JSON.stringify({ success: true, notifications: notifications.length, emails: emailResults }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
