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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { messages, conversationId } = (await req.json()) as ChatRequest;
    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Search knowledge base for relevant content
    let relevantContext = "";
    try {
      // Simple keyword-based search
      const searchTerms = lastUserMessage
        .toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 3)
        .slice(0, 5);

      if (searchTerms.length > 0) {
        const { data: chunks, error } = await supabase
          .from("knowledge_chunks")
          .select("content, chapter, section, page_number")
          .limit(10);

        if (!error && chunks && chunks.length > 0) {
          // Score chunks by keyword matches
          const scoredChunks = chunks.map(chunk => {
            const content = chunk.content.toLowerCase();
            const score = searchTerms.reduce((acc, term) => {
              return acc + (content.includes(term) ? 1 : 0);
            }, 0);
            return { ...chunk, score };
          });

          // Get top matching chunks
          const topChunks = scoredChunks
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

          if (topChunks.length > 0) {
            relevantContext = topChunks
              .map(c => `[${c.chapter || "General"} - ${c.section || ""}]\n${c.content}`)
              .join("\n\n---\n\n");
          }
        }
      }
    } catch (searchError) {
      console.error("Knowledge search error:", searchError);
    }

    // Build system prompt with RAG context
    const systemPrompt = `You are MediGuide AI, a concise medical assistant using the Ghana Standard Treatment Guidelines (7th Edition, 2017).

RESPONSE STYLE:
- Be BRIEF and direct. Get straight to the point.
- Give short, actionable answers (2-4 sentences max for simple questions).
- Only elaborate if the user asks "explain", "why", "how does it work", or similar.
- Use bullet points for lists, but keep them short.

CONTENT GUIDELINES:
- Provide specific drug names and dosages when available.
- Include critical warnings only (not exhaustive lists).
- If unsure, say so briefly.
- End with "Consult a healthcare professional" only for serious conditions.

${relevantContext ? `CONTEXT FROM GHANA STG:
${relevantContext}` : ""}

Be helpful but concise.`;

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
