import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Ghana Standard Treatment Guidelines - Key medical content chunks
const knowledgeChunks = [
  // Chapter 1: Gastrointestinal Disorders
  {
    chapter: "Chapter 1: Disorders of the Gastrointestinal Tract",
    section: "Diarrhoea",
    content: `DIARRHOEA - Definition: The passage of loose or watery stools, usually at least three times in a 24 hour period. However, it is the consistency of the stools rather than the frequency that is most important.

TYPES OF DIARRHOEA:
1. Acute watery diarrhoea (including cholera): Lasts several hours or days. Main danger is dehydration.
2. Acute bloody diarrhoea (dysentery): Main dangers are intestinal damage, sepsis and malnutrition.
3. Persistent diarrhoea: Lasts 14 days or longer. Main danger is malnutrition.

CAUSES: Viral (rotavirus most common in children), bacterial (E. coli, Salmonella, Shigella, Vibrio cholerae), parasitic (Giardia, Entamoeba).

ASSESSMENT OF DEHYDRATION:
- No dehydration: No signs, child is well and alert
- Some dehydration: Restless/irritable, sunken eyes, drinks eagerly, skin pinch goes back slowly
- Severe dehydration: Lethargic/unconscious, sunken eyes, unable to drink, skin pinch goes back very slowly (>2 seconds)

TREATMENT PLAN A (No dehydration):
- Give more fluids: ORS, food-based fluids, or clean water
- Continue feeding including breastfeeding
- Zinc supplementation: Children <6 months: 10mg daily for 10-14 days; Children ≥6 months: 20mg daily for 10-14 days

TREATMENT PLAN B (Some dehydration):
- Give ORS over 4 hours: Amount = Weight (kg) × 75ml
- Reassess after 4 hours and select appropriate plan

TREATMENT PLAN C (Severe dehydration):
- IV fluids: Ringer's Lactate or Normal Saline
- First give 30ml/kg in: 1 hour (infants <12 months) or 30 minutes (older children)
- Then give 70ml/kg in: 5 hours (infants) or 2.5 hours (older children)`,
    page_number: 11,
    metadata: { keywords: ["diarrhoea", "dehydration", "ORS", "zinc", "cholera", "dysentery"] }
  },
  {
    chapter: "Chapter 1: Disorders of the Gastrointestinal Tract",
    section: "Peptic Ulcer Disease",
    content: `PEPTIC ULCER DISEASE (PUD) - Definition: A break in the lining of the stomach (gastric ulcer) or duodenum (duodenal ulcer).

CAUSES:
1. Helicobacter pylori infection (most common)
2. NSAIDs use
3. Stress-related mucosal disease
4. Zollinger-Ellison syndrome (rare)

CLINICAL FEATURES:
- Epigastric pain (burning, gnawing)
- Pain related to meals: Gastric ulcer - pain worsened by food; Duodenal ulcer - pain relieved by food
- Nausea and vomiting
- Weight loss (gastric ulcer)
- Night pain (duodenal ulcer)
- Complications: bleeding, perforation, obstruction

DIAGNOSIS:
- Upper GI endoscopy (gold standard)
- H. pylori testing: Urea breath test, stool antigen test, serology

TREATMENT:
Triple Therapy for H. pylori eradication:
- Omeprazole 20mg twice daily for 14 days
- Amoxicillin 1g twice daily for 14 days
- Clarithromycin 500mg twice daily for 14 days

Alternative if penicillin allergic:
- Omeprazole 20mg twice daily
- Metronidazole 400mg twice daily
- Clarithromycin 500mg twice daily

Maintenance:
- Proton pump inhibitor for 4-8 weeks after eradication therapy
- Avoid NSAIDs, smoking, alcohol`,
    page_number: 22,
    metadata: { keywords: ["peptic ulcer", "H. pylori", "omeprazole", "stomach", "duodenum"] }
  },
  {
    chapter: "Chapter 1: Disorders of the Gastrointestinal Tract",
    section: "Constipation",
    content: `CONSTIPATION - Definition: Infrequent passage of stool (less than 3 times per week) or difficulty in passing stool.

CAUSES:
- Low fibre diet
- Inadequate fluid intake
- Lack of exercise
- Medications (opioids, anticholinergics, calcium channel blockers)
- Metabolic disorders (hypothyroidism, diabetes)
- Neurological conditions (Parkinson's disease, spinal cord injury)
- Mechanical obstruction (colorectal cancer, strictures)

CLINICAL FEATURES:
- Infrequent bowel movements
- Hard, dry stools
- Straining during defecation
- Sensation of incomplete evacuation
- Abdominal discomfort

TREATMENT:
Non-pharmacological:
- Increase dietary fibre (25-30g/day)
- Adequate fluid intake (1.5-2L/day)
- Regular exercise
- Establish regular bowel habits

Pharmacological:
1. Bulk-forming laxatives (first line):
   - Psyllium (Ispaghula husk): 1-2 sachets daily with plenty of water

2. Osmotic laxatives:
   - Lactulose: 15-30ml daily
   - Macrogol (Polyethylene glycol): 1-2 sachets daily

3. Stimulant laxatives (short-term use):
   - Bisacodyl: 5-10mg at bedtime
   - Senna: 2-4 tablets at bedtime

4. Stool softeners:
   - Docusate sodium: 100-200mg twice daily

REFERRAL:
- New onset constipation in adults >50 years
- Associated with rectal bleeding, weight loss, or anaemia
- Failure to respond to treatment`,
    page_number: 19,
    metadata: { keywords: ["constipation", "laxatives", "fibre", "lactulose", "bisacodyl"] }
  },
  // Chapter 4: Haematological Disorders
  {
    chapter: "Chapter 4: Haematological Disorders",
    section: "Anaemia",
    content: `ANAEMIA - Definition: Reduction in haemoglobin concentration below normal for age and sex.

WHO CRITERIA:
- Men: Hb <13g/dL
- Non-pregnant women: Hb <12g/dL
- Pregnant women: Hb <11g/dL
- Children 6-59 months: Hb <11g/dL
- Children 5-11 years: Hb <11.5g/dL
- Children 12-14 years: Hb <12g/dL

CLASSIFICATION BY SEVERITY:
- Mild: Hb 10-11g/dL
- Moderate: Hb 7-9.9g/dL
- Severe: Hb <7g/dL

CAUSES:
1. Decreased production: Iron deficiency, B12/folate deficiency, chronic disease, bone marrow failure
2. Increased destruction: Haemolysis, sickle cell disease, G6PD deficiency
3. Blood loss: Acute or chronic bleeding

CLINICAL FEATURES:
- Pallor (conjunctivae, palms, nail beds)
- Fatigue and weakness
- Dyspnoea on exertion
- Tachycardia
- Koilonychia (iron deficiency)
- Glossitis (B12/folate deficiency)

TREATMENT OF IRON DEFICIENCY ANAEMIA:
Adults:
- Ferrous sulphate 200mg (65mg elemental iron) 2-3 times daily
- Duration: 3-6 months (continue for 3 months after Hb normalizes)

Children:
- 3-6mg/kg/day of elemental iron in 2-3 divided doses

B12 Deficiency:
- Hydroxocobalamin 1mg IM: 3 times weekly for 2 weeks, then every 3 months

Folate Deficiency:
- Folic acid 5mg daily for 4 months

BLOOD TRANSFUSION:
Indications:
- Hb <5g/dL
- Hb 5-7g/dL with cardiac failure or severe symptoms
- Acute blood loss with haemodynamic instability`,
    page_number: 62,
    metadata: { keywords: ["anaemia", "iron", "haemoglobin", "ferrous sulphate", "blood transfusion"] }
  },
  {
    chapter: "Chapter 4: Haematological Disorders",
    section: "Sickle Cell Disease",
    content: `SICKLE CELL DISEASE (SCD) - Definition: A group of inherited red blood cell disorders characterized by abnormal haemoglobin (HbS) that causes red cells to become sickle-shaped.

TYPES:
- HbSS (Sickle cell anaemia) - most severe
- HbSC disease
- HbS/beta-thalassemia

CLINICAL FEATURES:
Chronic manifestations:
- Chronic haemolytic anaemia
- Jaundice
- Splenomegaly (early), splenic atrophy (later)
- Growth retardation
- Delayed puberty

Acute complications:
1. Vaso-occlusive crisis (painful crisis)
2. Acute chest syndrome
3. Splenic sequestration
4. Aplastic crisis
5. Stroke
6. Priapism
7. Infections (especially encapsulated organisms)

PREVENTION OF COMPLICATIONS:
- Folic acid 5mg daily
- Penicillin V prophylaxis: Children <5 years: 125mg twice daily; >5 years: 250mg twice daily
- Vaccination: Pneumococcal, Haemophilus influenzae, Meningococcal, Hepatitis B
- Hydroxyurea: For frequent crises or severe disease

MANAGEMENT OF PAINFUL CRISIS:
1. Hydration: Oral or IV fluids (3L/m²/day)
2. Analgesia:
   - Mild pain: Paracetamol +/- NSAIDs
   - Moderate pain: Weak opioids (tramadol, codeine)
   - Severe pain: Strong opioids (morphine)
3. Oxygen if SpO2 <95%
4. Treat precipitating factors (infection, dehydration)

BLOOD TRANSFUSION:
Indications:
- Severe anaemia (Hb <5g/dL)
- Acute chest syndrome
- Stroke
- Pre-operative
- Exchange transfusion for stroke, severe acute chest syndrome`,
    page_number: 69,
    metadata: { keywords: ["sickle cell", "HbSS", "vaso-occlusive", "hydroxyurea", "crisis"] }
  },
  // Chapter 7: Cardiovascular Disorders
  {
    chapter: "Chapter 7: Disorders of the Cardiovascular System",
    section: "Hypertension",
    content: `HYPERTENSION - Definition: Persistently elevated blood pressure.

CLASSIFICATION (Adults):
- Normal: <120/<80 mmHg
- Elevated: 120-129/<80 mmHg
- Stage 1 Hypertension: 130-139/80-89 mmHg
- Stage 2 Hypertension: ≥140/≥90 mmHg
- Hypertensive crisis: >180/>120 mmHg

CAUSES:
Primary (Essential) Hypertension: 90-95% of cases, no identifiable cause
Secondary Hypertension: 5-10% - Renal disease, endocrine disorders, medications

COMPLICATIONS:
- Stroke
- Coronary artery disease
- Heart failure
- Chronic kidney disease
- Retinopathy

NON-PHARMACOLOGICAL TREATMENT:
- Weight reduction (BMI 18.5-24.9 kg/m²)
- DASH diet (rich in fruits, vegetables, low-fat dairy)
- Sodium restriction (<2.3g/day, ideally <1.5g/day)
- Physical activity (30 min/day most days)
- Limit alcohol
- Smoking cessation

PHARMACOLOGICAL TREATMENT:
First-line agents:
1. ACE Inhibitors: Lisinopril 10-40mg daily, Enalapril 5-20mg twice daily
2. ARBs (if ACE-I intolerant): Losartan 50-100mg daily
3. Calcium Channel Blockers: Amlodipine 5-10mg daily, Nifedipine 30-60mg daily
4. Thiazide Diuretics: Hydrochlorothiazide 12.5-25mg daily, Bendroflumethiazide 2.5mg daily

SPECIAL POPULATIONS:
- Diabetes/CKD: ACE-I or ARB preferred
- Heart failure: ACE-I + Beta-blocker + Diuretic
- Pregnancy: Methyldopa, Labetalol, Nifedipine (avoid ACE-I, ARBs)
- Black patients: CCB or Thiazide preferred initially

TARGET BP:
- General: <140/90 mmHg
- Diabetes/CKD: <130/80 mmHg`,
    page_number: 146,
    metadata: { keywords: ["hypertension", "blood pressure", "ACE inhibitor", "amlodipine", "lisinopril"] }
  },
  {
    chapter: "Chapter 7: Disorders of the Cardiovascular System",
    section: "Heart Failure",
    content: `HEART FAILURE - Definition: A clinical syndrome resulting from structural or functional cardiac abnormality that impairs the ability of the heart to fill with or eject blood.

CLASSIFICATION:
1. By ejection fraction:
   - HFrEF: EF ≤40% (Heart failure with reduced ejection fraction)
   - HFmrEF: EF 41-49% (Heart failure with mid-range EF)
   - HFpEF: EF ≥50% (Heart failure with preserved EF)

2. NYHA Functional Classification:
   - Class I: No limitation of physical activity
   - Class II: Slight limitation; comfortable at rest
   - Class III: Marked limitation; comfortable only at rest
   - Class IV: Unable to carry on any physical activity without symptoms

CAUSES:
- Ischaemic heart disease (most common)
- Hypertension
- Valvular heart disease
- Cardiomyopathy
- Arrhythmias

CLINICAL FEATURES:
Left heart failure: Dyspnoea, orthopnoea, paroxysmal nocturnal dyspnoea, fatigue
Right heart failure: Peripheral oedema, hepatomegaly, raised JVP, ascites
Biventricular: Both left and right heart failure symptoms

TREATMENT:
Non-pharmacological:
- Fluid restriction (1.5-2L/day)
- Salt restriction (<2g sodium/day)
- Daily weights
- Smoking cessation
- Limit alcohol

Pharmacological (for HFrEF):
1. ACE Inhibitors/ARBs: Lisinopril, Enalapril, Losartan - Start low, titrate up
2. Beta-blockers: Bisoprolol, Carvedilol, Metoprolol - Start low when stable
3. Diuretics: Furosemide 20-80mg daily for congestion
4. Mineralocorticoid receptor antagonists: Spironolactone 25-50mg daily
5. Digoxin: For symptom control, AF

ACUTE DECOMPENSATED HEART FAILURE:
- Sit patient upright
- High-flow oxygen
- IV Furosemide 40-80mg
- IV Morphine 2.5-5mg (if severe distress)
- Consider vasodilators (GTN) if BP adequate
- Treat underlying cause`,
    page_number: 134,
    metadata: { keywords: ["heart failure", "dyspnoea", "furosemide", "ACE inhibitor", "cardiomyopathy"] }
  },
  // Chapter 8: Respiratory Disorders
  {
    chapter: "Chapter 8: Disorders of the Respiratory System",
    section: "Bronchial Asthma",
    content: `BRONCHIAL ASTHMA - Definition: A chronic inflammatory disorder of the airways characterized by recurrent episodes of wheezing, breathlessness, chest tightness, and coughing.

DIAGNOSIS:
- Recurrent episodes of wheeze, cough, breathlessness, chest tightness
- Symptoms worse at night or early morning
- Symptoms triggered by exercise, allergens, cold air, viral infections
- Peak flow variability >20%
- Response to bronchodilators

CLASSIFICATION OF SEVERITY:
1. Intermittent: Symptoms <2 days/week, night symptoms <2/month
2. Mild persistent: Symptoms >2 days/week but not daily, night symptoms 3-4/month
3. Moderate persistent: Daily symptoms, night symptoms >1/week
4. Severe persistent: Continuous symptoms, frequent night symptoms

TREATMENT - STEPWISE APPROACH:

STEP 1 (Intermittent):
- SABA as needed (Salbutamol inhaler 100-200mcg)

STEP 2 (Mild persistent):
- Low-dose ICS (Beclometasone 100-200mcg twice daily)
- SABA as needed

STEP 3 (Moderate persistent):
- Low-dose ICS + LABA (Beclometasone + Formoterol)
- OR Medium-dose ICS
- SABA as needed

STEP 4 (Moderate-severe):
- Medium/high-dose ICS + LABA
- Consider adding: LTRA (Montelukast), Theophylline

STEP 5 (Severe):
- High-dose ICS + LABA
- Oral corticosteroids
- Refer to specialist

ACUTE ASTHMA MANAGEMENT:
Mild-Moderate:
- Salbutamol 4-6 puffs via spacer, repeat every 20 min if needed
- Prednisolone 40-50mg (adults) or 1-2mg/kg (children)

Severe:
- High-flow oxygen
- Salbutamol nebulizer 5mg + Ipratropium 500mcg
- Hydrocortisone 100mg IV or Prednisolone 40-50mg oral
- Consider IV Magnesium sulphate 2g over 20 min`,
    page_number: 175,
    metadata: { keywords: ["asthma", "inhaler", "salbutamol", "beclometasone", "wheeze"] }
  },
  {
    chapter: "Chapter 8: Disorders of the Respiratory System",
    section: "Pneumonia",
    content: `PNEUMONIA - Definition: Inflammation of the lung parenchyma, usually caused by infection.

TYPES:
1. Community-acquired pneumonia (CAP)
2. Hospital-acquired pneumonia (HAP)
3. Aspiration pneumonia
4. Pneumonia in immunocompromised

COMMON CAUSES:
- Streptococcus pneumoniae (most common)
- Haemophilus influenzae
- Mycoplasma pneumoniae (atypical)
- Staphylococcus aureus
- Klebsiella pneumoniae
- Viruses (influenza, SARS-CoV-2)

CLINICAL FEATURES:
- Cough (productive or dry)
- Fever and chills
- Dyspnoea
- Chest pain (pleuritic)
- Tachypnoea
- Crackles on auscultation
- Reduced breath sounds
- Dullness to percussion

SEVERITY ASSESSMENT (CURB-65):
C - Confusion
U - Urea >7mmol/L
R - Respiratory rate ≥30/min
B - Blood pressure: SBP <90 or DBP ≤60 mmHg
65 - Age ≥65 years
Score 0-1: Home treatment; 2: Consider hospital; 3-5: Hospital/ICU

TREATMENT:
Community-Acquired (Outpatient):
- Amoxicillin 500mg-1g three times daily for 5-7 days
- If penicillin allergic: Azithromycin 500mg day 1, then 250mg days 2-5

Community-Acquired (Inpatient, moderate):
- Amoxicillin 1g three times daily IV/oral + Azithromycin 500mg daily
- Duration: 5-7 days

Severe CAP:
- Ceftriaxone 2g IV daily + Azithromycin 500mg IV daily
- Consider ICU admission

Hospital-Acquired:
- Piperacillin-tazobactam 4.5g IV 8-hourly OR
- Ceftazidime 2g IV 8-hourly + Metronidazole
- Duration: 7-14 days`,
    page_number: 169,
    metadata: { keywords: ["pneumonia", "cough", "fever", "amoxicillin", "chest infection"] }
  },
  // Chapter 9: CNS Disorders
  {
    chapter: "Chapter 9: Disorders of the Central Nervous System",
    section: "Epilepsy",
    content: `EPILEPSY - Definition: A chronic brain disorder characterized by recurrent unprovoked seizures.

CLASSIFICATION OF SEIZURES:
1. Focal (Partial) Seizures:
   - Simple partial (awareness preserved)
   - Complex partial (awareness impaired)
   - Focal to bilateral tonic-clonic

2. Generalized Seizures:
   - Tonic-clonic (grand mal)
   - Absence (petit mal)
   - Myoclonic
   - Atonic
   - Tonic

DIAGNOSIS:
- Clinical history (seizure description, witnesses)
- EEG (may be normal between seizures)
- MRI brain (to identify structural causes)
- Blood tests (glucose, electrolytes, calcium)

WHEN TO START TREATMENT:
- After 2 or more unprovoked seizures
- After first seizure if: abnormal EEG, structural lesion, high recurrence risk

FIRST-LINE ANTIEPILEPTIC DRUGS:

For Focal seizures:
- Carbamazepine 100-200mg twice daily, increase gradually to 400-600mg twice daily
- Lamotrigine 25mg daily, increase slowly to 100-200mg twice daily

For Generalized tonic-clonic:
- Sodium valproate 200mg twice daily, increase to 500-1000mg twice daily
- Lamotrigine (as above)

For Absence seizures:
- Ethosuximide 250mg twice daily, increase to 500-750mg twice daily
- Sodium valproate (as above)

IMPORTANT CONSIDERATIONS:
- Sodium valproate: Avoid in women of childbearing age (teratogenic)
- Carbamazepine: Enzyme inducer, drug interactions
- Lamotrigine: Slow titration required (risk of rash)
- Regular monitoring of drug levels and liver function

STATUS EPILEPTICUS (seizure >5 min or repeated seizures):
1. Protect airway, give oxygen
2. IV access, check blood glucose
3. Diazepam 10mg IV (or PR if no access) OR Lorazepam 4mg IV
4. Repeat benzodiazepine after 5-10 min if seizure continues
5. If still seizing: Phenytoin 20mg/kg IV OR Phenobarbital 15-20mg/kg IV`,
    page_number: 200,
    metadata: { keywords: ["epilepsy", "seizure", "carbamazepine", "valproate", "convulsion"] }
  },
  // Chapter 10: Psychiatric Disorders
  {
    chapter: "Chapter 10: Psychiatric Disorders",
    section: "Depression",
    content: `DEPRESSION - Definition: A mood disorder characterized by persistent low mood and/or loss of interest or pleasure in activities.

DIAGNOSTIC CRITERIA (at least 5 for ≥2 weeks):
Core symptoms (at least 1 required):
- Depressed mood most of the day
- Markedly diminished interest or pleasure in activities

Additional symptoms:
- Significant weight change or appetite change
- Insomnia or hypersomnia
- Psychomotor agitation or retardation
- Fatigue or loss of energy
- Feelings of worthlessness or excessive guilt
- Diminished ability to concentrate
- Recurrent thoughts of death or suicidal ideation

SEVERITY:
- Mild: Few symptoms, mild functional impairment
- Moderate: More symptoms, significant functional impairment
- Severe: Most symptoms, marked functional impairment, may have psychotic features

TREATMENT:

Non-pharmacological:
- Psychoeducation
- Cognitive behavioural therapy (CBT)
- Interpersonal therapy
- Regular exercise
- Social support

Pharmacological:
First-line (SSRIs):
- Fluoxetine 20mg daily (may increase to 40-60mg)
- Sertraline 50mg daily (may increase to 100-200mg)
- Paroxetine 20mg daily (may increase to 40-50mg)

Second-line (TCAs):
- Amitriptyline 25-50mg at bedtime (increase to 75-150mg)
- Imipramine 25-50mg daily (increase to 150-200mg)

IMPORTANT NOTES:
- Full therapeutic effect takes 4-6 weeks
- Continue treatment for at least 6-12 months after remission
- Monitor for suicidal ideation, especially in early treatment
- Withdraw gradually to avoid discontinuation syndrome

SEVERE DEPRESSION WITH SUICIDAL IDEATION:
- Hospital admission may be required
- Close monitoring
- Consider electroconvulsive therapy (ECT) if life-threatening or treatment-resistant`,
    page_number: 216,
    metadata: { keywords: ["depression", "antidepressant", "fluoxetine", "SSRI", "mood"] }
  },
  // Chapter 12: Endocrine Disorders
  {
    chapter: "Chapter 12: Endocrine and Metabolic Disorders",
    section: "Diabetes Mellitus",
    content: `DIABETES MELLITUS - Definition: A group of metabolic disorders characterized by chronic hyperglycaemia resulting from defects in insulin secretion, insulin action, or both.

CLASSIFICATION:
1. Type 1 Diabetes: Autoimmune destruction of beta cells, absolute insulin deficiency
2. Type 2 Diabetes: Insulin resistance with relative insulin deficiency
3. Gestational Diabetes: Diabetes first diagnosed during pregnancy
4. Other specific types: Genetic defects, drug-induced, etc.

DIAGNOSTIC CRITERIA:
- Fasting plasma glucose ≥7.0 mmol/L (126 mg/dL)
- 2-hour plasma glucose ≥11.1 mmol/L (200 mg/dL) during OGTT
- Random plasma glucose ≥11.1 mmol/L with symptoms
- HbA1c ≥6.5% (48 mmol/mol)

TREATMENT GOALS:
- HbA1c <7% (individualize based on patient factors)
- Fasting glucose 4.4-7.2 mmol/L
- Post-prandial glucose <10 mmol/L
- Blood pressure <130/80 mmHg
- LDL cholesterol <2.6 mmol/L

TYPE 2 DIABETES - STEPWISE TREATMENT:

Step 1: Lifestyle modification + Metformin
- Diet: Low glycaemic index, reduce simple sugars
- Exercise: 150 min/week moderate intensity
- Metformin: Start 500mg twice daily, increase to 1000mg twice daily

Step 2: Add second oral agent
- Sulfonylurea (Glibenclamide 2.5-10mg daily, Gliclazide 40-160mg daily)
- OR DPP-4 inhibitor (if hypoglycemia concern)

Step 3: Add third agent or Insulin
- Consider adding basal insulin (NPH at bedtime, or Glargine)

TYPE 1 DIABETES:
- Multiple daily insulin injections OR insulin pump
- Rapid-acting (Actrapid/Regular) before meals
- Intermediate/Long-acting (NPH/Glargine) as basal

MONITORING:
- Self-monitoring of blood glucose
- HbA1c every 3-6 months
- Annual screening: Eyes, feet, kidney function, lipid profile

HYPOGLYCAEMIA MANAGEMENT:
Mild-Moderate: 15-20g fast-acting carbohydrate (glucose tablets, fruit juice)
Severe: IV Dextrose 50% 50ml OR Glucagon 1mg IM`,
    page_number: 287,
    metadata: { keywords: ["diabetes", "insulin", "metformin", "glucose", "HbA1c"] }
  },
  // Chapter 16: Infectious Diseases
  {
    chapter: "Chapter 16: Infectious Diseases",
    section: "Malaria",
    content: `MALARIA - Definition: An acute febrile illness caused by Plasmodium parasites transmitted through the bite of infected female Anopheles mosquitoes.

SPECIES IN GHANA:
- Plasmodium falciparum (most common, >95%)
- P. malariae
- P. ovale

CLINICAL FEATURES:
Uncomplicated malaria:
- Fever (may be cyclical)
- Chills and rigors
- Headache
- Myalgia
- Malaise
- Nausea and vomiting

Severe malaria (any one of):
- Impaired consciousness/coma
- Prostration
- Multiple convulsions
- Respiratory distress
- Pulmonary oedema
- Shock
- Abnormal bleeding
- Jaundice
- Haemoglobinuria
- Severe anaemia (Hb <5g/dL)
- Hypoglycaemia (<2.2 mmol/L)
- Acidosis
- Renal impairment
- Hyperparasitaemia (>10%)

DIAGNOSIS:
- Blood film (thick and thin) - Gold standard
- Rapid Diagnostic Test (RDT)

TREATMENT OF UNCOMPLICATED MALARIA:
First-line (Artemisinin-based Combination Therapy - ACT):
Adults:
- Artemether-Lumefantrine (20/120mg): 4 tablets at 0, 8, 24, 36, 48, 60 hours
- OR Artesunate-Amodiaquine: Weight-based dosing for 3 days

Children:
- Same drugs, dose based on weight

TREATMENT OF SEVERE MALARIA:
1. IV Artesunate 2.4 mg/kg at 0, 12, 24 hours, then daily until oral medication possible
2. Alternative: IM Artemether 3.2 mg/kg on day 1, then 1.6 mg/kg daily
3. Complete treatment with full course of ACT when patient can take oral

Supportive care:
- IV fluids (avoid overhydration)
- Blood transfusion if severe anaemia
- IV Dextrose for hypoglycaemia
- Anticonvulsants if seizures

PREVENTION:
- Insecticide-treated bed nets
- Indoor residual spraying
- Intermittent preventive treatment in pregnancy (IPTp-SP)
- Chemoprophylaxis for travellers`,
    page_number: 428,
    metadata: { keywords: ["malaria", "fever", "artemether", "plasmodium", "ACT"] }
  },
  {
    chapter: "Chapter 16: Infectious Diseases",
    section: "Typhoid Fever",
    content: `TYPHOID FEVER - Definition: A systemic infection caused by Salmonella typhi (typhoid) or Salmonella paratyphi (paratyphoid).

TRANSMISSION: Faecal-oral route through contaminated food or water.

CLINICAL FEATURES:
Week 1:
- Stepladder fever (gradually increasing)
- Headache
- Malaise
- Relative bradycardia

Week 2:
- High sustained fever
- Abdominal distension
- Rose spots (faint pink macules on trunk)
- Hepatosplenomegaly
- Diarrhoea or constipation

Week 3-4 (if untreated):
- Complications: Intestinal perforation, haemorrhage, encephalopathy

DIAGNOSIS:
- Blood culture (first week - 40-80% sensitive)
- Stool culture (second week onwards)
- Widal test (limited utility - may be false positive)
- Bone marrow culture (most sensitive)

TREATMENT:
Uncomplicated typhoid (outpatient):
First-line:
- Ciprofloxacin 500mg twice daily for 7-14 days
- OR Azithromycin 500mg daily for 7 days

Alternative:
- Ceftriaxone 2g IV/IM daily for 7-14 days
- Chloramphenicol 500mg 6-hourly for 14-21 days (if sensitive)

Severe/Complicated typhoid (inpatient):
- Ceftriaxone 2g IV daily for 10-14 days
- Plus Dexamethasone 3mg/kg IV initially, then 1mg/kg 6-hourly for 48 hours (if severely ill with altered consciousness)

Children:
- Azithromycin 10-20mg/kg daily for 7 days
- Ceftriaxone 50-75mg/kg IV daily for 7-14 days

PREVENTION:
- Safe water supply
- Proper sanitation
- Food hygiene
- Typhoid vaccination for high-risk groups`,
    page_number: 450,
    metadata: { keywords: ["typhoid", "fever", "salmonella", "ciprofloxacin", "rose spots"] }
  },
  // Chapter 17: HIV/AIDS
  {
    chapter: "Chapter 17: HIV and AIDS",
    section: "HIV Management",
    content: `HIV/AIDS MANAGEMENT

WHEN TO START ANTIRETROVIRAL THERAPY (ART):
- All HIV-positive individuals regardless of CD4 count (Test and Treat)
- Priority: Pregnant/breastfeeding women, children <5 years, TB co-infection, Hepatitis B/C co-infection

FIRST-LINE ART REGIMENS:

Adults and Adolescents:
Preferred: TDF + 3TC (or FTC) + DTG
- Tenofovir 300mg + Lamivudine 300mg + Dolutegravir 50mg (fixed-dose combination once daily)

Alternative:
- TDF + 3TC + EFV (if DTG not available or contraindicated)
- AZT + 3TC + DTG (if TDF contraindicated - renal impairment)

Pregnant women:
- TDF + 3TC + DTG (preferred)
- Monitor for neural tube defects if conceived on DTG

Children:
- ABC + 3TC + DTG (children ≥4 weeks and ≥3kg)
- ABC + 3TC + LPV/r (if DTG not available)

MONITORING:
- Baseline: CD4 count, viral load, Hb, renal function, hepatitis B status
- Viral load: At 6 months, 12 months, then annually
- Target: Undetectable viral load (<50 copies/mL) by 6 months

ADHERENCE:
- Aim for >95% adherence
- Counsel on importance of taking medications daily at same time
- Address barriers to adherence

PREVENTION OF MOTHER-TO-CHILD TRANSMISSION (PMTCT):
- Start ART immediately upon diagnosis
- Infant prophylaxis: NVP daily for 6 weeks (or longer if high risk)
- Exclusive breastfeeding for 6 months, continue until 12-24 months with complementary foods

TREATMENT FAILURE:
Clinical failure: New or recurrent WHO stage 4 condition
Immunological failure: CD4 falls to baseline or below, or persistent CD4 <100
Virological failure: Viral load >1000 copies/mL on 2 consecutive measurements

Second-line ART:
- If failed TDF-based: AZT + 3TC + ATV/r (or LPV/r)
- If failed AZT-based: TDF + 3TC + ATV/r (or LPV/r)`,
    page_number: 475,
    metadata: { keywords: ["HIV", "AIDS", "ART", "antiretroviral", "dolutegravir", "viral load"] }
  },
  // Additional common conditions
  {
    chapter: "Chapter 15: Disorders of the Kidney",
    section: "Urinary Tract Infection",
    content: `URINARY TRACT INFECTION (UTI) - Definition: Infection of any part of the urinary system.

CLASSIFICATION:
1. Lower UTI (Cystitis): Infection of the bladder
2. Upper UTI (Pyelonephritis): Infection of the kidney
3. Uncomplicated: In healthy, non-pregnant women with normal urinary tract
4. Complicated: In men, pregnant women, children, or those with structural/functional abnormalities

CLINICAL FEATURES:
Lower UTI (Cystitis):
- Dysuria (pain on urination)
- Frequency
- Urgency
- Suprapubic pain
- Haematuria

Upper UTI (Pyelonephritis):
- Fever and chills
- Flank pain
- Nausea and vomiting
- Lower UTI symptoms may be present
- Tender costovertebral angle

DIAGNOSIS:
- Urinalysis: Leucocytes, nitrites, blood
- Urine culture: >10⁵ CFU/mL (or lower with symptoms)
- Blood cultures if severe/systemic symptoms

TREATMENT:
Uncomplicated cystitis (women):
- Nitrofurantoin 100mg twice daily for 5-7 days
- OR Ciprofloxacin 500mg twice daily for 3 days
- OR Amoxicillin-clavulanate 625mg twice daily for 5-7 days

Acute pyelonephritis (outpatient):
- Ciprofloxacin 500mg twice daily for 7-14 days
- OR Amoxicillin-clavulanate 625mg three times daily for 10-14 days

Acute pyelonephritis (inpatient):
- Ceftriaxone 1g IV daily
- OR Ciprofloxacin 400mg IV twice daily
- Switch to oral when improved, complete 10-14 days total

UTI in pregnancy:
- Nitrofurantoin 100mg twice daily for 7 days (avoid near term)
- Amoxicillin 500mg three times daily for 7 days
- Cephalexin 500mg three times daily for 7 days
- Always treat asymptomatic bacteriuria in pregnancy

UTI in children:
- Refer for investigation after first UTI
- Amoxicillin-clavulanate or Cephalexin`,
    page_number: 401,
    metadata: { keywords: ["UTI", "cystitis", "pyelonephritis", "dysuria", "nitrofurantoin"] }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check if knowledge base is already seeded
    const { count } = await supabase
      .from("knowledge_chunks")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ message: "Knowledge base already seeded", count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert knowledge chunks
    const { data, error } = await supabase
      .from("knowledge_chunks")
      .insert(knowledgeChunks);

    if (error) {
      console.error("Error seeding knowledge base:", error);
      throw error;
    }

    console.log(`Successfully seeded ${knowledgeChunks.length} knowledge chunks`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Seeded ${knowledgeChunks.length} knowledge chunks`,
        chunks: knowledgeChunks.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
