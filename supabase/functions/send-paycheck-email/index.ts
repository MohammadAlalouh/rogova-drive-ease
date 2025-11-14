import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const emailResponse = await resend.emails.send({
      from: "Auto Shop <onboarding@resend.dev>",
      to: [staffEmail],
      subject: `Paycheck - ${periodStart} to ${periodEnd}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-radius: 0 0 8px 8px;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #ddd;
              }
              .info-label {
                font-weight: bold;
                color: #555;
              }
              .info-value {
                color: #333;
              }
              .total {
                font-size: 24px;
                font-weight: bold;
                color: #667eea;
                text-align: center;
                margin: 20px 0;
                padding: 20px;
                background: white;
                border-radius: 8px;
              }
              .notes {
                background: white;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
                border-left: 4px solid #667eea;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                color: #888;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Paycheck Statement</h1>
              <p style="margin: 0;">Payment Confirmation</p>
            </div>
            
            <div class="content">
              <div class="info-row">
                <span class="info-label">Staff Member:</span>
                <span class="info-value">${staffName}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">Pay Period:</span>
                <span class="info-value">${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">Total Hours:</span>
                <span class="info-value">${totalHours} hours</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">Hourly Rate:</span>
                <span class="info-value">$${hourlyRate.toFixed(2)}/hour</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">Payment Method:</span>
                <span class="info-value">${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">Payment Date:</span>
                <span class="info-value">${new Date(paidDate).toLocaleDateString()}</span>
              </div>
              
              <div class="total">
                Total Amount: $${totalAmount.toFixed(2)}
              </div>
              
              ${notes ? `
                <div class="notes">
                  <strong>Notes:</strong>
                  <p>${notes}</p>
                </div>
              ` : ''}
              
              <div class="footer">
                <p>Thank you for your hard work!</p>
                <p>If you have any questions, please contact your manager.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Paycheck email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
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
