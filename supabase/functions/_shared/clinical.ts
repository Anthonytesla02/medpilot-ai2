export interface Character { id: string; name: string; age: number; avatar: string; role: string; primary: boolean }
export interface Finding { id: string; label: string; kind: 'history' | 'examination' | 'investigation'; answer: string }
export interface Order { id: string; ingredient: string; dose: string; route: string; frequency: string; duration: string; status: 'prescribed' | 'administered'; acknowledged: boolean }
export interface Decisions { diagnosis: string; differentials: string; orders: Order[]; actions: string[]; procedures: string[] }
export interface Requirement { id: string; label: string; dimension: string; points: number; essential?: boolean; type: 'diagnosis' | 'action' | 'procedure' | 'medication'; aliases?: string[]; ingredient?: string; dose?: string; route?: string; frequency?: string; duration?: string }
export type ChallengeCategory = 'trauma' | 'medical_emergency' | 'medication_emergency';
export type BodyRegion = 'head' | 'throat' | 'chest' | 'abdomen' | 'arm' | 'forearm' | 'hand' | 'leg';
export interface ClinicalScene { category: ChallengeCategory; focus: 'wound' | 'breathing' | 'medication'; bodyRegion?: BodyRegion; injury?: 'cut' | 'burn' | 'rash' | 'none' }
export interface ClinicalEvent { id: string; kind: string; at: string; targetRegion?: string; supplyId?: string; targetCorrect?: boolean; supplyCorrect?: boolean }
export interface ClinicalRules { version: string; requirements: Requirement[]; stgReference?: import('./stgReference.ts').STGReference; procedureOrder?: string[]; procedureTargets?: Record<string, string>; procedureSupplies?: Record<string, string>; criticalProcedures?: string[]; outcome: { success: string; incomplete: string; unsafe: string }; timeline: { label: string; complete: string; incomplete: string }[]; explanation: string }
export interface Encounter { characters: Character[]; complaint: string; narrative: string; symptoms: string[]; history: string[]; currentMedications: string[]; allergies: string[]; vitals: Record<string, string>; findings: Finding[]; actions: { id: string; label: string }[]; procedures: { id: string; label: string; rationale: string }[]; scene?: ClinicalScene; emergencySeconds?: number; difficulty: string; sources: { name: string; url: string }[] }
export interface ClinicalTemplate { key: string; title: string; specialty: string; encounter: Encounter; rules: ClinicalRules }
export const emptyDecisions = (): Decisions => ({ diagnosis: '', differentials: '', orders: [], actions: [], procedures: [] });
export const normalize = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[–—-]/g, ' ').replace(/[^a-z0-9 .]/g, '').replace(/\s+/g, ' ').trim();
export function performanceBand(score: number) { return score < 50 ? 'poor' : score < 80 ? 'partial' : 'strong'; }

export const clinicalTemplates: ClinicalTemplate[] = [
  {
    key: 'medication-review', title: 'A new prescription', specialty: 'Medication safety',
    encounter: {
      characters: [{ id: 'patient', name: 'Kwame Mensah', age: 45, avatar: 'man', role: 'Patient', primary: true }],
      complaint: 'A new antibiotic prescription and muscle discomfort', narrative: 'Kwame presents with a newly issued clarithromycin prescription. He takes simvastatin every evening and asks whether he can take both. He reports mild muscle discomfort, with no established diagnosis of muscle injury.',
      symptoms: ['Mild muscle discomfort', 'New prescription query'], history: ['Dyslipidaemia'], currentMedications: ['simvastatin'], allergies: [],
      scene: { category: 'medication_emergency', focus: 'medication' },
      vitals: { 'Pulse': '78 /min', 'BP': '126/78 mmHg', 'Temperature': '36.8 °C' },
      findings: [
        { id: 'medication-history', label: 'Review current medicines', kind: 'history', answer: 'Simvastatin nightly. Clarithromycin has been prescribed but has not yet been started. No other medicines are reported.' },
        { id: 'muscle-history', label: 'Ask about muscle symptoms', kind: 'history', answer: 'Mild muscle discomfort. No dark urine, weakness or collapse is reported. These findings alone do not establish rhabdomyolysis.' },
        { id: 'clinical-review', label: 'Review need for further assessment', kind: 'investigation', answer: 'Assess the muscle symptoms and arrange appropriate clinical review. No CK or renal results have been obtained in this encounter.' },
      ],
      actions: [{ id: 'contact-prescriber', label: 'Contact prescriber to resolve the interaction' }, { id: 'avoid-concurrent', label: 'Avoid concurrent clarithromycin and simvastatin' }, { id: 'counsel-muscle', label: 'Counsel on muscle symptoms and dark urine' }, { id: 'assess-symptoms', label: 'Arrange clinical assessment of muscle symptoms' }], procedures: [], difficulty: 'medium',
      sources: [{ name: 'NHS SPS — macrolides and statins', url: 'https://sps.nhs.uk/articles/managing-interactions-between-macrolides-and-statins/' }],
    },
    rules: {
      version: '2026-10-24-draft-1', requirements: [
        { id: 'diagnosis', label: 'Recognize the clarithromycin–simvastatin interaction', type: 'diagnosis', dimension: 'Diagnosis', points: 20, aliases: ['drug interaction', 'clarithromycin simvastatin interaction', 'medication interaction', 'statin interaction', 'myopathy risk'] },
        { id: 'medication-history', label: 'Review the current medicines', type: 'action', dimension: 'Investigation', points: 15 },
        { id: 'avoid-concurrent', label: 'Avoid concurrent clarithromycin and simvastatin', type: 'action', dimension: 'Safety', points: 30, essential: true },
        { id: 'contact-prescriber', label: 'Resolve the prescription with the prescriber', type: 'action', dimension: 'Treatment', points: 20, essential: true },
        { id: 'counsel-muscle', label: 'Counsel about muscle-related warning signs', type: 'action', dimension: 'Follow-up', points: 10 },
        { id: 'assess-symptoms', label: 'Arrange symptom assessment', type: 'action', dimension: 'Follow-up', points: 5 },
      ], outcome: { success: 'Interaction addressed; further symptom assessment required', incomplete: 'Medication safety issue remains unresolved', unsafe: 'Contraindicated concurrent administration recorded; clinical review required' },
      timeline: [{ label: 'Prescription review', complete: 'The concurrent-use risk has been identified and referred for resolution.', incomplete: 'The prescription has not been fully reconciled.' }, { label: 'Before the first dose', complete: 'The plan avoids concurrent exposure. Muscle symptoms still need assessment.', incomplete: 'Further prescriber review is required before concurrent use.' }, { label: 'Follow-up', complete: 'No adverse event is asserted. Follow-up depends on symptom assessment and the resolved prescription.', incomplete: 'Insufficient evidence to determine a clinical outcome; the unresolved risk needs attention.' }],
      explanation: 'NHS SPS states that clarithromycin is contraindicated with simvastatin. If clarithromycin is essential, simvastatin must be stopped during the course under clinical supervision. Muscle symptoms require assessment, not an assumed adverse-event diagnosis.',
    },
  },
  {
    key: 'superficial-wound', title: 'A cut at work', specialty: 'Injury care',
    encounter: {
      characters: [{ id: 'patient', name: 'Akosua Owusu', age: 32, avatar: 'woman', role: 'Patient', primary: true }],
      complaint: 'A small superficial forearm cut', narrative: 'Akosua has a small superficial cut on her forearm from a clean edge at work. There is mild bleeding, normal movement and sensation, and no obvious embedded object. She asks for help with initial care.',
      symptoms: ['Mild bleeding', 'Local discomfort'], history: ['No relevant medical history reported'], currentMedications: [], allergies: ['ibuprofen'],
      scene: { category: 'trauma', focus: 'wound', bodyRegion: 'forearm', injury: 'cut' },
      vitals: { 'Pulse': '76 /min', 'BP': '118/74 mmHg', 'Temperature': '36.7 °C' },
      findings: [{ id: 'wound-assessment', label: 'Assess depth, movement and sensation', kind: 'examination', answer: 'Small superficial cut. Movement and sensation are intact. No embedded object is seen; bleeding is mild.' }, { id: 'tetanus-history', label: 'Ask about immunisation and contamination', kind: 'history', answer: 'She cannot recall her last tetanus vaccination. Immunisation needs clinical assessment according to local guidance.' }],
      actions: [{ id: 'aftercare', label: 'Give dressing and wound aftercare advice' }, { id: 'red-flags', label: 'Explain infection and uncontrolled-bleeding red flags' }, { id: 'immunisation-review', label: 'Arrange immunisation review if indicated' }],
      procedures: [
        { id: 'assess-wound', label: 'Assess wound and red flags', rationale: 'Identify depth, embedded objects, bleeding, sensation and movement before choosing care.' },
        { id: 'clean-hands', label: 'Clean hands and prepare clean supplies', rationale: 'Wash hands before handling the wound and dressing.' },
        { id: 'pressure', label: 'Apply gentle pressure with a clean cloth', rationale: 'For this cut, no embedded object is present; pressure can help control bleeding.' },
        { id: 'rinse', label: 'Rinse with clean tap or bottled water', rationale: 'The NHS advises rinsing a small wound with water; alcohol is not the default wound cleaner.' },
        { id: 'dress', label: 'Cover with a clean dressing', rationale: 'Cover the cleaned wound with a plaster or sterile dressing.' },
        { id: 'alcohol-wound', label: 'Pour alcohol into the open wound', rationale: 'Not supported by this initial-care protocol. Use the source-supported cleaning approach.' },
        { id: 'remove-embedded', label: 'Remove an embedded object', rationale: 'Do not remove an embedded object yourself. If present, it requires appropriate assessment.' },
      ], difficulty: 'easy', sources: [{ name: 'NHS — cuts and grazes', url: 'https://www.nhs.uk/conditions/cuts-and-grazes/' }],
    },
    rules: { version: '2026-10-24-draft-1', requirements: [
      { id: 'diagnosis', label: 'Recognize a superficial cut', type: 'diagnosis', dimension: 'Diagnosis', points: 20, aliases: ['superficial cut', 'superficial wound', 'minor cut', 'minor laceration', 'laceration', 'cut'] },
      ...['assess-wound', 'clean-hands', 'pressure', 'rinse', 'dress'].map(id => ({ id, label: ({ 'assess-wound': 'Assess the wound', 'clean-hands': 'Clean hands', pressure: 'Control mild bleeding', rinse: 'Rinse with water', dress: 'Cover with a clean dressing' } as Record<string, string>)[id], type: 'procedure' as const, dimension: 'Procedure', points: 10, essential: true })),
      { id: 'aftercare', label: 'Provide aftercare', type: 'action', dimension: 'Follow-up', points: 15, essential: true }, { id: 'red-flags', label: 'Explain red flags', type: 'action', dimension: 'Safety', points: 15 },
    ], procedureOrder: ['assess-wound', 'clean-hands', 'pressure', 'rinse', 'dress'],
      procedureTargets: { pressure: 'forearm', rinse: 'forearm', dress: 'forearm', 'alcohol-wound': 'forearm', 'remove-embedded': 'forearm' },
      procedureSupplies: { pressure: 'clean-cloth', rinse: 'clean-water', dress: 'sterile-dressing', 'alcohol-wound': 'alcohol' },
      criticalProcedures: ['alcohol-wound', 'remove-embedded'],
      outcome: { success: 'Appropriate initial wound care documented', incomplete: 'Initial wound care incomplete', unsafe: 'Unsupported procedural action recorded; reassess care' },
      timeline: [{ label: 'Initial care', complete: 'Assessment, bleeding control, rinsing and dressing have been documented.', incomplete: 'One or more initial-care steps are missing.' }, { label: 'Aftercare', complete: 'The wound is covered and aftercare is arranged.', incomplete: 'Further care is required to complete the plan.' }, { label: 'Following days', complete: 'Healing requires observation. Infection or full recovery is not predicted by this draft model.', incomplete: 'There is insufficient evidence to predict healing or infection. Review the omitted actions.' }],
      explanation: 'For a small cut, stop bleeding, clean with water, and cover with a plaster or dressing. Do not remove embedded objects. Uncontrolled bleeding, serious injuries or infection concerns require medical help. Immunisation decisions require local guidance.',
    },
  },
  {
    key: 'child-diarrhoea', title: 'A mother and her child', specialty: 'Paediatrics',
    encounter: {
      characters: [{ id: 'child', name: 'Ama Boateng', age: 4, avatar: 'girl', role: 'Patient', primary: true }, { id: 'mother', name: 'Abena Boateng', age: 32, avatar: 'woman', role: 'Mother', primary: false }],
      complaint: 'Loose stools for one day', narrative: 'Abena brings her four-year-old daughter Ama with watery stools for one day. Ama is alert and drinking, with no blood in the stool or green vomit reported. The clinical history and observations belong to Ama, not her mother.',
      symptoms: ['Watery stools', 'One day duration'], history: ['No relevant history reported'], currentMedications: [], allergies: [],
      vitals: { 'Alertness': 'Alert', 'Oral intake': 'Drinking', 'Temperature': '37.2 °C', 'Urine': 'Passing urine' },
      findings: [{ id: 'hydration', label: 'Assess hydration and oral intake', kind: 'examination', answer: 'Alert, drinking, no reported reduction in urine, and no clinical dehydration established in this fictional presentation.' }, { id: 'red-flag-history', label: 'Ask about blood, green vomit and severe pain', kind: 'history', answer: 'No blood or mucus, green vomit or severe/localised abdominal pain reported. Reassessment is needed if new signs occur.' }, { id: 'feeding-history', label: 'Review feeding and fluids', kind: 'history', answer: 'Ama continues her usual feeds. Her mother asks about fruit juice and fizzy drinks.' }],
      actions: [{ id: 'continue-feeds', label: 'Continue usual feeds and encourage fluids' }, { id: 'avoid-juice', label: 'Avoid fruit juice and carbonated drinks' }, { id: 'reassess-hydration', label: 'Arrange hydration reassessment and safety net' }, { id: 'escalate-red-flags', label: 'Explain when urgent medical assessment is needed' }], procedures: [], difficulty: 'easy',
      sources: [{ name: 'NICE CG84 — under-five gastroenteritis', url: 'https://www.nice.org.uk/guidance/cg84/chapter/recommendations' }],
    },
    rules: { version: '2026-10-24-draft-1', requirements: [
      { id: 'diagnosis', label: 'Identify acute diarrhoea / suspected gastroenteritis', type: 'diagnosis', dimension: 'Diagnosis', points: 20, aliases: ['acute diarrhoea', 'acute diarrhea', 'gastroenteritis', 'suspected gastroenteritis', 'diarrhoea', 'diarrhea'] },
      { id: 'hydration', label: 'Assess hydration', type: 'action', dimension: 'Investigation', points: 20, essential: true },
      { id: 'continue-feeds', label: 'Continue feeds and encourage fluids', type: 'action', dimension: 'Treatment', points: 25, essential: true },
      { id: 'avoid-juice', label: 'Avoid fruit juice and fizzy drinks', type: 'action', dimension: 'Treatment', points: 10 },
      { id: 'reassess-hydration', label: 'Arrange hydration reassessment', type: 'action', dimension: 'Follow-up', points: 15, essential: true },
      { id: 'escalate-red-flags', label: 'Explain urgent-assessment signs', type: 'action', dimension: 'Safety', points: 10 },
    ], outcome: { success: 'Supportive care and reassessment arranged', incomplete: 'Supportive care plan incomplete', unsafe: 'Medication safety concern; clinical assessment required' },
      timeline: [{ label: 'Initial assessment', complete: 'Hydration and oral intake have been assessed.', incomplete: 'Hydration assessment or support is missing.' }, { label: 'At home', complete: 'Ongoing feeds, fluids and safety-netting are documented.', incomplete: 'The family needs a complete fluids, feeding and reassessment plan.' }, { label: 'Reassessment', complete: 'The child needs continued observation. Recovery and dehydration are not automatically inferred.', incomplete: 'No definitive outcome can be predicted; reassess hydration and missing support.' }],
      explanation: 'NICE advises continued feeds, fluids and avoiding fruit juice and carbonated drinks. Clinical dehydration requires a separate reviewed ORS regimen and assessment. Blood or mucus, green vomit, altered consciousness, severe pain and other red flags require assessment. No antibiotic or antidiarrhoeal dosing is validated by this case.',
    },
  },
  {
    key: 'anaphylaxis', title: 'Sudden breathing difficulty', specialty: 'Emergency care',
    encounter: {
      characters: [{ id: 'patient', name: 'Efua Asante', age: 32, avatar: 'woman', role: 'Patient', primary: true }],
      complaint: 'Sudden wheeze, swelling and faintness', narrative: 'Efua develops sudden lip swelling, wheeze and faintness after a new exposure. There are airway, breathing and circulation concerns. This timed educational scenario assesses recognition and escalation, not independent prescribing competence.',
      symptoms: ['Lip swelling', 'Wheeze', 'Faintness'], history: ['New exposure shortly before symptoms'], currentMedications: [], allergies: ['Suspected new allergy — trigger not yet established'],
      scene: { category: 'medical_emergency', focus: 'breathing', bodyRegion: 'chest', injury: 'none' },
      vitals: { 'Pulse': '118 /min', 'BP': '88/56 mmHg', 'SpO₂': '91%', 'Respiration': '28 /min' },
      findings: [{ id: 'abc-assessment', label: 'Assess airway, breathing and circulation', kind: 'examination', answer: 'Airway swelling, wheeze and hypotension with rapid onset indicate an urgent systemic reaction. Skin signs need not always be present.' }, { id: 'exposure', label: 'Ask about the exposure', kind: 'history', answer: 'Symptoms started shortly after a new food exposure. Identifying the precise allergen must not delay urgent care.' }],
      actions: [{ id: 'call-help', label: 'Call emergency help immediately' }, { id: 'im-adrenaline', label: 'Prioritise IM adrenaline using the reviewed local protocol' }, { id: 'reassess-abc', label: 'Reassess ABC and escalate persistent compromise' }, { id: 'allergy-followup', label: 'Arrange allergy assessment and emergency-plan advice' }], procedures: [], emergencySeconds: 180, difficulty: 'hard',
      sources: [{ name: 'Resuscitation Council UK — anaphylaxis', url: 'https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis/emergency-treatment-anaphylactic-reactions' }],
    },
    rules: { version: '2026-10-24-draft-1', requirements: [
      { id: 'diagnosis', label: 'Recognize suspected anaphylaxis', type: 'diagnosis', dimension: 'Diagnosis', points: 20, aliases: ['anaphylaxis', 'anaphylactic reaction', 'suspected anaphylaxis', 'anaphylactic shock'] },
      { id: 'abc-assessment', label: 'Assess airway, breathing and circulation', type: 'action', dimension: 'Emergency', points: 20, essential: true },
      { id: 'call-help', label: 'Call emergency help', type: 'action', dimension: 'Emergency', points: 20, essential: true },
      { id: 'im-adrenaline', label: 'Prioritise IM adrenaline per local protocol', type: 'action', dimension: 'Treatment', points: 25, essential: true },
      { id: 'reassess-abc', label: 'Reassess and escalate', type: 'action', dimension: 'Follow-up', points: 10, essential: true },
      { id: 'allergy-followup', label: 'Arrange allergy follow-up', type: 'action', dimension: 'Follow-up', points: 5 },
    ], outcome: { success: 'Emergency priorities documented; urgent professional care required', incomplete: 'Emergency management priorities incomplete', unsafe: 'Urgent clinical reassessment required' },
      timeline: [{ label: 'Recognition', complete: 'Airway, breathing and circulation assessment and help are documented.', incomplete: 'Required emergency priorities are incomplete.' }, { label: 'Urgent intervention', complete: 'IM adrenaline has been prioritised using a local protocol. This draft does not validate a dose or assert administration.', incomplete: 'Missing essential interventions require urgent escalation.' }, { label: 'Ongoing care', complete: 'Reassessment and escalation remain necessary; vital-sign recovery is not predicted.', incomplete: 'Insufficient evidence to simulate a definitive outcome. Review the omitted emergency priorities.' }],
      explanation: 'RCUK recommends rapid ABCDE assessment, calling for help and early IM adrenaline for airway, breathing or circulation problems. Persistent problems require reassessment and expert escalation. The 180-second challenge is a learning setting, not a recommended clinical waiting period. Doses and actual response require reviewed case-specific rules.',
    },
  },
];