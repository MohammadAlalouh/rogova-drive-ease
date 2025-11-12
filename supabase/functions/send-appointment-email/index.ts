import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AppointmentEmailRequest {
  to: string;
  customerName: string;
  confirmationNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  services: string[];
  action: 'booking' | 'update' | 'cancel' | 'in_progress' | 'complete';
  notes?: string;
  invoice?: {
    servicesPerformed: Array<{ service: string; cost: number }>;
    itemsPurchased?: string;
    subtotal: number;
    taxes: number;
    totalCost: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Function invoked, method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AppointmentEmailRequest = await req.json();
    console.log("Request body received:", body);

    const { to, customerName, confirmationNumber, appointmentDate, appointmentTime, services, action, notes, invoice } = body;

    let emailSubject = "";
    let emailContent = "";

    switch (action) {
      case 'booking':
        emailSubject = "Appointment Confirmation - Rogova Auto Shop";
        emailContent = `
          <h1>Thank you for your booking, ${customerName}!</h1>
          <p>Your appointment has been confirmed with the following details:</p>
          <ul>
            <li><strong>Confirmation Number:</strong> ${confirmationNumber}</li>
            <li><strong>Date:</strong> ${appointmentDate}</li>
            <li><strong>Time:</strong> ${appointmentTime}</li>
            <li><strong>Services:</strong> ${services.join(', ')}</li>
            ${notes ? `<li><strong>Notes:</strong> ${notes}</li>` : ''}
          </ul>
          <p>Please keep your confirmation number for future reference. You can use it to manage your appointment.</p>
          <p><strong>Location:</strong> 37 Veronica Dr, Halifax, NS</p>
          <p>If you need to cancel or reschedule, please contact us or use your confirmation number.</p>
          <p>Best regards,<br>Rogova Auto Shop Team</p>
        `;
        break;
      
      case 'update':
        emailSubject = "Appointment Updated - Rogova Auto Shop";
        emailContent = `
          <h1>Your appointment has been updated, ${customerName}</h1>
          <p>Your appointment details have been changed:</p>
          <ul>
            <li><strong>Confirmation Number:</strong> ${confirmationNumber}</li>
            <li><strong>New Date:</strong> ${appointmentDate}</li>
            <li><strong>New Time:</strong> ${appointmentTime}</li>
            <li><strong>Services:</strong> ${services.join(', ')}</li>
            ${notes ? `<li><strong>Notes:</strong> ${notes}</li>` : ''}
          </ul>
          <p><strong>Location:</strong> 37 Veronica Dr, Halifax, NS</p>
          <p>If you have any questions, please contact us.</p>
          <p>Best regards,<br>Rogova Auto Shop Team</p>
        `;
        break;
      
      case 'cancel':
        emailSubject = "Appointment Cancelled - Rogova Auto Shop";
        emailContent = `
          <h1>Appointment Cancelled</h1>
          <p>Dear ${customerName},</p>
          <p>Your appointment (${confirmationNumber}) scheduled for ${appointmentDate} at ${appointmentTime} has been cancelled.</p>
          <p>If you would like to book a new appointment, please visit our website.</p>
          <p>Best regards,<br>Rogova Auto Shop Team</p>
        `;
        break;
      
      case 'in_progress':
        emailSubject = "Service In Progress - Rogova Auto Shop";
        emailContent = `
          <h1>Your service has started!</h1>
          <p>Dear ${customerName},</p>
          <p>We've started working on your vehicle. Your service is currently in progress.</p>
          <ul>
            <li><strong>Confirmation Number:</strong> ${confirmationNumber}</li>
            <li><strong>Services:</strong> ${services.join(', ')}</li>
          </ul>
          <p>We'll notify you when the service is complete.</p>
          <p>Best regards,<br>Rogova Auto Shop Team</p>
        `;
        break;
      
      case 'complete':
        emailSubject = "Service Complete - Invoice - Rogova Auto Shop";
        
        let invoiceHtml = '';
        if (invoice) {
          const servicesHtml = invoice.servicesPerformed
            .map(s => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${s.service}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${s.cost.toFixed(2)}</td></tr>`)
            .join('');
          
          invoiceHtml = `
            <h2>Invoice Details</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Service</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Cost</th>
                </tr>
              </thead>
              <tbody>
                ${servicesHtml}
              </tbody>
            </table>
            ${invoice.itemsPurchased ? `<p><strong>Items/Parts Purchased:</strong><br>${invoice.itemsPurchased}</p>` : ''}
            <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
              <p style="margin: 5px 0;"><strong>Subtotal:</strong> $${invoice.subtotal.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Taxes:</strong> $${invoice.taxes.toFixed(2)}</p>
              <p style="margin: 10px 0; font-size: 1.2em; font-weight: bold;"><strong>Total:</strong> $${invoice.totalCost.toFixed(2)}</p>
            </div>
          `;
        }
        
        emailContent = `
          <h1>Your vehicle is ready!</h1>
          <p>Dear ${customerName},</p>
          <p>Great news! We've completed the service on your vehicle.</p>
          <ul>
            <li><strong>Confirmation Number:</strong> ${confirmationNumber}</li>
            <li><strong>Services:</strong> ${services.join(', ')}</li>
            ${notes ? `<li><strong>Notes:</strong> ${notes}</li>` : ''}
          </ul>
          ${invoiceHtml}
          <p>Your vehicle is ready for pickup at:<br><strong>37 Veronica Dr, Halifax, NS</strong></p>
          <p>Thank you for choosing Rogova Auto Shop!</p>
          <p>Best regards,<br>Rogova Auto Shop Team</p>
        `;
        break;
    }

    const adminEmail = "mohammad.alalouh98@gmail.com";
    
    console.log("Attempting to send emails...");

    // Import Resend dynamically to avoid boot-time issues
    const { Resend } = await import("https://esm.sh/resend@4.0.0");
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Retry helper to mitigate 429 rate limits
    const sendWithRetry = async (payload: any, retries = 2) => {
      let attempt = 0;
      while (true) {
        const result: any = await resend.emails.send(payload);
        if (!result?.error) return result;
        const status = (result.error as any)?.statusCode ?? (result.error as any)?.status ?? 0;
        if (status !== 429 || attempt >= retries) return result;
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        attempt++;
      }
    };

    const customerSend = await sendWithRetry({
      from: "Rogova Auto Shop <onboarding@resend.dev>",
      to: [to],
      subject: emailSubject,
      html: emailContent,
    });

    console.log("Customer email result:", customerSend);

    // Wait 600ms to respect rate limits
    await new Promise((r) => setTimeout(r, 600));

    const adminSend = await sendWithRetry({
      from: "Rogova Auto Shop <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `[Admin] ${emailSubject}`,
      html: `
        <div style="font-family: system-ui; padding: 20px; background: #f3f4f6;">
          <p style="color:#6b7280; font-size:14px; margin:0 0 16px;">Admin notification copy</p>
          <div style="background: white; padding: 20px; border-radius: 8px;">
            ${emailContent}
          </div>
        </div>
      `,
    });

    console.log("Admin email result:", adminSend);

    return new Response(
      JSON.stringify({ 
        success: true,
        customer: customerSend, 
        admin: adminSend 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (error: any) {
    console.error("ERROR in send-appointment-email:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
