import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const resendApiKey = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaycheckEmailRequest {
  staffName: string;
  staffEmail: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  hourlyRate: number;
  totalAmount: number;
  paymentMethod: string;
  paidDate: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      staffName,
      staffEmail,
      periodStart,
      periodEnd,
      totalHours,
      hourlyRate,
      totalAmount,
      paymentMethod,
      paidDate,
      notes,
    }: PaycheckEmailRequest = await req.json();

    console.log("Sending paycheck email to:", staffEmail);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Auto Shop <onboarding@resend.dev>",
        to: [staffEmail],
        subject: `Paycheck - ${periodStart} to ${periodEnd}`,
        html: `
...
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error("Failed to send email");
    }

    const emailData = await emailResponse.json();
    console.log("Paycheck email sent successfully:", emailData);

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-paycheck-email function:", error);
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
