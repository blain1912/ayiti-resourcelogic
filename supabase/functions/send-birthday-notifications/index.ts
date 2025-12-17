import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  id: string;
  prenom: string | null;
  nom: string | null;
  full_name: string | null;
  email: string | null;
  date_naissance: string | null;
  unit_id: string | null;
  organization_id: string;
}

const getDisplayName = (profile: Profile) => {
  if (profile.prenom && profile.nom) {
    return `${profile.prenom} ${profile.nom}`;
  }
  return profile.full_name || "Employé";
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];
  return `${day} ${months[date.getMonth()]}`;
};

const generateEmailHtml = (
  unitName: string,
  orgName: string,
  birthdays: { name: string; date: string }[]
) => {
  const birthdayRows = birthdays
    .map(
      (b) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${b.name}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
          ${b.date}
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Anniversaires de la semaine</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0EA5E9, #8B5CF6); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎂 Anniversaires de la semaine</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${unitName} - ${orgName}</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">Bonjour,</p>
        <p>Voici les anniversaires de vos collègues pour cette semaine :</p>
        
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 12px; text-align: left; font-weight: 600;">Nom</th>
              <th style="padding: 12px; text-align: right; font-weight: 600;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${birthdayRows}
          </tbody>
        </table>
        
        <p style="margin-top: 20px; color: #666;">N'oubliez pas de leur souhaiter un joyeux anniversaire ! 🎉</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; margin: 0;">
          Ce message a été envoyé automatiquement par le système RH de ${orgName}.
        </p>
      </div>
    </body>
    </html>
  `;
};

const sendEmail = async (to: string[], subject: string, html: string) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "RH <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return response.json();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting birthday notifications job...");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all approved organizations
    const { data: organizations, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("approval_status", "approved");

    if (orgError) {
      console.error("Error fetching organizations:", orgError);
      throw orgError;
    }

    console.log(`Found ${organizations?.length || 0} organizations`);

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    let totalEmailsSent = 0;

    for (const org of organizations || []) {
      console.log(`Processing organization: ${org.name}`);

      // Get all profiles with birthdays
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, prenom, nom, full_name, email, date_naissance, unit_id, organization_id")
        .eq("organization_id", org.id)
        .not("date_naissance", "is", null);

      if (profilesError) {
        console.error(`Error fetching profiles for org ${org.id}:`, profilesError);
        continue;
      }

      // Get all units
      const { data: units, error: unitsError } = await supabaseAdmin
        .from("organizational_units")
        .select("id, name, organization_id")
        .eq("organization_id", org.id);

      if (unitsError) {
        console.error(`Error fetching units for org ${org.id}:`, unitsError);
        continue;
      }

      // Filter birthdays for this week
      const thisWeekBirthdays = (profiles || []).filter((profile) => {
        if (!profile.date_naissance) return false;
        const birthDate = new Date(profile.date_naissance);
        const thisYearBirthday = new Date(
          today.getFullYear(),
          birthDate.getMonth(),
          birthDate.getDate()
        );
        return thisYearBirthday >= startOfWeek && thisYearBirthday <= endOfWeek;
      });

      if (thisWeekBirthdays.length === 0) {
        console.log(`No birthdays this week for org ${org.name}`);
        continue;
      }

      console.log(`Found ${thisWeekBirthdays.length} birthdays this week for org ${org.name}`);

      // Group birthdays by unit
      const birthdaysByUnit: Record<string, Profile[]> = {};
      
      for (const birthday of thisWeekBirthdays) {
        const unitId = birthday.unit_id || "no-unit";
        if (!birthdaysByUnit[unitId]) {
          birthdaysByUnit[unitId] = [];
        }
        birthdaysByUnit[unitId].push(birthday);
      }

      // Send emails to each unit
      for (const [unitId, unitBirthdays] of Object.entries(birthdaysByUnit)) {
        const unit = units?.find((u) => u.id === unitId);
        const unitName = unit?.name || "Organisation générale";

        // Get all employees in this unit to send them the email
        const unitEmployees = (profiles || []).filter(
          (p) => (unitId === "no-unit" ? !p.unit_id : p.unit_id === unitId) && p.email
        );

        if (unitEmployees.length === 0) {
          console.log(`No employees with email in unit ${unitName}`);
          continue;
        }

        const birthdayList = unitBirthdays.map((b) => ({
          name: getDisplayName(b),
          date: formatDate(b.date_naissance!),
        }));

        // Sort by date
        birthdayList.sort((a, b) => {
          const dateA = new Date(`2024-${a.date}`);
          const dateB = new Date(`2024-${b.date}`);
          return dateA.getTime() - dateB.getTime();
        });

        const emailHtml = generateEmailHtml(unitName, org.name, birthdayList);
        const recipientEmails = unitEmployees.map((e) => e.email!).filter(Boolean);

        if (recipientEmails.length === 0) {
          console.log(`No valid emails for unit ${unitName}`);
          continue;
        }

        console.log(`Sending birthday notification to ${recipientEmails.length} employees in ${unitName}`);

        try {
          await sendEmail(
            recipientEmails,
            `🎂 Anniversaires de la semaine - ${unitName}`,
            emailHtml
          );
          totalEmailsSent++;
          console.log(`Successfully sent email to ${unitName}`);
        } catch (emailErr) {
          console.error(`Exception sending email to ${unitName}:`, emailErr);
        }
      }
    }

    console.log(`Birthday notifications complete. Total emails sent: ${totalEmailsSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Birthday notifications sent successfully`,
        emailsSent: totalEmailsSent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-birthday-notifications:", error);
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
