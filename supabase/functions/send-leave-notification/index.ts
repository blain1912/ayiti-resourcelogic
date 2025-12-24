import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeaveNotificationRequest {
  type: "submitted" | "approved" | "rejected";
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  reviewComment?: string;
  reviewerName?: string;
  organizationName?: string;
}

const leaveTypeLabels: Record<string, string> = {
  conge_annuel: "Congé annuel",
  conge_maladie: "Congé maladie",
  conge_maternite: "Congé maternité",
  conge_paternite: "Congé paternité",
  conge_sans_solde: "Congé sans solde",
  conge_exceptionnel: "Congé exceptionnel",
  conge_etudes: "Congé d'études",
};

function getEmailTemplate(req: LeaveNotificationRequest): { subject: string; html: string } {
  const leaveTypeLabel = leaveTypeLabels[req.leaveType] || req.leaveType;
  const orgName = req.organizationName || "Votre organisation";

  if (req.type === "submitted") {
    return {
      subject: `Demande de congé soumise - ${leaveTypeLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0EA5E9, #8B5CF6); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
            .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0EA5E9; }
            .label { font-weight: bold; color: #374151; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Demande de congé soumise</h1>
            </div>
            <div class="content">
              <p>Bonjour ${req.employeeName},</p>
              <p>Votre demande de congé a été soumise avec succès et est en attente d'approbation.</p>
              
              <div class="info-box">
                <p><span class="label">Type de congé:</span> ${leaveTypeLabel}</p>
                <p><span class="label">Date de début:</span> ${req.startDate}</p>
                <p><span class="label">Date de fin:</span> ${req.endDate}</p>
                ${req.reason ? `<p><span class="label">Motif:</span> ${req.reason}</p>` : ""}
              </div>
              
              <p>Vous recevrez une notification dès que votre demande sera traitée.</p>
            </div>
            <div class="footer">
              <p>${orgName} - Système de gestion des congés</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  } else if (req.type === "approved") {
    return {
      subject: `Demande de congé approuvée - ${leaveTypeLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
            .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10B981; }
            .label { font-weight: bold; color: #374151; }
            .status { display: inline-block; background: #10B981; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✓ Demande approuvée</h1>
            </div>
            <div class="content">
              <p>Bonjour ${req.employeeName},</p>
              <p>Bonne nouvelle ! Votre demande de congé a été <span class="status">APPROUVÉE</span></p>
              
              <div class="info-box">
                <p><span class="label">Type de congé:</span> ${leaveTypeLabel}</p>
                <p><span class="label">Date de début:</span> ${req.startDate}</p>
                <p><span class="label">Date de fin:</span> ${req.endDate}</p>
                ${req.reviewerName ? `<p><span class="label">Approuvé par:</span> ${req.reviewerName}</p>` : ""}
                ${req.reviewComment ? `<p><span class="label">Commentaire:</span> ${req.reviewComment}</p>` : ""}
              </div>
              
              <p>Profitez bien de votre congé !</p>
            </div>
            <div class="footer">
              <p>${orgName} - Système de gestion des congés</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  } else {
    return {
      subject: `Demande de congé refusée - ${leaveTypeLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #EF4444, #DC2626); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
            .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #EF4444; }
            .label { font-weight: bold; color: #374151; }
            .status { display: inline-block; background: #EF4444; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✗ Demande refusée</h1>
            </div>
            <div class="content">
              <p>Bonjour ${req.employeeName},</p>
              <p>Nous sommes désolés de vous informer que votre demande de congé a été <span class="status">REFUSÉE</span></p>
              
              <div class="info-box">
                <p><span class="label">Type de congé:</span> ${leaveTypeLabel}</p>
                <p><span class="label">Date de début:</span> ${req.startDate}</p>
                <p><span class="label">Date de fin:</span> ${req.endDate}</p>
                ${req.reviewerName ? `<p><span class="label">Traité par:</span> ${req.reviewerName}</p>` : ""}
                ${req.reviewComment ? `<p><span class="label">Motif du refus:</span> ${req.reviewComment}</p>` : ""}
              </div>
              
              <p>N'hésitez pas à contacter votre responsable RH pour plus d'informations.</p>
            </div>
            <div class="footer">
              <p>${orgName} - Système de gestion des congés</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received leave notification request");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notificationData: LeaveNotificationRequest = await req.json();
    console.log("Notification data:", notificationData);

    if (!notificationData.employeeEmail || !notificationData.employeeName || !notificationData.type) {
      throw new Error("Missing required fields: employeeEmail, employeeName, or type");
    }

    const { subject, html } = getEmailTemplate(notificationData);

    console.log(`Sending ${notificationData.type} notification to ${notificationData.employeeEmail}`);

    const emailResponse = await resend.emails.send({
      from: "Gestion RH <onboarding@resend.dev>",
      to: [notificationData.employeeEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending leave notification:", error);
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
