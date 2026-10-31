import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: Message[];
  conversationId?: string;
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

    // Require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, conversationId } = (await req.json()) as ChatRequest;
    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Search both knowledge bases for relevant content
    let stgContext = "";
    let bnfContext = "";
    try {
      const searchTerms = lastUserMessage
        .toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 3)
        .slice(0, 5);

      if (searchTerms.length > 0) {
        // Search STG knowledge base
        const { data: stgChunks, error: stgError } = await supabase
          .from("knowledge_chunks")
          .select("content, chapter, section, page_number")
          .limit(10);

        if (!stgError && stgChunks && stgChunks.length > 0) {
          const scoredStg = stgChunks.map(chunk => {
            const content = chunk.content.toLowerCase();
            const score = searchTerms.reduce((acc, term) => acc + (content.includes(term) ? 1 : 0), 0);
            return { ...chunk, score };
          });
          const topStg = scoredStg.filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
          if (topStg.length > 0) {
            stgContext = topStg.map(c => `[${c.chapter || "General"} - ${c.section || ""}]\n${c.content}`).join("\n\n---\n\n");
          }
        }

        // Search BNF knowledge base
        const { data: bnfChunks, error: bnfError } = await supabase
          .from("bnf_knowledge_chunks")
          .select("content, section, page_number")
          .limit(10);

        if (!bnfError && bnfChunks && bnfChunks.length > 0) {
          const scoredBnf = bnfChunks.map(chunk => {
            const content = chunk.content.toLowerCase();
            const score = searchTerms.reduce((acc, term) => acc + (content.includes(term) ? 1 : 0), 0);
            return { ...chunk, score };
          });
          const topBnf = scoredBnf.filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
          if (topBnf.length > 0) {
            bnfContext = topBnf.map(c => `[BNF - ${c.section || "General"}]\n${c.content}`).join("\n\n---\n\n");
          }
        }
      }
    } catch (searchError) {
      console.error("Knowledge search error:", searchError);
    }

    // Build system prompt with dual-source RAG context
    const systemPrompt = `You are Med Pilot AI, a knowledgeable medical assistant trained on TWO authoritative sources:
1. **Ghana Standard Treatment Guidelines (STG)** - 7th Edition, 2017
2. **British National Formulary (BNF)** - Edition 80, September 2020

You have comprehensive knowledge of BOTH references. You are an expert on their contents.

CRITICAL RULES:
- ALWAYS provide helpful, specific medical information. NEVER say "I don't have this information" or "this was not in the provided text."
- You ARE an expert on both STG and BNF content. Draw from your full knowledge of these publications.
- If context snippets are provided below, incorporate them. But even WITHOUT context snippets, you still know the content of these books and should answer authoritatively.

RESPONSE FORMAT:
- When answering, clearly separate information from each source using:
  📗 **Ghana STG:** (for STG-based guidance)
  📘 **BNF:** (for BNF-based guidance)
- Highlight any differences between the two sources when applicable.
- If a topic is only covered by one source, still provide the answer from that source and note the other source may not specifically address it.

RESPONSE STYLE:
- Be BRIEF and direct. Get straight to the point.
- Give short, actionable answers (2-4 sentences max per source for simple questions).
- Only elaborate if the user asks "explain", "why", "how does it work", or similar.
- Use bullet points for lists, but keep them short.

CONTENT GUIDELINES:
- Provide specific drug names, dosages, and regimens when available.
- Include critical warnings only (not exhaustive lists).
- For treatments, include first-line and alternative options.
- End with "Consult a healthcare professional" only for serious or life-threatening conditions.

${stgContext ? `REFERENCE CONTEXT FROM GHANA STG (use to supplement your knowledge):\n${stgContext}` : ""}

${bnfContext ? `REFERENCE CONTEXT FROM BNF (use to supplement your knowledge):\n${bnfContext}` : ""}

Always indicate which source (STG or BNF) your information comes from. Be helpful, specific, and clinically accurate.`;

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
          ...messages,
        ],
        stream: true,
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
      
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
