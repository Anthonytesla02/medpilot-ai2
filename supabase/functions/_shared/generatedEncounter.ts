import { z } from 'npm:zod@3';
import type { ClinicalTemplate } from './clinical.ts';

const text = z.string().min(1).max(2000);
export const GeneratedCasesSchema = z.object({ cases: z.array(z.object({
  title: text, specialty: text, diagnosis: text, diagnosisAliases: z.array(text).min(1).max(8),
  characters: z.array(z.object({ id: text, name: text, age: z.number().int().min(0).max(110), avatar: z.enum(['man', 'woman', 'boy', 'girl', 'older-woman', 'mother-infant']), role: text, primary: z.boolean() })).min(1).max(3),
  complaint: text, narrative: text, symptoms: z.array(text).min(1).max(10), history: z.array(text).max(10), currentMedications: z.array(text).max(10), allergies: z.array(text).max(10),
  vitals: z.record(z.string().max(100)),
  findings: z.array(z.object({ id: text, label: text, kind: z.enum(['history', 'examination', 'investigation']), answer: text })).min(2).max(6),
  actions: z.array(z.object({ id: text, label: text })).min(2).max(6),
  difficulty: z.enum(['easy', 'medium', 'hard']), explanation: text,
})).length(4) }).superRefine(({ cases }, ctx) => {
  if (new Set(cases.map(c => c.title)).size !== 4) ctx.addIssue({ code: 'custom', message: 'Cases must have distinct titles.' });
  cases.forEach((c, index) => {
    if (c.characters.filter(p => p.primary).length !== 1) ctx.addIssue({ code: 'custom', path: ['cases', index], message: 'Exactly one primary patient required.' });
    const ids = [...c.findings, ...c.actions].map(item => item.id);
    if (new Set(ids).size !== ids.length || ids.includes('diagnosis')) ctx.addIssue({ code: 'custom', path: ['cases', index], message: 'Clinical event IDs must be unique.' });
  });
});

export function buildGeneratedTemplates(data: z.infer<typeof GeneratedCasesSchema>): ClinicalTemplate[] {
  return data.cases.map(({ diagnosis, diagnosisAliases, explanation, title, specialty, ...encounter }) => ({
    key: `ai-${crypto.randomUUID()}`, title, specialty,
    encounter: { ...encounter, procedures: [], sources: [] },
    rules: {
      version: 'ai-draft-v1',
      requirements: [
        { id: 'diagnosis', label: `AI draft working diagnosis: ${diagnosis}`, type: 'diagnosis', dimension: 'Diagnosis', points: 20, aliases: [diagnosis, ...diagnosisAliases] },
        ...encounter.findings.map(f => ({ id: f.id, label: f.label, type: 'action' as const, dimension: 'Investigation', points: 40 / encounter.findings.length })),
        ...encounter.actions.map(a => ({ id: a.id, label: a.label, type: 'action' as const, dimension: 'Treatment', points: 40 / encounter.actions.length, essential: true })),
      ],
      outcome: { success: 'Draft management steps documented; patient outcome is not modeled', incomplete: 'Draft management plan incomplete; patient outcome is not modeled', unsafe: 'Medication safety concern recorded; clinical review required' },
      timeline: [{ label: 'Recorded plan', complete: 'The draft management steps were recorded. Recovery or adverse events cannot be predicted.', incomplete: 'Review the omitted draft management steps. No deterioration or adverse event is inferred.' }],
      explanation: `Unverified AI-generated educational draft. ${explanation} Medication selection, doses and patient outcomes require qualified clinical review.`,
    },
  }));
}