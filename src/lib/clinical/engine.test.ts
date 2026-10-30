import { describe, it, expect } from 'vitest';
import { clinicalTemplates, emptyDecisions, performanceBand } from '../../../supabase/functions/_shared/clinical';
import { checkSafety, evaluateAttempt } from '../../../supabase/functions/_shared/evaluate';
import { attachSTGTreatment } from '../../../supabase/functions/_shared/stgReference';
describe('clinical simulation rules', () => {
  const quote = 'Give oral rehydration solution.';
  const reference = { chunkId: 'test-source', chapter: 'Gastrointestinal disorders', section: 'Diarrhoea', page: 11, excerpt: quote };
  it('retains the same STG reference for correct and incorrect treatments', () => {
    const t = clinicalTemplates[0];
    const rules = { ...t.rules, version: 'ai-draft-v1', stgReference: attachSTGTreatment(reference, [quote]) };
    const correct = evaluateAttempt(t.encounter, rules, emptyDecisions(), 'learning', false, false, { score: 100, feedback: 'Matches reference' });
    const incorrect = evaluateAttempt(t.encounter, rules, emptyDecisions(), 'learning', false, false, { score: 0, feedback: 'Treatment omitted' });
    expect(correct.stgReference?.treatment).toEqual([quote]);
    expect(incorrect.stgReference).toEqual(correct.stgReference);
    expect(correct.score).toBeGreaterThan(incorrect.score);
  });
  it('does not score STG cases without an actual treatment comparison', () => {
    const t = clinicalTemplates[0];
    expect(() => evaluateAttempt(t.encounter, { ...t.rules, stgReference: attachSTGTreatment(reference, [quote]) }, emptyDecisions(), 'learning', false)).toThrow('STG comparison is required');
  });
  it('rejects treatment text absent from the stored source', () => {
    expect(() => attachSTGTreatment(reference, ['Invented medication dose'])).toThrow();
  });
  it('never authorizes competitive points or badges for newly generated AI drafts', () => {
    const t = clinicalTemplates[0]; const d = emptyDecisions(); d.diagnosis = 'drug interaction'; d.actions = t.rules.requirements.filter(r => r.type === 'action').map(r => r.id);
    const result = evaluateAttempt(t.encounter, { ...t.rules, version: 'ai-draft-v1' }, d, 'challenge', true);
    expect(result.score).toBe(100); expect(result.points).toBe(0); expect(result.badgeIds).toEqual([]); expect(result.eligible).toBe(false); expect(result.reviewStatus).toBe('ai_draft');
  });
  it('uses the specified below-50, 50-to-below-80 and 80-to-100 bands', () => {
    expect(performanceBand(49)).toBe('poor'); expect(performanceBand(50)).toBe('partial'); expect(performanceBand(79)).toBe('partial'); expect(performanceBand(80)).toBe('strong');
  });
  it('distinguishes complete and incomplete treatment from a correct diagnosis', () => {
    const t = clinicalTemplates[0]; const d = emptyDecisions(); d.diagnosis = 'drug interaction';
    const incomplete = evaluateAttempt(t.encounter, t.rules, d, 'learning', false);
    expect(incomplete.score).toBe(20); expect(incomplete.successfulManagement).toBe(false);
    d.actions = t.rules.requirements.filter(r => r.type === 'action').map(r => r.id);
    const complete = evaluateAttempt(t.encounter, t.rules, d, 'learning', false);
    expect(complete.score).toBe(100); expect(complete.successfulManagement).toBe(true);
    expect(complete.eligible).toBe(false); expect(complete.badgeIds).toEqual([]); expect(complete.points).toBe(0);
  });
  it('a high score cannot erase a contraindicated administration', () => {
    const t = clinicalTemplates[0]; const d = emptyDecisions(); d.diagnosis = 'drug interaction'; d.actions = t.rules.requirements.filter(r => r.type === 'action').map(r => r.id);
    d.orders = [{ id: '1', ingredient: 'clarithromycin', dose: '', route: '', frequency: '', duration: '', status: 'administered', acknowledged: true }];
    const result = evaluateAttempt(t.encounter, t.rules, d, 'challenge', false);
    expect(result.score).toBe(100); expect(result.successfulManagement).toBe(false); expect(result.criticalErrors).toHaveLength(1); expect(result.outcome).not.toMatch(/death|rhabdomyolysis occurred/);
  });
  it('checks existing medicines and new orders without equating prescriptions to administration', () => {
    const o = { id: '1', ingredient: 'sildenafil', dose: '', route: '', frequency: '', duration: '', status: 'prescribed' as const, acknowledged: false };
    const result = checkSafety([o], ['nitroglycerin'], []);
    expect(result.alerts[0].category).toBe('contraindicated'); expect(result.alerts[0].administered).toBe(false);
  });
  it('records allergy and duplicate ingredients, and flags unsupported pair coverage', () => {
    const o = { id: '1', ingredient: 'ibuprofen', dose: '', route: '', frequency: '', duration: '', status: 'administered' as const, acknowledged: true };
    const result = checkSafety([o], ['ibuprofen', 'amoxicillin'], ['ibuprofen']);
    expect(result.alerts.some(a => a.category === 'allergy' && a.administered)).toBe(true); expect(result.alerts.some(a => a.category === 'duplicate')).toBe(true); expect(result.unknownPairs).toContain('ibuprofen + amoxicillin');
  });
  it('keeps child and companion identities separate', () => {
    const t = clinicalTemplates.find(t => t.key === 'child-diarrhoea');
    expect(t?.encounter.characters).toHaveLength(2); expect(t?.encounter.characters.filter(c => c.primary).map(c => c.name)).toEqual(['Ama Boateng']);
  });
  it('a wrong diagnosis and no interventions does not fabricate deterioration', () => {
    const t = clinicalTemplates[0]; const d = emptyDecisions(); d.diagnosis = 'malaria';
    const result = evaluateAttempt(t.encounter, t.rules, d, 'learning', false);
    expect(result.score).toBe(0); expect(result.outcome).toBe('Medication safety issue remains unresolved');
  });
  it('rejects flawless procedural eligibility after unsafe or out-of-order care', () => {
    const t = clinicalTemplates[1]; const d = emptyDecisions(); d.procedures = ['dress', 'rinse', 'alcohol-wound'];
    const result = evaluateAttempt(t.encounter, t.rules, d, 'challenge', true);
    expect(result.criticalErrors.length).toBeGreaterThan(0); expect(result.badgeIds).toEqual([]);
  });
  it('uses case-specific emergency configuration and records incomplete expired challenges', () => {
    const t = clinicalTemplates[3]; const result = evaluateAttempt(t.encounter, t.rules, emptyDecisions(), 'challenge', false, true);
    expect(t.encounter.emergencySeconds).toBe(180); expect(result.expired).toBe(true); expect(result.criticalErrors).toContain('The learning challenge ended before essential emergency priorities were completed.');
  });
});