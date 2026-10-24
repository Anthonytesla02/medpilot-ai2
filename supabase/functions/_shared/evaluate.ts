import { drugInteractionReferences } from './drugInteractions.ts';
import { normalize, performanceBand, type Decisions, type Encounter, type ClinicalRules } from './clinical.ts';

export function checkSafety(orders: Decisions['orders'], existing: string[], allergies: string[]) {
  const alerts: { id: string; category: string; risk: string; precaution: string; sourceUrl?: string; administered: boolean }[] = [];
  const ingredients = [...existing.map(normalize), ...orders.map(o => normalize(o.ingredient))];
  const counts = new Map<string, number>();
  ingredients.forEach(i => counts.set(i, (counts.get(i) ?? 0) + 1));
  for (const [ingredient, count] of counts) if (count > 1) alerts.push({ id: `duplicate-${ingredient}`, category: 'duplicate', risk: `Repeated active ingredient: ${ingredient}. Check for duplicate therapy.`, precaution: 'Reconcile existing medicines and orders. Duplication is not automatically contraindicated.', administered: orders.some(o => normalize(o.ingredient) === ingredient && o.status === 'administered') });
  for (const order of orders) if (allergies.some(a => normalize(a) === normalize(order.ingredient))) alerts.push({ id: `allergy-${order.ingredient}`, category: 'allergy', risk: `Documented allergy to ${order.ingredient}.`, precaution: 'Do not proceed without clinical assessment of the allergy and an appropriate alternative.', administered: order.status === 'administered' });
  for (const ref of drugInteractionReferences) if (ref.ingredients.every(i => ingredients.includes(i))) {
    const newlyInvolved = orders.filter(o => ref.ingredients.includes(normalize(o.ingredient)));
    if (newlyInvolved.length) alerts.push({ id: ref.id, category: ref.category, risk: ref.risk, precaution: ref.precaution, sourceUrl: ref.sourceUrl, administered: newlyInvolved.some(o => o.status === 'administered') && ref.ingredients.every(i => existing.map(normalize).includes(i) || orders.some(o => normalize(o.ingredient) === i && o.status === 'administered')) });
  }
  const unknownPairs: string[] = [];
  const unique = [...new Set(ingredients)];
  for (let a = 0; a < unique.length; a++) for (let b = a + 1; b < unique.length; b++) {
    const pair = [unique[a], unique[b]];
    if (!orders.some(o => pair.includes(normalize(o.ingredient)))) continue;
    if (!drugInteractionReferences.some(r => r.ingredients.every(i => pair.includes(i)))) unknownPairs.push(pair.join(' + '));
  }
  return { alerts, unknownPairs, reviewStatus: 'sourced_needs_clinical_review', doseValidation: 'No complete dosing reference is available; unspecified doses and routes are not validated.' };
}

export function evaluateAttempt(encounter: Encounter, rules: ClinicalRules, decisions: Decisions, mode: string, reviewed: boolean, expired = false) {
  const safety = checkSafety(decisions.orders, encounter.currentMedications, encounter.allergies);
  const rows = rules.requirements.map(r => {
    let correct = false;
    if (r.type === 'diagnosis') correct = (r.aliases ?? []).some(a => normalize(a) === normalize(decisions.diagnosis));
    if (r.type === 'action') correct = decisions.actions.includes(r.id);
    if (r.type === 'procedure') correct = decisions.procedures.includes(r.id);
    if (r.type === 'medication') correct = decisions.orders.some(o => normalize(o.ingredient) === normalize(r.ingredient ?? '') && o.status === 'administered' && (!r.dose || normalize(o.dose) === normalize(r.dose)) && (!r.route || normalize(o.route) === normalize(r.route)) && (!r.frequency || normalize(o.frequency) === normalize(r.frequency)) && (!r.duration || normalize(o.duration) === normalize(r.duration)));
    return { id: r.id, label: r.label, dimension: r.dimension, possible: r.points, earned: correct ? r.points : 0, correct, essential: !!r.essential };
  });
  const criticalErrors = safety.alerts.filter(a => a.administered && (a.category === 'contraindicated' || a.category === 'allergy')).map(a => a.risk);
  for (const p of decisions.procedures) if (rules.criticalProcedures?.includes(p)) criticalErrors.push(encounter.procedures.find(x => x.id === p)?.rationale ?? 'Unsupported procedural action.');
  const expectedOrder = rules.procedureOrder ?? [];
  const observed = decisions.procedures.filter(p => expectedOrder.includes(p));
  const orderCorrect = observed.every((p, i) => i === 0 || expectedOrder.indexOf(p) > expectedOrder.indexOf(observed[i - 1]));
  if (!orderCorrect) criticalErrors.push('Procedural sequence requires reassessment; earlier steps were performed after later steps.');
  const essentialComplete = rows.filter(r => r.essential).every(r => r.correct);
  if (mode === 'challenge' && expired && encounter.emergencySeconds && !essentialComplete) criticalErrors.push('The learning challenge ended before essential emergency priorities were completed.');
  const total = rows.reduce((sum, r) => sum + r.possible, 0);
  const earned = rows.reduce((sum, r) => sum + r.earned, 0);
  // Draft reference flags do not manufacture penalties or adverse events.
  const score = total ? Math.round(earned / total * 100) : 0;
  const successfulManagement = essentialComplete && criticalErrors.length === 0;
  const outcome = criticalErrors.length ? rules.outcome.unsafe : successfulManagement ? rules.outcome.success : rules.outcome.incomplete;
  const dimensions = [...new Set(rows.map(r => r.dimension))].map(name => {
    const selected = rows.filter(r => r.dimension === name);
    const max = selected.reduce((s, r) => s + r.possible, 0);
    return { name, score: max ? Math.round(selected.reduce((s, r) => s + r.earned, 0) / max * 100) : 0 };
  });
  const eligible = reviewed && safety.unknownPairs.length === 0 && safety.alerts.every(a => a.category !== 'allergy' && a.category !== 'contraindicated') && decisions.orders.length === 0;
  const badgeIds = eligible && score === 100 && !criticalErrors.length ? ['flawless-case', ...(expectedOrder.length && orderCorrect ? ['precision-practitioner'] : []), ...(encounter.emergencySeconds && !expired ? ['emergency-response'] : [])] : [];
  return { score, band: performanceBand(score), dimensions, rows, criticalErrors, safety, outcome, successfulManagement, timeline: rules.timeline.map(t => ({ label: t.label, text: successfulManagement ? t.complete : t.incomplete })), explanation: rules.explanation, eligible, badgeIds, points: eligible && mode === 'challenge' ? score : 0, reviewStatus: reviewed ? 'clinically_reviewed' : 'sourced_needs_clinical_review', expired, rulesetVersion: rules.version, limitation: reviewed ? safety.doseValidation : 'Source-backed draft: provisional learning feedback only. Clinical outcomes, dosing, competitive scores and badges require qualified review.' };
}