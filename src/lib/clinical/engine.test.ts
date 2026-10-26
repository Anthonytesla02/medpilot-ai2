import { describe, it, expect } from 'vitest';
import { clinicalTemplates, emptyDecisions, performanceBand } from '../../../supabase/functions/_shared/clinical';
import { checkSafety, evaluateAttempt } from '../../../supabase/functions/_shared/evaluate';
describe('clinical simulation rules', () => {
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