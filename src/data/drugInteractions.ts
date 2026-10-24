/** Sourced educational summaries, not a comprehensive or clinician-reviewed database. */
export interface DrugInteractionReference {
  id: string;
  ingredients: readonly [string, string];
  category: 'contraindicated' | 'avoid' | 'monitor';
  risk: string;
  precaution: string;
  scope: string;
  sourceName: string;
  sourceUrl: string;
  retrievedOn: string;
  reviewStatus: 'sourced_needs_clinical_review';
}

const retrievedOn = '2026-10-24';
const reviewStatus = 'sourced_needs_clinical_review' as const;

export const drugInteractionReferences: readonly DrugInteractionReference[] = [
  {
    id: 'warfarin-ibuprofen', ingredients: ['warfarin', 'ibuprofen'], category: 'monitor',
    risk: 'Combined use increases the risk of serious gastrointestinal bleeding compared with either medicine alone.',
    precaution: 'Use requires clinical assessment and observation for bleeding; the label does not classify every use as absolutely contraindicated.',
    scope: 'Ibuprofen tablets used with warfarin; patient-specific risk and coexisting conditions require separate assessment.',
    sourceName: 'DailyMed — ibuprofen tablets prescribing information',
    sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=07506e83-e681-4225-8c65-3e8d21d69064',
    retrievedOn, reviewStatus,
  },
  {
    id: 'codeine-diazepam', ingredients: ['codeine', 'diazepam'], category: 'avoid',
    risk: 'Opioids with benzodiazepines can cause profound sedation and respiratory depression, including life-threatening events.',
    precaution: 'Reserve concurrent prescribing for situations where alternatives are inadequate; use the minimum appropriate dose and duration and monitor sedation and breathing.',
    scope: 'Source is an acetaminophen/codeine combination product label describing concomitant benzodiazepines, including diazepam. This is not a prediction that an adverse event will occur.',
    sourceName: 'DailyMed — acetaminophen and codeine phosphate tablets prescribing information',
    sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=1fe39679-fd58-4d2c-ba61-49d492a2b087&type=display',
    retrievedOn, reviewStatus,
  },
  {
    id: 'lisinopril-spironolactone', ingredients: ['lisinopril', 'spironolactone'], category: 'monitor',
    risk: 'Combining an ACE inhibitor with spironolactone increases the risk of hyperkalemia.',
    precaution: 'Monitor serum potassium within one week of starting spironolactone and regularly thereafter; assess renal function and additional patient risks.',
    scope: 'Spironolactone label identifies ACE inhibitors as potassium-increasing agents. Lisinopril is an ACE inhibitor. This is not an absolute ban on the combination.',
    sourceName: 'DailyMed — spironolactone tablets prescribing information',
    sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=200b2a6a-f263-463e-a2e1-f4f74058a924',
    retrievedOn, reviewStatus,
  },
  {
    id: 'clarithromycin-simvastatin', ingredients: ['clarithromycin', 'simvastatin'], category: 'contraindicated',
    risk: 'Clarithromycin raises simvastatin exposure and increases the risk of myopathy and rhabdomyolysis.',
    precaution: 'Do not coadminister. If clarithromycin is essential, the guidance states that simvastatin must be stopped during its course under clinical supervision.',
    scope: 'Specific to simvastatin; do not apply the same restriction to all statins.',
    sourceName: 'NHS Specialist Pharmacy Service — macrolides and statins',
    sourceUrl: 'https://sps.nhs.uk/articles/managing-interactions-between-macrolides-and-statins/',
    retrievedOn, reviewStatus,
  },
  {
    id: 'sildenafil-nitroglycerin', ingredients: ['sildenafil', 'nitroglycerin'], category: 'contraindicated',
    risk: 'Sildenafil potentiates the blood-pressure-lowering effects of organic nitrates and can cause dangerous hypotension.',
    precaution: 'Do not combine sildenafil with organic nitrates or nitrites. Switching and emergency decisions require the relevant product guidance and clinical assessment.',
    scope: 'Sildenafil citrate label contraindicates nitric oxide donors, including organic nitrates in any form; nitroglycerin is an organic nitrate.',
    sourceName: 'DailyMed — sildenafil citrate tablets prescribing information',
    sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=98a9897b-0cbc-4ea6-9ac2-4dd719a2ede0',
    retrievedOn, reviewStatus,
  },
  {
    id: 'methotrexate-trimethoprim', ingredients: ['methotrexate', 'trimethoprim'], category: 'avoid',
    risk: 'Concurrent use can increase the risk of severe bone-marrow suppression; the interaction can be delayed.',
    precaution: 'Avoid prescribing together. If unavoidable, specialist advice and frequent full blood count monitoring are required.',
    scope: 'NHS SPS guidance concerns low-dose methotrexate, less than 25 mg weekly; oncology regimens need separate specialist rules. This record does not validate methotrexate dosing.',
    sourceName: 'NHS Specialist Pharmacy Service — methotrexate interactions',
    sourceUrl: 'https://sps.nhs.uk/articles/managing-interactions-with-methotrexate/',
    retrievedOn, reviewStatus,
  },
  {
    id: 'fluoxetine-phenelzine', ingredients: ['fluoxetine', 'phenelzine'], category: 'contraindicated',
    risk: 'Fluoxetine with a psychiatric monoamine oxidase inhibitor can cause serotonin syndrome.',
    precaution: 'Do not coadminister. Fluoxetine labeling specifies at least 14 days after stopping a psychiatric MAOI before starting fluoxetine, and at least 5 weeks after stopping fluoxetine before starting a psychiatric MAOI.',
    scope: 'Phenelzine is a psychiatric MAOI. Switching history must be assessed separately; this pair record is not a full switching checker.',
    sourceName: 'DailyMed — fluoxetine capsules prescribing information',
    sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=53655048-40a3-45b2-9336-5616cfab68f0',
    retrievedOn, reviewStatus,
  },
  {
    id: 'warfarin-clarithromycin', ingredients: ['warfarin', 'clarithromycin'], category: 'monitor',
    risk: 'Clarithromycin may interact with warfarin and increase its anticoagulant effect and bleeding risk.',
    precaution: 'Maintain INR testing, reassess when additional medicines are started, and adjust management using clinical and INR findings rather than an automatic dose change.',
    scope: 'MHRA safety reminder identifies clarithromycin specifically; intercurrent illness can also affect anticoagulation.',
    sourceName: 'MHRA — warfarin and other blood thinners safe-use reminder',
    sourceUrl: 'https://www.gov.uk/government/news/warfarin-and-other-blood-thinners-reminder-on-safe-use-during-covid-19-pandemic',
    retrievedOn, reviewStatus,
  },
  {
    id: 'warfarin-ciprofloxacin', ingredients: ['warfarin', 'ciprofloxacin'], category: 'monitor',
    risk: 'Ciprofloxacin can enhance warfarin’s anticoagulant effect.',
    precaution: 'Monitor prothrombin time, INR, and signs of bleeding during concurrent treatment; do not infer a fixed dose adjustment.',
    scope: 'Ciprofloxacin tablets prescribing information; other antibiotics need their own evidence.',
    sourceName: 'DailyMed — ciprofloxacin tablets prescribing information',
    sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=2c39e226-68c0-b0e5-e063-6394a90adc07',
    retrievedOn, reviewStatus,
  },
  {
    id: 'warfarin-doxycycline', ingredients: ['warfarin', 'doxycycline'], category: 'monitor',
    risk: 'Doxycycline may interact with warfarin and increase its anticoagulant effect and bleeding risk.',
    precaution: 'Maintain INR testing and clinical assessment when starting or stopping additional medicines; do not apply a universal antibiotic dose-adjustment rule.',
    scope: 'MHRA reminder identifies doxycycline as an example, not all antibiotics as equivalent.',
    sourceName: 'MHRA — warfarin and other blood thinners safe-use reminder',
    sourceUrl: 'https://www.gov.uk/government/news/warfarin-and-other-blood-thinners-reminder-on-safe-use-during-covid-19-pandemic',
    retrievedOn, reviewStatus,
  },
];