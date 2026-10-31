import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { GeneratedCasesSchema, buildGeneratedTemplates } from '../_shared/generatedEncounter.ts';
const DraftSchema = z.object({ caseStudy: z.string().min(20).max(12000), correctDiagnosis: z.string().min(1).max(500), correctTreatment: z.string().min(1).max(12000), difficulty: z.enum(['easy', 'medium', 'hard']), keyClues: z.array(z.string().max(1000)).max(20) });

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
    const LOVABLE_API_KEY = Deno.env.get("GROQ_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !anonKey) throw new Error('Service connection unavailable');

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
    const authClient = createClient(SUPABASE_URL, anonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestBody = z.object({ format: z.literal('structured').optional() }).strict().safeParse(await req.json().catch(() => null));
    if (!requestBody.success) return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // Generate only within the available STG summary coverage; never fall back to model memory.
    const { data: chunks, error } = await supabase.from("knowledge_chunks")
      .select("id, content, chapter, section, page_number").order('id').limit(1000);
    const available = (chunks ?? []).filter(c => c.section && /TREATMENT|MANAGEMENT/i.test(c.content));
    if (error || !available.length) return new Response(JSON.stringify({ error: 'STG treatment reference unavailable. Please try again later.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const source = available[Math.floor(Math.random() * available.length)];
    const selectedIllness = source.section;
    const reference = { chunkId: source.id, chapter: source.chapter ?? 'General', section: source.section, page: source.page_number, excerpt: source.content };
    const relevantContext = `[${reference.chapter} — ${reference.section}, page ${reference.page ?? 'not recorded'}]\n${source.content}`;

    console.log("Found relevant context length:", relevantContext.length);

    // Generate case study using AI
    const structured = requestBody.data.format === 'structured';
    const systemPrompt = structured ? `Generate ONE entirely new synthetic clinical encounter for Ghanaian medical education related to ${selectedIllness}. Fresh batch seed: ${crypto.randomUUID()}.
Use this reference context only when relevant: ${relevantContext || 'No retrieved source context; content is unverified.'}
Return ONLY JSON: {"cases":[{"title":"non-diagnostic presentation title","specialty":"General medicine","diagnosis":"private working diagnosis","diagnosisAliases":["accepted diagnosis"],"characters":[{"id":"patient","name":"synthetic Ghanaian name","age":30,"avatar":"man","role":"Patient","primary":true}],"complaint":"presenting complaint","narrative":"realistic 100-150 word story without revealing diagnosis","symptoms":["symptom"],"history":[],"currentMedications":[],"allergies":[],"vitals":{"Pulse":"80 /min"},"findings":[{"id":"history-1","label":"Ask about symptom onset","kind":"history","answer":"specific synthetic finding"},{"id":"exam-1","label":"Examine patient","kind":"examination","answer":"specific synthetic examination"}],"actions":[{"id":"assess-plan","label":"case-specific management or assessment"},{"id":"followup","label":"case-specific safety net and follow-up"}],"difficulty":"easy","explanation":"case-specific rationale","treatmentQuotes":["verbatim complete treatment passage from the supplied STG summary"]}]}
Return exactly one case in the cases array, with 2-6 findings and 2-6 management actions with unique IDs. Exactly one primary patient per case; children may have a separate accompanying adult. Avatars: man, woman, boy, girl, older-woman, mother-infant. Finding kinds: history, examination, investigation. Difficulty: easy, medium, hard. Include treatmentQuotes containing the complete applicable treatment passage(s), copied VERBATIM from the supplied STG summary, including all applicable drug names, doses, routes, frequencies, durations and non-drug management. Choose patient age, severity, findings and diagnosis to fit a treatment regimen actually present in that summary; do not create unsupported complications. Never alter or invent dose text, citations, clinical outcome predictions, or procedural protocols. Do not prescribe a drug or dose in action labels; medication orders are learner-entered. These are unverified drafts, not reviewed guidance.` : `You are a medical case study generator. Create realistic, educational clinical case studies based on the Ghana Standard Treatment Guidelines.

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
          { role: "user", content: structured ? 'Generate one fresh structured case study with verbatim STG treatmentQuotes. Return only JSON.' : `Generate a case study for ${selectedIllness}. Return only JSON.` }
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
      if (structured) {
        const parsed = GeneratedCasesSchema.parse(JSON.parse(cleanedContent));
        // Keep the answer source-owned even when the model reformats or paraphrases its quotations.
        // The full summary retains regimen headings, age groups and alternatives for contextual comparison.
        const templates = buildGeneratedTemplates({ cases: parsed.cases.map(c => ({ ...c, treatmentQuotes: [reference.excerpt] })) }, reference);
        const { data: savedCases, error: saveError } = await supabase.from('clinical_case_versions').insert(templates.map(t => ({ case_key: t.key, version: 1, title: t.title, specialty: t.specialty, encounter: t.encounter, private_rules: t.rules, source_references: [{ chunkId: reference.chunkId, chapter: reference.chapter, section: reference.section, page: reference.page, kind: 'stored_stg_summary' }], review_status: 'ai_draft' }))).select('id, case_key, title, specialty, review_status, encounter');
        if (saveError) throw saveError;
        return new Response(JSON.stringify({ cases: (savedCases ?? []).map(c => ({ id: c.id, key: c.case_key, title: c.title, specialty: c.specialty, reviewStatus: c.review_status, difficulty: c.encounter.difficulty, characters: c.encounter.characters, emergency: false, procedural: false })) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      caseData = DraftSchema.parse(JSON.parse(cleanedContent));
    } catch (parseError) {
      console.error("Failed to validate generated case:", parseError instanceof Error ? parseError.message : 'Invalid structure');
      throw new Error("Failed to parse case study response");
    }

    return new Response(JSON.stringify({
      id: crypto.randomUUID(),
      illness: selectedIllness,
      ...caseData,
      contentType: 'ai_draft',
      reviewStatus: 'unverified',
      competitiveEligible: false
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
