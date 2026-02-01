import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { moduleId } = await req.json();

    if (!moduleId) {
      throw new Error('moduleId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch module with topics and subtopics
    const { data: moduleData, error: moduleError } = await supabase
      .from('course_modules')
      .select('id, title, description')
      .eq('id', moduleId)
      .single();

    if (moduleError || !moduleData) {
      throw new Error('Module not found');
    }

    const { data: topicsData, error: topicsError } = await supabase
      .from('course_topics')
      .select('id, title')
      .eq('module_id', moduleId)
      .order('order_index', { ascending: true });

    if (topicsError) {
      throw new Error('Failed to fetch topics');
    }

    // Fetch all subtopics for all topics
    let allContent = `Module: ${moduleData.title}\n`;
    if (moduleData.description) {
      allContent += `Description: ${moduleData.description}\n\n`;
    }

    for (const topic of topicsData || []) {
      const { data: subtopics } = await supabase
        .from('course_subtopics')
        .select('title, content')
        .eq('topic_id', topic.id)
        .order('order_index', { ascending: true });

      allContent += `\n## Topic: ${topic.title}\n`;
      for (const subtopic of subtopics || []) {
        allContent += `\n### ${subtopic.title}\n${subtopic.content}\n`;
      }
    }

    console.log('Generating questions for module:', moduleData.title);
    console.log('Content length:', allContent.length);

    // Generate questions using AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert medical education content creator. Generate exactly 25 multiple-choice questions based on the provided course module content. Each question should:
- Test understanding of key concepts from the module
- Have 4 options (A, B, C, D)
- Have exactly one correct answer
- Include a brief explanation for why the correct answer is right

Return ONLY valid JSON in this exact format with no additional text:
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

The correctAnswer is a 0-based index (0=A, 1=B, 2=C, 3=D).`
          },
          {
            role: 'user',
            content: `Generate 25 multiple-choice questions based on this module content:\n\n${allContent}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate questions from AI');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from AI');
    }

    console.log('AI response received, parsing...');

    // Parse the JSON response
    let questions;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        questions = parsed.questions;
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Content:', content.substring(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format from AI');
    }

    console.log(`Generated ${questions.length} questions`);

    // Upsert the questions into the database
    const { error: upsertError } = await supabase
      .from('module_questions')
      .upsert({
        module_id: moduleId,
        questions: questions,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'module_id'
      });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw new Error('Failed to save questions to database');
    }

    return new Response(
      JSON.stringify({
        success: true,
        questionsCount: questions.length,
        moduleTitle: moduleData.title,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
