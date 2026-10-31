import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParsedQuestion {
  id: number;
  question: string;
  context?: string;
  options: { letter: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  needsReview: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("GROQ_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with user's token to check admin role
    const supabaseUser = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Verify the user from the token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseUser
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Parsing test questions with AI...");

    // Use AI to parse the questions
    const systemPrompt = `You are an expert at parsing exam questions. Your task is to analyze raw text containing multiple choice questions and extract them into a structured format.

IMPORTANT RULES:
1. Questions may use different formats:
   - Roman numeral format (I, II, III) with answer key:
     Answer Key: A = I only, B = II only, C = III only, D = II and III only, E = I, II and III
     These questions list statements as I, II, III and the answer (A-E) indicates which combination is correct.
   - Standard format with a, b, c, d options
   
2. CRITICAL - For Roman numeral questions:
   - The "question" field MUST include BOTH the main question text AND all the Roman numeral statements formatted clearly
   - Format the question like this: "Main question text:\n\nI. First statement\nII. Second statement\nIII. Third statement"
   - Convert the answer options to standard format: a) I only, b) II only, c) III only, d) II and III only, e) I, II and III
   - Map the answer key (A-E) to the correct answer (a-e)
   - DO NOT lose the main question text - it must appear before the Roman numeral statements
   
3. Extract the correct answer if provided (often after "Answer:" in the text)
4. If no answer is provided, set needsReview to true
5. Clean up any formatting artifacts
6. Preserve technical/medical terminology exactly
7. Group related context/preamble with questions if present

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "id": 1,
      "question": "The full question text INCLUDING any numbered statements (I, II, III) on separate lines",
      "context": "Optional preamble or context for the question",
      "options": [
        { "letter": "a", "text": "First option" },
        { "letter": "b", "text": "Second option" },
        { "letter": "c", "text": "Third option" },
        { "letter": "d", "text": "Fourth option" }
      ],
      "correctAnswer": "a",
      "explanation": "Brief explanation if available, otherwise 'Review study materials for details.'",
      "needsReview": false
    }
  ],
  "totalParsed": 50,
  "needsReviewCount": 5
}

EXAMPLE TRANSFORMATION for Roman numeral questions:

INPUT:
"1. This description is restricted to pharmacy or pharmacist except
I. Licensed chemical seller
II. Dispensary
III. Chemist
Answer: A"

OUTPUT:
{
  "id": 1,
  "question": "This description is restricted to pharmacy or pharmacist except:\\n\\nI. Licensed chemical seller\\nII. Dispensary\\nIII. Chemist",
  "options": [
    { "letter": "a", "text": "I only" },
    { "letter": "b", "text": "II only" },
    { "letter": "c", "text": "III only" },
    { "letter": "d", "text": "II and III only" },
    { "letter": "e", "text": "I, II and III" }
  ],
  "correctAnswer": "a",
  "explanation": "Licensed chemical seller is not restricted to pharmacy or pharmacist.",
  "needsReview": false
}

CRITICAL: The question field MUST contain the actual question text before the Roman numerals. Never output just "I only, II only" style options without the actual question text.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        reasoning_format: "parsed",
        max_tokens: 16384,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse these exam questions and return structured JSON. Handle both Roman numeral (I, II, III with A-E answers) and standard (a, b, c, d) formats:\n\n${content}` },
        ],
        response_format: { type: "json_object" },
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please check your account." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI service error");
    }

    const aiResponse = await response.json();
    const parsedContent = aiResponse.choices?.[0]?.message?.content;

    if (!parsedContent) {
      throw new Error("No content returned from AI");
    }

    console.log("AI parsing complete");

    // Parse the JSON response
    let parsedResult;
    try {
      parsedResult = JSON.parse(parsedContent);
    } catch (e) {
      console.error("Failed to parse AI response:", parsedContent);
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(
      JSON.stringify({
        success: true,
        questions: parsedResult.questions || [],
        totalParsed: parsedResult.totalParsed || parsedResult.questions?.length || 0,
        needsReviewCount: parsedResult.needsReviewCount || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Parse questions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
