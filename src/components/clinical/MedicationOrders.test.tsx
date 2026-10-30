import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { MedicationOrders } from './MedicationOrders';
import { emptyDecisions } from '../../../supabase/functions/_shared/clinical';
import { clinicalRequest } from '@/lib/clinical/api';
vi.mock('@/lib/clinical/api', () => ({ clinicalRequest: vi.fn() }));
function Workspace() {
  const [decisions, setDecisions] = useState(emptyDecisions());
  return <MedicationOrders attemptId="attempt" decisions={decisions} onChange={setDecisions} disabled={false} />;
}
describe('medication analysis timing', () => {
  it('adds arbitrary drugs without requests and sends the complete set only on Check', async () => {
    vi.mocked(clinicalRequest).mockResolvedValue({ alerts: [], unknownPairs: [], doseValidation: '', reviewStatus: 'sourced_needs_clinical_review', treatmentComparison: { score: 0, feedback: 'These orders do not match the case treatment.' } });
    render(<Workspace />);
    for (const ingredient of ['Learner entered drug', 'Another drug']) {
      fireEvent.change(screen.getByLabelText('Medication name'), { target: { value: ingredient } });
      fireEvent.click(screen.getByRole('button', { name: 'Add prescription' }));
    }
    expect(clinicalRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Check all medications' }));
    await waitFor(() => expect(clinicalRequest).toHaveBeenCalledTimes(1));
    const request = vi.mocked(clinicalRequest).mock.calls[0][0];
    expect(request).toMatchObject({ action: 'check', attemptId: 'attempt', decisions: { orders: [{ ingredient: 'Learner entered drug' }, { ingredient: 'Another drug' }] } });
  });
});