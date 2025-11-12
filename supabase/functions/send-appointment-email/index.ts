import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Input validation schema
const appointmentEmailSchema = z.object({
  to: z.string().email("Invalid email address"),
  customerName: z.string().min(1).max(200),
  confirmationNumber: z.string().min(1).max(50),
  appointmentDate: z.string(),
  appointmentTime: z.string(),
  services: z.array(z.string()).min(1),
  carMake: z.string().optional(),
  carModel: z.string().optional(),
  carYear: z.number().optional(),
  action: z.enum(['booking', 'update', 'cancel', 'in_progress', 'complete']),
  notes: z.string().max(1000).optional(),
  invoice: z.object({
    servicesPerformed: z.array(z.object({
      service: z.string(),
      cost: z.number(),
    })),
    itemsPurchased: z.array(z.object({
      name: z.string(),
      cost: z.number(),
    })).optional(),
    servicesSubtotal: z.number(),
    itemsSubtotal: z.number(),
    taxes: z.number(),
    taxRate: z.number(),
    discount: z.number(),
    totalCost: z.number(),
  }).optional(),
});

type AppointmentEmailRequest = z.infer<typeof appointmentEmailSchema>;

const handler = async (req: Request): Promise<Response> => {
  console.log("Function invoked, method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse and validate input
    const rawBody = await req.json();
    const validationResult = appointmentEmailSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Invalid request data"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const body = validationResult.data;
    console.log("Request validated, confirmation:", body.confirmationNumber);

    // Verify appointment exists and matches the provided details
    const { data: appointment, error: dbError } = await supabase
      .from("appointments")
      .select("id, customer_email, confirmation_number, status")
      .eq("confirmation_number", body.confirmationNumber)
      .single();

    if (dbError || !appointment) {
      console.error("Appointment not found:", body.confirmationNumber);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Appointment not found"
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Verify the email matches the appointment
    if (appointment.customer_email !== body.to) {
      console.error("Email mismatch for appointment:", body.confirmationNumber);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Invalid request"
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    console.log("Appointment verified:", appointment.id);

    const { to, customerName, confirmationNumber, appointmentDate, appointmentTime, services, carMake, carModel, carYear, action, notes, invoice } = body;

    // Build car info string if available
    const carInfo = carMake && carModel ? `${carYear || ''} ${carMake} ${carModel}`.trim() : '';

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
            ${carInfo ? `<li><strong>Vehicle:</strong> ${carInfo}</li>` : ''}
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
            ${carInfo ? `<li><strong>Vehicle:</strong> ${carInfo}</li>` : ''}
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
          <p>Your appointment (${confirmationNumber}) for your ${carInfo || 'vehicle'} scheduled for ${appointmentDate} at ${appointmentTime} has been cancelled.</p>
          <p>If you would like to book a new appointment, please visit our website.</p>
          <p>Best regards,<br>Rogova Auto Shop Team</p>
        `;
        break;
      
      case 'in_progress':
        emailSubject = "Service In Progress - Rogova Auto Shop";
        emailContent = `
          <h1>Your service has started!</h1>
          <p>Dear ${customerName},</p>
          <p>We've started working on your ${carInfo || 'vehicle'}. Your service is currently in progress.</p>
          <ul>
            <li><strong>Confirmation Number:</strong> ${confirmationNumber}</li>
            ${carInfo ? `<li><strong>Vehicle:</strong> ${carInfo}</li>` : ''}
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
          
          const itemsHtml = (invoice.itemsPurchased && invoice.itemsPurchased.length > 0)
            ? invoice.itemsPurchased
                .map(i => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${i.name} (with tax)</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${i.cost.toFixed(2)}</td></tr>`)
                .join('')
            : '';

          const discountRow = invoice.discount > 0 ? `
            <tr style="background-color: #fee;">
              <td style="padding: 8px; border-bottom: 1px solid #eee; color: #dc2626;">Discount</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #dc2626;">-$${invoice.discount.toFixed(2)}</td>
            </tr>
          ` : '';
          
          invoiceHtml = `
            <h2>Invoice Details</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Service/Item</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Cost</th>
                </tr>
              </thead>
              <tbody>
                ${servicesHtml}
                ${itemsHtml}
                <tr style="background-color: #f9f9f9; font-weight: bold;">
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">Services Subtotal</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${invoice.servicesSubtotal.toFixed(2)}</td>
                </tr>
                ${invoice.itemsSubtotal > 0 ? `
                  <tr style="background-color: #f9f9f9; font-weight: bold;">
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">Items Subtotal</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${invoice.itemsSubtotal.toFixed(2)}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">Taxes (${invoice.taxRate}% on services only)</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${invoice.taxes.toFixed(2)}</td>
                </tr>
                ${discountRow}
              </tbody>
            </table>
            <div style="margin-top: 20px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
              <p style="margin: 10px 0; font-size: 1.2em; font-weight: bold;"><strong>Total Amount:</strong> $${invoice.totalCost.toFixed(2)}</p>
            </div>
          `;
        }
        
        emailContent = `
          <h1>Your vehicle is ready!</h1>
          <p>Dear ${customerName},</p>
          <p>Great news! We've completed the service on your ${carInfo || 'vehicle'}.</p>
          <ul>
            <li><strong>Confirmation Number:</strong> ${confirmationNumber}</li>
            ${carInfo ? `<li><strong>Vehicle:</strong> ${carInfo}</li>` : ''}
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
    // Log detailed error server-side only
    console.error("ERROR in send-appointment-email:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Failed to send email. Please try again later."
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
