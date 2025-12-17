import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GreetingCardRequest {
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  occasion: string;
  customMessage?: string;
  organizationName: string;
  organizationLogo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  senderName: string;
}

const occasionLabels: Record<string, { title: string; emoji: string; defaultMessage: string }> = {
  anniversaire: {
    title: "Joyeux Anniversaire",
    emoji: "🎂",
    defaultMessage: "Nous vous souhaitons un merveilleux anniversaire rempli de joie et de bonheur!"
  },
  deces_parent: {
    title: "Sincères Condoléances",
    emoji: "🕊️",
    defaultMessage: "En ces moments difficiles, nous vous adressons nos plus sincères condoléances et vous assurons de notre soutien."
  },
  nouvel_an: {
    title: "Bonne Année",
    emoji: "🎆",
    defaultMessage: "Nous vous souhaitons une excellente nouvelle année pleine de succès, de santé et de bonheur!"
  },
  fete_meres: {
    title: "Bonne Fête des Mères",
    emoji: "💐",
    defaultMessage: "En cette journée spéciale, nous célébrons toutes les mamans extraordinaires!"
  },
  fete_peres: {
    title: "Bonne Fête des Pères",
    emoji: "👔",
    defaultMessage: "En cette journée spéciale, nous célébrons tous les papas formidables!"
  },
  paques: {
    title: "Joyeuses Pâques",
    emoji: "🐣",
    defaultMessage: "Nous vous souhaitons de joyeuses fêtes de Pâques entourés de vos proches!"
  },
  saint_valentin: {
    title: "Bonne Saint-Valentin",
    emoji: "❤️",
    defaultMessage: "En cette fête de l'amour, nous vous souhaitons beaucoup de bonheur!"
  },
  fete_drapeau: {
    title: "Bonne Fête du Drapeau",
    emoji: "🇭🇹",
    defaultMessage: "Célébrons ensemble notre fierté nationale! Vive Haïti!"
  },
  prompt_retablissement: {
    title: "Prompt Rétablissement",
    emoji: "💪",
    defaultMessage: "Nous vous souhaitons un prompt rétablissement et espérons vous revoir très bientôt en pleine forme!"
  },
  accouchement: {
    title: "Félicitations pour l'Heureux Événement",
    emoji: "👶",
    defaultMessage: "Toutes nos félicitations pour l'arrivée de votre bébé! Beaucoup de bonheur à toute la famille!"
  },
  mariage: {
    title: "Félicitations pour votre Mariage",
    emoji: "💍",
    defaultMessage: "Nous vous souhaitons tout le bonheur du monde pour cette nouvelle étape de votre vie!"
  }
};

function generateCardHtml(data: GreetingCardRequest): string {
  const occasion = occasionLabels[data.occasion] || {
    title: "Carte de Vœux",
    emoji: "🎉",
    defaultMessage: "Nos meilleurs vœux!"
  };
  
  const primaryColor = data.primaryColor || "#0EA5E9";
  const secondaryColor = data.secondaryColor || "#8B5CF6";
  const message = data.customMessage || occasion.defaultMessage;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${occasion.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});">
        ${data.organizationLogo ? `<img src="${data.organizationLogo}" alt="${data.organizationName}" style="max-height: 60px; margin-bottom: 15px;">` : ''}
        <h1 style="color: #ffffff; margin: 0; font-size: 18px;">${data.organizationName}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px; text-align: center;">
        <div style="font-size: 64px; margin-bottom: 20px;">${occasion.emoji}</div>
        <h2 style="color: ${primaryColor}; font-size: 28px; margin: 0 0 20px 0;">${occasion.title}</h2>
        <p style="color: #333333; font-size: 18px; margin: 0 0 10px 0;">Cher(e) ${data.recipientName},</p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 20px 0;">
          ${message}
        </p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">
          <p style="color: #888888; font-size: 14px; margin: 0;">
            De la part de toute l'équipe
          </p>
          <p style="color: ${primaryColor}; font-size: 16px; font-weight: bold; margin: 5px 0 0 0;">
            ${data.organizationName}
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px; text-align: center; background-color: #f8f8f8; border-top: 1px solid #eeeeee;">
        <p style="color: #888888; font-size: 12px; margin: 0;">
          Envoyé par ${data.senderName} via ${data.organizationName}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: GreetingCardRequest = await req.json();
    
    console.log("Sending greeting card:", {
      recipient: data.recipientEmail,
      occasion: data.occasion,
      organization: data.organizationName
    });

    const occasion = occasionLabels[data.occasion] || { title: "Carte de Vœux", emoji: "🎉" };
    const html = generateCardHtml(data);

    const emailResponse = await resend.emails.send({
      from: `${data.organizationName} <onboarding@resend.dev>`,
      to: [data.recipientEmail],
      subject: `${occasion.emoji} ${occasion.title} - ${data.organizationName}`,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending greeting card:", error);
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
