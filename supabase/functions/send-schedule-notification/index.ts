import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const dayNames: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi",
  4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

interface NotificationRequest {
  profileIds: string[];
  scheduleName: string;
  startDate: string;
  endDate?: string;
  workDays: number[];
  startTime: string;
  endTime: string;
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

    const data: NotificationRequest = await req.json();
    console.log("Processing schedule notification for", data.profileIds.length, "employees");

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("email, prenom, nom, full_name")
      .in("id", data.profileIds);

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No profiles found" }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emails = profiles.map((p: any) => p.email).filter(Boolean);
    if (emails.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No emails found" }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const workDaysStr = data.workDays.map(d => dayNames[d] || `Jour ${d}`).join(", ");
    const period = data.endDate
      ? `du ${data.startDate} au ${data.endDate}`
      : `à partir du ${data.startDate}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #2563eb; margin-bottom: 20px;">🕐 Nouvel horaire spécial</h1>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Vous avez été assigné(e) à un nouvel horaire spécial.
          </p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Horaire :</strong> ${data.scheduleName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Période :</strong> ${period}</p>
            <p style="margin: 0 0 10px 0;"><strong>Jours :</strong> ${workDaysStr}</p>
            <p style="margin: 0;"><strong>Heures :</strong> ${data.startTime} - ${data.endTime}</p>
          </div>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Veuillez prendre note de ce nouvel horaire et vous y conformer.
          </p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 14px; color: #6b7280;">
              Cordialement,<br>
              ${data.organizationName}
            </p>
          </div>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: `Système RH <onboarding@resend.dev>`,
      to: emails as string[],
      subject: `Nouvel horaire spécial : ${data.scheduleName}`,
      html: emailHtml,
    });

    console.log("Schedule notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-schedule-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
