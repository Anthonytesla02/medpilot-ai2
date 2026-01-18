import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CURATED_ILLNESSES = [
  "Diarrhoea", "Rotavirus Disease and Diarrhoea", "Constipation", "Peptic Ulcer Disease",
  "Gastro-oesophageal Reflux Disease", "Haemorrhoids", "Vomiting", "Anaemia", "Measles",
  "Pertussis", "Common cold", "Pneumonia", "Headache", "Boils", "Impetigo", "Buruli ulcer",
  "Yaws", "Superficial Fungal Skin infections", "Pityriasis Versicolor", "Herpes Simplex Infections",
  "Herpes Zoster Infections", "Chicken pox", "Large Chronic Ulcers", "Pruritus", "Urticaria",
  "Reactive Erythema and Bullous Reaction", "Acne Vulgaris", "Eczema", "Intertrigo",
  "Diabetes Mellitus", "Diabetic Ketoacidosis", "Diabetes in Pregnancy", "Treatment-Induced Hypoglycemia",
  "Dyslipidaemia", "Goitre", "Hypothyroidism", "Hyperthyroidism", "Overweight and Obesity",
  "Dysmenorrhoea", "Abortion", "Abnormal Vaginal Bleeding", "Abnormal Vaginal Discharge",
  "Acute Lower Abdominal Pain", "Menopause", "Erectile Dysfunction", "Urinary Tract Infection",
  "Sexually Transmitted Infections in Adults", "STI-related Urethral Discharge in Males",
  "Mycoplasma genitalum", "STI-related Persistent or Recurrent Urethral Discharge",
  "STI-related Vaginal Discharge", "STI-related Lower Abdominal Pain in Women",
  "STI-related Genital Ulcer", "STI-related Scrotal Swelling", "STI-related Inguinal Bubo",
  "STI-related Genital Warts", "STI-related Ano-rectal Related Syndromes",
  "STI-related Urethral Discharge Syndrome in Children", "STI-related Vaginal Discharge Syndromes in Children",
  "STI-related Lower Abdominal Pain or Pelvic Inflammatory Disease Syndrome in Children",
  "STI-related Genital Ulcer Syndrome in Children", "STI-related Ano-rectal Related Syndromes in Children",
  "Fever", "Tuberculosis", "Typhoid fever", "Malaria", "Uncomplicated Malaria", "Severe Malaria",
  "Malaria in Pregnancy", "Worm Infestation", "Xerophthalmia", "Foreign body in the eye",
  "Neonatal conjunctivitis", "Red eye", "Stridor", "Acute Epiglottitis", "Retropharyngeal Abscess",
  "Pharyngitis and Tonsillitis", "Acute Sinusitis", "Acute otitis Media", "Chronic Otitis Media",
  "Epistaxis", "Dental Caries", "Oral Candidiasis", "Acute Necrotizing Ulcerative Gingivitis",
  "Acute Bacterial Sialoadenitis", "Chronic Periodontal Infections", "Mouth Ulcers",
  "Odontogenic Infections", "Osteoarthritis", "Rheumatoid arthritis", "Juvenile Idiopathic Arthritis",
  "Back pain", "Gout", "Dislocations", "Open Fractures", "Cellulitis", "Burns", "Wounds",
  "Bites and Stings", "Shock", "Acute Allergic Reaction"
];

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

    // Pick a random illness
    const selectedIllness = CURATED_ILLNESSES[Math.floor(Math.random() * CURATED_ILLNESSES.length)];
    console.log("Selected illness:", selectedIllness);

    // Initialize Supabase client and search for relevant knowledge
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Search knowledge base for the illness
    const searchTerms = selectedIllness.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    const { data: chunks, error } = await supabase
      .from("knowledge_chunks")
      .select("content, chapter, section, page_number")
      .limit(50);

    let relevantContext = "";
    if (!error && chunks && chunks.length > 0) {
      // Score chunks by keyword matches
      const scoredChunks = chunks.map(chunk => {
        const content = chunk.content.toLowerCase();
        const score = searchTerms.reduce((acc, term) => {
          return acc + (content.includes(term) ? 2 : 0);
        }, 0);
        // Bonus for exact illness name match
        if (content.includes(selectedIllness.toLowerCase())) {
          return { ...chunk, score: score + 10 };
        }
        return { ...chunk, score };
      });

      const topChunks = scoredChunks
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      if (topChunks.length > 0) {
        relevantContext = topChunks
          .map(c => `[${c.chapter || "General"} - ${c.section || ""}]\n${c.content}`)
          .join("\n\n---\n\n");
      }
    }

    console.log("Found relevant context length:", relevantContext.length);

    // Generate case study using AI
    const systemPrompt = `You are a medical case study generator. Create realistic, educational clinical case studies based on the Ghana Standard Treatment Guidelines.

CONTEXT FROM GHANA STG:
${relevantContext || "No specific context available for " + selectedIllness}

TASK: Generate a case study for: ${selectedIllness}

REQUIREMENTS:
1. Create a realistic patient scenario with:
   - Ghanaian name appropriate for the patient's demographics
   - Age and occupation relevant to the condition
   - Clear presenting symptoms and history
   - Relevant physical examination findings
   - Any pertinent medical/social history

2. The case should clearly point to the diagnosis of "${selectedIllness}" without explicitly stating it.

3. Make it educational but realistic - like a pharmacy or clinical encounter.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "caseStudy": "The full case study narrative (2-3 paragraphs, 100-150 words)",
  "correctDiagnosis": "The exact diagnosis",
  "correctTreatment": "The specific treatment protocol from Ghana STG including drug names and dosages where applicable",
  "difficulty": "easy|medium|hard",
  "keyClues": ["clue1", "clue2", "clue3"]
}

IMPORTANT: Return ONLY valid JSON, no additional text.`;

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
          { role: "user", content: `Generate a case study for ${selectedIllness}. Return only JSON.` }
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
      
      throw new Error("Failed to generate case study");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response
    let caseData;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      caseData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse case study response");
    }

    return new Response(JSON.stringify({
      id: crypto.randomUUID(),
      illness: selectedIllness,
      ...caseData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate case study error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
