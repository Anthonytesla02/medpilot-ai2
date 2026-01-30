import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerificationRequest {
  email: string;
  fullName: string;
  userId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, userId }: VerificationRequest = await req.json();

    if (!email || !userId) {
      throw new Error("Email and userId are required");
    }

    // Create Supabase admin client to generate verification link
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const originHeader = req.headers.get("origin");
    const refererHeader = req.headers.get("referer");
    const origin = originHeader ?? (refererHeader ? new URL(refererHeader).origin : null);

    if (!origin) {
      throw new Error(
        "Missing Origin/Referer header. Provide a redirect URL from the client when invoking this function."
      );
    }

    // Generate email verification OTP link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${origin}/chat`,
      }
    });

    if (linkError) {
      console.error("Error generating verification link:", linkError);
      throw new Error("Failed to generate verification link");
    }

    const verificationUrl = linkData.properties?.action_link;
    
    if (!verificationUrl) {
      throw new Error("No verification URL generated");
    }

    console.log("Sending verification email to:", email);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MediGuide AI <onboarding@resend.dev>",
        to: [email],
        subject: "Verify your MediGuide AI account",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0f766e; margin-bottom: 10px;">MediGuide AI</h1>
              <p style="color: #666; font-size: 14px;">Ghana Standard Treatment Guidelines Assistant</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
              <h2 style="color: #0f766e; margin-top: 0;">Welcome${fullName ? `, ${fullName}` : ''}!</h2>
              <p>Thank you for signing up for MediGuide AI. Please verify your email address to get started.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background: #0f766e; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666;">
                Or copy and paste this link in your browser:<br>
                <a href="${verificationUrl}" style="color: #0f766e; word-break: break-all;">${verificationUrl}</a>
              </p>
            </div>
            
            <div style="text-align: center; color: #999; font-size: 12px;">
              <p>If you didn't create an account with MediGuide AI, you can safely ignore this email.</p>
              <p>This link will expire in 24 hours.</p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      // Common case on Resend free/testing mode: only allowed to email the account owner.
      const message =
        (emailResult && typeof emailResult === "object" && "message" in emailResult
          ? String((emailResult as any).message)
          : "Failed to send email");

      console.error("Resend API error:", emailResult);

      return new Response(
        JSON.stringify({
          error: message,
          provider: "resend",
          status: emailResponse.status,
        }),
        {
          status: emailResponse.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Verification email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-verification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
