import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReceiptEmailRequest {
  completedServiceId: string;
  customerEmail: string;
}

const receiptEmailSchema = z.object({
  completedServiceId: z.string().uuid("Invalid service ID format"),
  customerEmail: z.string().email("Invalid email format").max(255)
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = receiptEmailSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Invalid request data",
          details: validationResult.error.issues
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const { completedServiceId, customerEmail } = validationResult.data;
    console.log("Receipt email request for:", completedServiceId, customerEmail);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch completed service details
    const { data: service, error: serviceError } = await supabase
      .from("completed_services")
      .select("*")
      .eq("id", completedServiceId)
      .single();

    if (serviceError || !service) {
      console.error("Error fetching service:", serviceError);
      throw new Error("Service not found");
    }

    console.log("Service fetched successfully");

    // Format the receipt email content
    const receiptDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Use appointment_date if available, otherwise use created_at
    const completionDate = service.appointment_date 
      ? new Date(service.appointment_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : new Date(service.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

    const services = service.services_performed || [];
    const items = service.items_purchased || [];
    const subtotal = service.subtotal || 0;
    const discount = service.discount || 0;
    const taxes = service.taxes || 0;
    const totalCost = service.total_cost || 0;
    const amountPaid = service.amount_received || 0;
    const remainingBalance = service.remaining_balance || 0;
    const paymentStatus = service.payment_status || 'unpaid';
    const hours = service.hours_worked || 0;
    
    // Build vehicle string
    const vehicle = service.car_year && service.car_make && service.car_model
      ? `${service.car_year} ${service.car_make} ${service.car_model}`
      : 'N/A';

    const servicesHtml = services.length > 0 
      ? services.map((s: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${s.service || s.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(s.cost || s.price || 0).toFixed(2)}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="2" style="padding: 8px; text-align: center; color: #999;">No services</td></tr>';

    const itemsHtml = items.length > 0
      ? items.map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.cost || item.total || 0).toFixed(2)}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="2" style="padding: 8px; text-align: center; color: #999;">No items</td></tr>';

    const paymentStatusColor = paymentStatus === 'paid' ? '#10b981' : paymentStatus === 'partial paid' ? '#f59e0b' : '#ef4444';
    const paymentStatusText = paymentStatus === 'paid' ? 'PAID' : paymentStatus === 'partial paid' ? 'PARTIALLY PAID' : 'UNPAID';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Service Receipt</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Service Receipt</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Thank you for your business!</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <div style="margin-bottom: 30px;">
              <p style="margin: 5px 0; color: #666;"><strong>Receipt Date:</strong> ${receiptDate}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Completion Date:</strong> ${completionDate}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Customer:</strong> ${service.customer_name || 'N/A'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${service.customer_email || 'N/A'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${service.customer_phone || 'N/A'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Vehicle:</strong> ${vehicle}</p>
            </div>

            <div style="margin-bottom: 20px;">
              <h2 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 15px;">Services Performed</h2>
              <table style="width: 100%; border-collapse: collapse;">
                ${servicesHtml}
              </table>
            </div>

            <div style="margin-bottom: 20px;">
              <h2 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 15px;">Items Used</h2>
              <table style="width: 100%; border-collapse: collapse;">
                ${itemsHtml}
              </table>
            </div>

            <div style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
              <p style="margin: 5px 0;"><strong>Total Hours Worked:</strong> ${hours} hours</p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #10b981;">
                <span>Discount:</span>
                <span>-$${discount.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Tax:</span>
                <span>$${taxes.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 18px; font-weight: bold; padding-top: 10px; border-top: 2px solid #e5e7eb;">
                <span>Total Amount:</span>
                <span style="color: #667eea;">$${totalCost.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #10b981;">
                <span><strong>Amount Paid:</strong></span>
                <span><strong>$${amountPaid.toFixed(2)}</strong></span>
              </div>
              ${remainingBalance > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #ef4444;">
                  <span><strong>Remaining Balance:</strong></span>
                  <span><strong>$${remainingBalance.toFixed(2)}</strong></span>
                </div>
              ` : ''}
              <div style="margin-top: 15px; padding: 12px; background: ${paymentStatusColor}; color: white; border-radius: 6px; text-align: center; font-weight: bold;">
                Payment Status: ${paymentStatusText}
              </div>
            </div>

            ${service.notes ? `
              <div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #667eea;">Notes:</p>
                <p style="margin: 0; color: #666;">${service.notes}</p>
              </div>
            ` : ''}

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #999; font-size: 14px;">
              <p>Thank you for choosing our services!</p>
              <p>If you have any questions about this receipt, please contact us.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend
    const { Resend } = await import("npm:resend@2.0.0");
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    console.log("Sending receipt email to:", customerEmail);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Service Receipt <onboarding@resend.dev>",
      to: [customerEmail],
      subject: `Service Receipt - ${service.customer_name}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      // Return a more user-friendly error message
      if (emailError.message?.includes("verify a domain")) {
        throw new Error("Email service is in test mode. Please verify your domain at resend.com/domains to send receipts to customers.");
      }
      throw new Error(emailError.message || "Failed to send email");
    }

    console.log("Receipt email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-receipt-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
