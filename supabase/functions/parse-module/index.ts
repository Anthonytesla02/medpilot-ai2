import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParsedSubtopic {
  title: string;
  content: string;
  order_index: number;
}

interface ParsedTopic {
  title: string;
  subtopics: ParsedSubtopic[];
  order_index: number;
}

interface ParsedModule {
  title: string;
  description: string;
  topics: ParsedTopic[];
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

    const { content, moduleTitle } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Parsing module content with AI...");

    // Use AI to parse the module content
    const systemPrompt = `You are an expert at parsing educational course content. Your task is to analyze the provided module text and extract structured content.

IMPORTANT RULES:
1. Identify the main MODULE title from the beginning of the content
2. Break down the content into logical TOPICS (main sections like "First Aid", "Diabetes", "Hypertension", etc.)
3. Each topic should be broken into SUBTOPICS - bite-sized learning chunks (300-600 words each ideally)
4. Preserve ALL the important information - do NOT over-summarize or lose content
5. Clean up formatting artifacts (like page numbers, random numbers, broken lines)
6. Merge related bullet points and paragraphs logically
7. Keep medical/technical terms accurate

Return a JSON object with this exact structure:
{
  "title": "Module title",
  "description": "Brief 1-2 sentence description of what this module covers",
  "topics": [
    {
      "title": "Topic Name",
      "order_index": 0,
      "subtopics": [
        {
          "title": "Subtopic Name",
          "content": "The full content for this subtopic in markdown format. Include all relevant information, bullet points, etc.",
          "order_index": 0
        }
      ]
    }
  ]
}`;

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
          { role: "user", content: `Parse this module content and return the structured JSON:\n\n${content}` },
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

    console.log("AI parsing complete, inserting into database...");

    // Parse the JSON response
    let parsedModule: ParsedModule;
    try {
      parsedModule = JSON.parse(parsedContent);
    } catch (e) {
      console.error("Failed to parse AI response:", parsedContent);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Override title if provided
    if (moduleTitle) {
      parsedModule.title = moduleTitle;
    }

    // Get the next order_index for modules
    const { data: existingModules } = await supabaseUser
      .from("course_modules")
      .select("order_index")
      .order("order_index", { ascending: false })
      .limit(1);

    const nextModuleIndex = existingModules && existingModules.length > 0 
      ? existingModules[0].order_index + 1 
      : 0;

    // Insert the module
    const { data: moduleData, error: moduleError } = await supabaseUser
      .from("course_modules")
      .insert({
        title: parsedModule.title,
        description: parsedModule.description,
        order_index: nextModuleIndex,
        is_active: true,
      })
      .select()
      .single();

    if (moduleError) {
      console.error("Module insert error:", moduleError);
      throw new Error("Failed to create module");
    }

    console.log("Module created:", moduleData.id);

    // Insert topics and subtopics
    let totalTopics = 0;
    let totalSubtopics = 0;

    for (const topic of parsedModule.topics) {
      const { data: topicData, error: topicError } = await supabaseUser
        .from("course_topics")
        .insert({
          module_id: moduleData.id,
          title: topic.title,
          order_index: topic.order_index,
        })
        .select()
        .single();

      if (topicError) {
        console.error("Topic insert error:", topicError);
        continue;
      }

      totalTopics++;

      for (const subtopic of topic.subtopics) {
        const { error: subtopicError } = await supabaseUser
          .from("course_subtopics")
          .insert({
            topic_id: topicData.id,
            title: subtopic.title,
            content: subtopic.content,
            order_index: subtopic.order_index,
          });

        if (subtopicError) {
          console.error("Subtopic insert error:", subtopicError);
          continue;
        }

        totalSubtopics++;
      }
    }

    console.log(`Module parsing complete: ${totalTopics} topics, ${totalSubtopics} subtopics`);

    return new Response(
      JSON.stringify({
        success: true,
        module: {
          id: moduleData.id,
          title: parsedModule.title,
          description: parsedModule.description,
          topics_count: totalTopics,
          subtopics_count: totalSubtopics,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Parse module error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
