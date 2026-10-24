import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { clinicalTemplates, emptyDecisions, type Encounter, type ClinicalRules } from '../_shared/clinical.ts';
import { checkSafety, evaluateAttempt } from '../_shared/evaluate.ts';
import { drugInteractionReferences } from '../_shared/drugInteractions.ts';

const orderSchema = z.object({ id: z.string().max(100), ingredient: z.string().min(1).max(100), dose: z.string().max(100), route: z.string().max(100), frequency: z.string().max(100), duration: z.string().max(100), status: z.enum(['prescribed', 'administered']), acknowledged: z.boolean() });
const decisionsSchema = z.object({ diagnosis: z.string().max(500), differentials: z.string().max(1000), orders: z.array(orderSchema).max(30), actions: z.array(z.string().max(100)).max(100), procedures: z.array(z.string().max(100)).max(30) });
const bodySchema = z.object({ action: z.enum(['library', 'start', 'load', 'event', 'save', 'check', 'submit', 'profile']), caseKey: z.string().max(100).optional(), attemptId: z.string().uuid().optional(), mode: z.enum(['learning', 'challenge']).optional(), revision: z.number().int().nonnegative().optional(), eventId: z.string().max(100).optional(), eventKind: z.enum(['finding', 'action', 'procedure']).optional(), decisions: decisionsSchema.optional(), submissionKey: z.string().uuid().optional() });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !key) return json({ error: 'Clinical service connection is unavailable.' }, 503);
    const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
    if (!token) return json({ error: 'Sign in to continue.' }, 401);
    const auth = createClient(url, anon);
    const { data: authData, error: authError } = await auth.auth.getUser(token);
    if (authError || !authData.user) return json({ error: 'Sign in to continue.' }, 401);
    const userId = authData.user.id;
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: 'Invalid clinical request.', fields: parsed.error.flatten().fieldErrors }, 400);
    const body = parsed.data;
    const db = createClient(url, key);

    if (body.action === 'library') {
      // Seed immutable source-backed drafts; never promote to clinically reviewed automatically.
      const { error } = await db.from('clinical_case_versions').upsert(clinicalTemplates.map(t => ({ case_key: t.key, version: 1, title: t.title, specialty: t.specialty, encounter: t.encounter, private_rules: t.rules, source_references: t.encounter.sources })), { onConflict: 'case_key,version', ignoreDuplicates: true });
      if (error) throw error;
      const { error: referenceError } = await db.from('clinical_medication_references').upsert(drugInteractionReferences.map(r => ({ id: r.id, data: r })), { onConflict: 'id', ignoreDuplicates: true });
      if (referenceError) throw referenceError;
      const { error: badgeError } = await db.from('clinical_badge_definitions').upsert([
        { id: 'flawless-case', name: 'Flawless Case', description: 'Complete a reviewed case with 100% and no safety errors.', rarity: 'rare', criteria: { reviewed: true, score: 100, criticalErrors: 0 } },
        { id: 'precision-practitioner', name: 'Precision Practitioner', description: 'Complete all reviewed procedural requirements in order without errors.', rarity: 'rare', criteria: { reviewed: true, score: 100, proceduralOrder: true, criticalErrors: 0 } },
        { id: 'emergency-response', name: 'Emergency Response', description: 'Complete every reviewed emergency requirement before the scenario deadline.', rarity: 'rare', criteria: { reviewed: true, score: 100, beforeDeadline: true, criticalErrors: 0 } },
      ], { onConflict: 'id', ignoreDuplicates: true });
      if (badgeError) throw badgeError;
      const { data, error: listError } = await db.from('clinical_case_versions').select('id, case_key, title, specialty, review_status, encounter');
      if (listError) throw listError;
      return json({ cases: (data ?? []).map(c => ({ id: c.id, key: c.case_key, title: c.title, specialty: c.specialty, reviewStatus: c.review_status, difficulty: c.encounter.difficulty, characters: c.encounter.characters, emergency: !!c.encounter.emergencySeconds, procedural: c.encounter.procedures.length > 0 })), interactions: drugInteractionReferences });
    }

    if (body.action === 'profile') {
      const { data: attempts, error } = await db.from('clinical_attempts').select('id, case_version_id, mode, status, result, started_at, completed_at').eq('user_id', userId).order('started_at', { ascending: false }).limit(200);
      if (error) throw error;
      const { data: cases } = await db.from('clinical_case_versions').select('id, title, specialty');
      const { data: badges } = await db.from('clinical_user_badges').select('awarded_at, clinical_badge_definitions(*)').eq('user_id', userId);
      return json({ attempts: (attempts ?? []).map(a => ({ ...a, title: cases?.find(c => c.id === a.case_version_id)?.title, specialty: cases?.find(c => c.id === a.case_version_id)?.specialty })), badges: badges ?? [] });
    }

    if (body.action === 'start') {
      const { data: caseData, error } = await db.from('clinical_case_versions').select('*').eq('case_key', body.caseKey ?? '').order('version', { ascending: false }).limit(1).single();
      if (error) return json({ error: 'Case not found. Reload the case library.' }, 404);
      const encounter = caseData.encounter as Encounter;
      const deadline = body.mode === 'challenge' && encounter.emergencySeconds ? new Date(Date.now() + encounter.emergencySeconds * 1000).toISOString() : null;
      const { data: attempt, error: startError } = await db.from('clinical_attempts').insert({ user_id: userId, case_version_id: caseData.id, mode: body.mode ?? 'learning', decisions: emptyDecisions(), deadline_at: deadline }).select('*').single();
      if (startError) throw startError;
      return json({ attempt, encounter: { ...encounter, findings: encounter.findings.map(({ answer: _answer, ...f }) => f) }, title: caseData.title, specialty: caseData.specialty, reviewStatus: caseData.review_status });
    }

    if (!body.attemptId) return json({ error: 'An attempt is required.' }, 400);
    const { data: attempt, error: attemptError } = await db.from('clinical_attempts').select('*').eq('id', body.attemptId).eq('user_id', userId).single();
    if (attemptError) return json({ error: 'Attempt not found.' }, 404);
    const { data: caseData, error: caseError } = await db.from('clinical_case_versions').select('*').eq('id', attempt.case_version_id).single();
    if (caseError) throw caseError;
    const encounter = caseData.encounter as Encounter;
    const events = attempt.events as { id: string; kind: string; at: string }[];
    const exposed = { ...encounter, findings: encounter.findings.map(f => ({ ...f, answer: events.some(e => e.id === f.id && e.kind === 'finding') ? f.answer : undefined })) };
    const expired = !!attempt.deadline_at && Date.now() >= new Date(attempt.deadline_at).getTime();
    if (body.action === 'load') return json({ attempt, encounter: exposed, title: caseData.title, specialty: caseData.specialty, reviewStatus: caseData.review_status, expired });
    if (attempt.status === 'completed') return body.action === 'submit' ? json({ result: attempt.result }) : json({ error: 'This attempt is complete.' }, 409);
    if (body.action === 'check') return json(checkSafety(body.decisions?.orders ?? [], encounter.currentMedications, encounter.allergies));
    if (body.action === 'event') {
      if (expired) return json({ error: 'The challenge deadline has passed. Submit the recorded decisions for feedback.' }, 409);
      const id = body.eventId;
      const kind = body.eventKind;
      const valid = kind === 'finding' ? encounter.findings.some(f => f.id === id) : kind === 'action' ? encounter.actions.some(a => a.id === id) : kind === 'procedure' ? encounter.procedures.some(p => p.id === id) : false;
      if (!id || !kind || !valid) return json({ error: 'Unknown clinical action.' }, 400);
      if (events.some(e => e.id === id && e.kind === kind)) return json({ attempt, answer: encounter.findings.find(f => f.id === id)?.answer });
      const nextEvents = [...events, { id, kind, at: new Date().toISOString() }];
      const { data: updated, error } = await db.from('clinical_attempts').update({ events: nextEvents, revision: attempt.revision + 1 }).eq('id', attempt.id).eq('revision', attempt.revision).eq('status', 'in_progress').select('*').maybeSingle();
      if (error) throw error;
      if (!updated) return json({ error: 'Attempt changed. Reload and try again.' }, 409);
      return json({ attempt: updated, answer: encounter.findings.find(f => f.id === id)?.answer, rationale: encounter.procedures.find(p => p.id === id)?.rationale });
    }
    if (!body.decisions) return json({ error: 'Decisions are required.' }, 400);
    if (body.action === 'save') {
      if (expired) return json({ error: 'The challenge deadline has passed.' }, 409);
      const { data, error } = await db.from('clinical_attempts').update({ decisions: body.decisions, revision: attempt.revision + 1 }).eq('id', attempt.id).eq('revision', body.revision ?? -1).eq('status', 'in_progress').select('*').maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: 'Attempt changed. Reload and try again.' }, 409);
      return json({ attempt: data });
    }
    if (body.action === 'submit') {
      if (!body.submissionKey) return json({ error: 'Submission identity is required.' }, 400);
      // Clinical action credit comes exclusively from recorded, timely server events.
      const decisions = expired ? decisionsSchema.parse(attempt.decisions) : body.decisions;
      decisions.actions = events.filter(e => ['action', 'finding'].includes(e.kind)).map(e => e.id);
      decisions.procedures = events.filter(e => e.kind === 'procedure').map(e => e.id);
      const result = evaluateAttempt(encounter, caseData.private_rules as ClinicalRules, decisions, attempt.mode, caseData.review_status === 'clinically_reviewed', expired);
      const { data, error } = await db.rpc('complete_clinical_attempt', { p_attempt_id: attempt.id, p_user_id: userId, p_revision: body.revision ?? -1, p_decisions: decisions, p_result: result, p_submission_key: body.submissionKey, p_badge_ids: result.badgeIds });
      if (error) return json({ error: 'Attempt changed or could not be completed. Reload before retrying.' }, 409);
      return json({ result: data });
    }
    return json({ error: 'Unsupported action.' }, 400);
  } catch (error) {
    console.error('Clinical simulation failed:', error instanceof Error ? error.message : 'service error');
    return json({ error: 'The clinical service could not complete this request. Please try again.' }, 500);
  }
});