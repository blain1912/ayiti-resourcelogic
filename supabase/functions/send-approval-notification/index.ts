import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "profile_approved" | "profile_rejected" | "org_approved" | "org_rejected";
  recipientEmail: string;
  recipientName: string;
  organizationName?: string;
  additionalInfo?: string;
}

const getEmailTemplate = (req: NotificationRequest) => {
  const templates = {
    profile_approved: {
      subject: "Votre inscription a été approuvée ✅",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #10b981; margin-bottom: 20px;">🎉 Inscription Approuvée</h1>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Bonjour <strong>${req.recipientName}</strong>,
            </p>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Félicitations ! Votre inscription à <strong>${req.organizationName}</strong> a été approuvée.
            </p>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Vous pouvez maintenant vous connecter à votre compte et compléter votre profil.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 14px; color: #6b7280;">
                Cordialement,<br>
                L'équipe de ${req.organizationName}
              </p>
            </div>
          </div>
        </div>
      `,
    },
    profile_rejected: {
      subject: "Mise à jour de votre inscription",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #ef4444; margin-bottom: 20px;">Mise à jour de votre inscription</h1>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Bonjour <strong>${req.recipientName}</strong>,
            </p>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Nous regrettons de vous informer que votre inscription à <strong>${req.organizationName}</strong> n'a pas pu être approuvée pour le moment.
            </p>
            ${req.additionalInfo ? `
              <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                <strong>Raison :</strong> ${req.additionalInfo}
              </p>
            ` : ''}
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Si vous pensez qu'il s'agit d'une erreur, n'hésitez pas à nous contacter.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 14px; color: #6b7280;">
                Cordialement,<br>
                L'équipe de ${req.organizationName}
              </p>
            </div>
          </div>
        </div>
      `,
    },
    org_approved: {
      subject: "Votre organisation a été approuvée ✅",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #10b981; margin-bottom: 20px;">🎉 Organisation Approuvée</h1>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Bonjour,
            </p>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Votre organisation <strong>${req.organizationName}</strong> a été approuvée et est maintenant active sur la plateforme.
            </p>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Vous pouvez maintenant commencer à gérer vos employés et unités organisationnelles.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 14px; color: #6b7280;">
                Cordialement,<br>
                L'équipe de support
              </p>
            </div>
          </div>
        </div>
      `,
    },
    org_rejected: {
      subject: "Mise à jour de votre organisation",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #ef4444; margin-bottom: 20px;">Mise à jour de votre organisation</h1>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Bonjour,
            </p>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Nous regrettons de vous informer que votre organisation <strong>${req.organizationName}</strong> n'a pas pu être approuvée pour le moment.
            </p>
            ${req.additionalInfo ? `
              <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                <strong>Raison :</strong> ${req.additionalInfo}
              </p>
            ` : ''}
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Pour plus d'informations, veuillez nous contacter.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 14px; color: #6b7280;">
                Cordialement,<br>
                L'équipe de support
              </p>
            </div>
          </div>
        </div>
      `,
    },
  };

  return templates[req.type];
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notificationRequest: NotificationRequest = await req.json();
    
    console.log("Processing notification:", notificationRequest);

    // Validate required fields
    if (!notificationRequest.recipientEmail || !notificationRequest.recipientName || !notificationRequest.type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const emailTemplate = getEmailTemplate(notificationRequest);

    const emailResponse = await resend.emails.send({
      from: "Système RH <onboarding@resend.dev>", // Changez ceci par votre domaine vérifié
      to: [notificationRequest.recipientEmail],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-approval-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);