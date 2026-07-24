import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GradeRequest {
  correctDiagnosis: string;
  correctTreatment: string;
  userDiagnosis: string;
  userTreatment: string;
  illness: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const { correctDiagnosis, correctTreatment, userDiagnosis, userTreatment, illness } = 
      (await req.json()) as GradeRequest;

    console.log("Grading answers for:", illness);
    console.log("User diagnosis:", userDiagnosis);
    console.log("User treatment:", userTreatment);

    const systemPrompt = `You are a medical education grading assistant. Your task is to evaluate student answers about medical diagnoses and treatments.

GRADING CRITERIA:

For DIAGNOSIS:
- Award full marks (100%) if the user's answer is semantically equivalent to the correct diagnosis
- Award partial marks (50-80%) for partially correct or related diagnoses
- Award 0% for completely wrong diagnoses
- Be lenient with spelling variations and abbreviations
- Consider synonyms and alternative medical terminology

For TREATMENT:
- Award marks based on how many correct treatment elements are mentioned
- Full marks for mentioning: correct drug class, drug name, approximate dosage, duration
- Partial marks for partially correct treatments
- Consider that users may use different wording but convey the same meaning
- Be lenient: if they mention the right drug class or general approach, give partial credit
- Accept generic or brand names interchangeably

RESPOND IN THIS EXACT JSON FORMAT:
{
  "diagnosisScore": <0-100>,
  "diagnosisCorrect": <true/false>,
  "diagnosisFeedback": "Brief feedback on the diagnosis answer",
  "treatmentScore": <0-100>,
  "treatmentCorrect": <true/false>,
  "treatmentFeedback": "Brief feedback on the treatment answer",
  "overallScore": <0-100>,
  "overallFeedback": "One sentence summary of performance"
}

IMPORTANT: Return ONLY valid JSON, no additional text.`;

    const userPrompt = `Grade these answers for the condition: ${illness}

CORRECT DIAGNOSIS: ${correctDiagnosis}
USER'S DIAGNOSIS: ${userDiagnosis || "(No answer provided)"}

CORRECT TREATMENT: ${correctTreatment}
USER'S TREATMENT: ${userTreatment || "(No answer provided)"}

Evaluate semantically - the user's wording doesn't need to match exactly. Return JSON only.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("Failed to grade answers");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response
    let gradeData;
    try {
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      gradeData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse grading response");
    }

    return new Response(JSON.stringify({
      ...gradeData,
      correctDiagnosis,
      correctTreatment
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Grade case study error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
