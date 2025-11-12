import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AppointmentEmailRequest {
  to: string;
  subject: string;
  customerName: string;
  confirmationNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  services: string[];
  action: 'booking' | 'update' | 'cancel' | 'in_progress' | 'complete';
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to, 
      customerName, 
      confirmationNumber, 
      appointmentDate, 
      appointmentTime,
      services,
      action,
      notes
    }: AppointmentEmailRequest = await req.json();

    console.log("Sending appointment email:", { to, action, confirmationNumber });

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
        emailSubject = "Service Complete - Rogova Auto Shop";
        emailContent = `
          <h1>Your vehicle is ready!</h1>
          <p>Dear ${customerName},</p>
          <p>Great news! We've completed the service on your vehicle.</p>
          <ul>
            <li><strong>Confirmation Number:</strong> ${confirmationNumber}</li>
            <li><strong>Services:</strong> ${services.join(', ')}</li>
          </ul>
          <p>Your vehicle is ready for pickup at:<br><strong>37 Veronica Dr, Halifax, NS</strong></p>
          <p>Thank you for choosing Rogova Auto Shop!</p>
          <p>Best regards,<br>Rogova Auto Shop Team</p>
        `;
        break;
    }

    // Send to customer first, then admin (with slight delay to respect rate limits)
    const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "mohammad.alalouh98@gmail.com";

    const customerSend = await resend.emails.send({
      from: "Rogova Auto Shop <onboarding@resend.dev>",
      to: [to],
      subject: emailSubject,
      html: emailContent,
    });

    // Simple rate-limit spacing between sends (Resend: 2 req/sec)
    await new Promise((r) => setTimeout(r, 600));

    const adminSend = await resend.emails.send({
      from: "Rogova Auto Shop <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `[Admin Copy] ${emailSubject}`,
      html: `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto;">
          <p style="color:#64748b;font-size:14px;margin:0 0 8px;">Admin copy of the following notification:</p>
          ${emailContent}
        </div>
      `,
    });

    console.log("Customer email result:", customerSend);
    console.log("Admin email result:", adminSend);

    const bothFailed = !!customerSend.error && !!adminSend.error;

    return new Response(
      JSON.stringify({ customer: customerSend, admin: adminSend }),
      {
        status: bothFailed ? 500 : 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (error: any) {
    console.error("Error in send-appointment-email function:", error);
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