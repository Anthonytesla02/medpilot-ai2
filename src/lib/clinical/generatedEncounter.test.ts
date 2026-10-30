import { describe, it, expect } from 'vitest';
import { GeneratedCasesSchema } from '../../../supabase/functions/_shared/generatedEncounter';

const caseData = {
  title: 'A new presentation', specialty: 'General medicine', diagnosis: 'Diarrhoea', diagnosisAliases: ['diarrhoea'],
  characters: [{ id: 'patient', name: 'Ama', age: 25, avatar: 'woman', role: 'Patient', primary: true }],
  complaint: 'Loose stools', narrative: 'Loose stools with no dehydration.', symptoms: ['Loose stools'], history: [{ label: 'Duration', answer: 'One day' }], currentMedications: [], allergies: [], vitals: {},
  findings: [{ id: 'history', label: 'Ask duration', kind: 'history', answer: 'One day' }, { id: 'exam', label: 'Assess hydration', kind: 'examination', answer: 'No dehydration' }],
  actions: [{ id: 'fluids', label: 'Encourage fluids' }, { id: 'followup', label: 'Arrange follow-up' }], difficulty: 'easy', explanation: 'No dehydration is established.', treatmentQuotes: ['Give more fluids.'],
};
describe('fresh structured cases', () => {
  it('accepts one case and converts generated structured history to displayable text', () => {
    const result = GeneratedCasesSchema.parse({ cases: [caseData] });
    expect(result.cases).toHaveLength(1);
    expect(result.cases[0].history).toEqual(['Duration: One day']);
  });
  it('rejects generating more than one case at a time', () => {
    expect(GeneratedCasesSchema.safeParse({ cases: [caseData, caseData] }).success).toBe(false);
  });
});