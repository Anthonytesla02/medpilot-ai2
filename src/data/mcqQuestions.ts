export interface MCQQuestion {
  id: number;
  context?: string;
  question: string;
  options: { letter: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

export const mcqQuestions: MCQQuestion[] = [
  {
    id: 1,
    context: "TIFFAL COUGH MIXTURE\nEach 5ml contains:\nPhenylephrine 4mg\nDiphenhydramine 10mg\nDextromethorphan 50mg\nSyrup to 5ml",
    question: "What type of cough mixture is the medicine above?",
    options: [
      { letter: "a", text: "Demulcent" },
      { letter: "b", text: "Expectorant" },
      { letter: "c", text: "Cough Suppressant" },
      { letter: "d", text: "None of the above" }
    ],
    correctAnswer: "c",
    explanation: "Dextromethorphan is an antitussive that suppresses the cough reflex."
  },
  {
    id: 2,
    context: "TIFFAL COUGH MIXTURE\nEach 5ml contains:\nPhenylephrine 4mg\nDiphenhydramine 10mg\nDextromethorphan 50mg\nSyrup to 5ml",
    question: "What side effect can the patient experience when using the medication?",
    options: [
      { letter: "a", text: "Headache" },
      { letter: "b", text: "Fever" },
      { letter: "c", text: "Drowsiness" },
      { letter: "d", text: "Diabetes" }
    ],
    correctAnswer: "c",
    explanation: "Diphenhydramine is an antihistamine that commonly causes drowsiness."
  },
  {
    id: 3,
    context: "TIFFAL COUGH MIXTURE\nEach 5ml contains:\nPhenylephrine 4mg\nDiphenhydramine 10mg\nDextromethorphan 50mg\nSyrup to 5ml",
    question: "What is the ingredient responsible for the side effect in question 2?",
    options: [
      { letter: "a", text: "Phenylephrine" },
      { letter: "b", text: "Carbocysteine" },
      { letter: "c", text: "Syrup" },
      { letter: "d", text: "Diphenhydramine" }
    ],
    correctAnswer: "d",
    explanation: "Diphenhydramine is a sedating antihistamine that causes drowsiness."
  },
  {
    id: 4,
    context: "TIFFAL COUGH MIXTURE\nEach 5ml contains:\nPhenylephrine 4mg\nDiphenhydramine 10mg\nDextromethorphan 50mg\nSyrup to 5ml",
    question: "Which of the following patients must not take the medication above?",
    options: [
      { letter: "a", text: "Ulcer" },
      { letter: "b", text: "Hypertensive" },
      { letter: "c", text: "Malaria" },
      { letter: "d", text: "None of the above" }
    ],
    correctAnswer: "b",
    explanation: "Phenylephrine is a decongestant that raises blood pressure."
  },
  {
    id: 5,
    context: "TIFFAL COUGH MIXTURE\nEach 5ml contains:\nPhenylephrine 4mg\nDiphenhydramine 10mg\nDextromethorphan 50mg\nSyrup to 5ml",
    question: "What important warning will you give to the patient?",
    options: [
      { letter: "a", text: "Should not take medication often" },
      { letter: "b", text: "Keep away from children" },
      { letter: "c", text: "It causes drowsiness so if affected do not drive, operate machine or take in alcohol" },
      { letter: "d", text: "All of the above" }
    ],
    correctAnswer: "d",
    explanation: "All warnings are important for safe medication use."
  },
  {
    id: 6,
    context: "TIFFAL COUGH MIXTURE\nEach 5ml contains:\nPhenylephrine 4mg\nDiphenhydramine 10mg\nDextromethorphan 50mg\nSyrup to 5ml",
    question: "Which of the following patients is this medication NOT suitable for?",
    options: [
      { letter: "a", text: "Diabetics" },
      { letter: "b", text: "Ulcer" },
      { letter: "c", text: "Cold patient" },
      { letter: "d", text: "Alcoholics" }
    ],
    correctAnswer: "a",
    explanation: "The syrup base contains sugar which is unsuitable for diabetics."
  },
  {
    id: 7,
    context: "TIFFAL COUGH MIXTURE\nEach 5ml contains:\nPhenylephrine 4mg\nDiphenhydramine 10mg\nDextromethorphan 50mg\nSyrup to 5ml",
    question: "Apart from your answer in question 5, which other warning will you give to patient when taking the medication?",
    options: [
      { letter: "a", text: "Should finish the course" },
      { letter: "b", text: "Causes drowsiness so don't take alcohol" },
      { letter: "c", text: "Will make you cough more" },
      { letter: "d", text: "Will make you dizzy" }
    ],
    correctAnswer: "b",
    explanation: "Alcohol enhances the sedative effects of diphenhydramine."
  },
  {
    id: 8,
    context: "TIFFAL COUGH MIXTURE\nEach 5ml contains:\nPhenylephrine 4mg\nDiphenhydramine 10mg\nDextromethorphan 50mg\nSyrup to 5ml",
    question: "Which of the following drugs will you add to the cough mixture to treat cold?",
    options: [
      { letter: "a", text: "Paracetamol" },
      { letter: "b", text: "Rhizin" },
      { letter: "c", text: "Multivitamin" },
      { letter: "d", text: "None of the above" }
    ],
    correctAnswer: "a",
    explanation: "Paracetamol helps relieve fever and body aches associated with cold."
  },
  {
    id: 9,
    question: "Which of the following ailments is self-limiting?",
    options: [
      { letter: "a", text: "Cough" },
      { letter: "b", text: "Cold" },
      { letter: "c", text: "Headache" },
      { letter: "d", text: "Fever" }
    ],
    correctAnswer: "b",
    explanation: "Common cold resolves on its own within 7-10 days without treatment."
  },
  {
    id: 10,
    question: "Which of the following does not play a role in the management of common cold?",
    options: [
      { letter: "a", text: "Ascorbic acid" },
      { letter: "b", text: "Cetirizine" },
      { letter: "c", text: "Amoxicillin + clavulanic acid" },
      { letter: "d", text: "Saline nasal drops" }
    ],
    correctAnswer: "c",
    explanation: "Antibiotics are ineffective against viral infections like common cold."
  },
  {
    id: 11,
    question: "Non pharmacological management of common cold include the following EXCEPT",
    options: [
      { letter: "a", text: "Rest" },
      { letter: "b", text: "Intake of fluids" },
      { letter: "c", text: "Avoidance of ice cold drinks" },
      { letter: "d", text: "Inhalation of eucalyptus oil" }
    ],
    correctAnswer: "c",
    explanation: "Avoiding cold drinks is not a standard non-pharmacological management for cold."
  },
  {
    id: 12,
    question: "Which of the measurement is used in finding if one is overweight?",
    options: [
      { letter: "a", text: "Height" },
      { letter: "b", text: "Weight" },
      { letter: "c", text: "Waist size" },
      { letter: "d", text: "Body Mass Index" }
    ],
    correctAnswer: "d",
    explanation: "BMI uses height and weight to determine if someone is overweight."
  },
  {
    id: 13,
    question: "Which of the following is NOT a cause for obesity?",
    options: [
      { letter: "a", text: "Genetic factors" },
      { letter: "b", text: "Sedentary Lifestyle" },
      { letter: "c", text: "Lack of exercise" },
      { letter: "d", text: "None of the above" }
    ],
    correctAnswer: "d",
    explanation: "All listed factors contribute to obesity."
  },
  {
    id: 14,
    question: "What is the body mass index of a patient with height 1.28m and weight of 82.5kg?",
    options: [
      { letter: "a", text: "51kg/m²" },
      { letter: "b", text: "52kg/m²" },
      { letter: "c", text: "50.3kg/m²" },
      { letter: "d", text: "51.4kg/m²" }
    ],
    correctAnswer: "c",
    explanation: "BMI = 82.5 ÷ (1.28)² = 50.3 kg/m²."
  },
  {
    id: 15,
    question: "The most common cause of death in children under 5 with diarrhea is",
    options: [
      { letter: "a", text: "Vomiting" },
      { letter: "b", text: "Dehydration" },
      { letter: "c", text: "Loss of appetite" },
      { letter: "d", text: "Weight loss" }
    ],
    correctAnswer: "b",
    explanation: "Dehydration from fluid loss is the leading cause of death in pediatric diarrhea."
  },
  {
    id: 16,
    question: "Which of the following can be used as a replacement for Oral Rehydration Salt?",
    options: [
      { letter: "a", text: "Coke with salt" },
      { letter: "b", text: "Salt water" },
      { letter: "c", text: "Coconut water" },
      { letter: "d", text: "All of the above" }
    ],
    correctAnswer: "c",
    explanation: "Coconut water contains natural electrolytes similar to ORS."
  },
  {
    id: 17,
    question: "Deficiency of thiamine causes",
    options: [
      { letter: "a", text: "Night blindness" },
      { letter: "b", text: "Kwashiorkor" },
      { letter: "c", text: "Pellagra" },
      { letter: "d", text: "Beriberi" }
    ],
    correctAnswer: "d",
    explanation: "Thiamine (Vitamin B1) deficiency causes beriberi."
  },
  {
    id: 18,
    question: "The following are fat soluble vitamins EXCEPT",
    options: [
      { letter: "a", text: "Thiamine" },
      { letter: "b", text: "Calciferol" },
      { letter: "c", text: "Tocopherol" },
      { letter: "d", text: "Retinol" }
    ],
    correctAnswer: "a",
    explanation: "Thiamine (B1) is water-soluble; A, D, E, K are fat-soluble."
  },
  {
    id: 19,
    question: "Paracetamol toxicity mainly affects which organ?",
    options: [
      { letter: "a", text: "Kidney" },
      { letter: "b", text: "Brain" },
      { letter: "c", text: "Heart" },
      { letter: "d", text: "Liver" }
    ],
    correctAnswer: "d",
    explanation: "Paracetamol overdose causes hepatotoxicity (liver damage)."
  },
  {
    id: 20,
    question: "Which of the following dosage forms contain alcohol?",
    options: [
      { letter: "a", text: "Elixir" },
      { letter: "b", text: "Suspension" },
      { letter: "c", text: "Syrup" },
      { letter: "d", text: "Pills" }
    ],
    correctAnswer: "a",
    explanation: "Elixirs are clear, sweetened hydroalcoholic solutions."
  },
  {
    id: 21,
    question: "Features of a valid prescription includes all the following EXCEPT",
    options: [
      { letter: "a", text: "Is in indelible writing signed and dated by an approved prescriber" },
      { letter: "b", text: "States the name and address of the person to whom treatment is being given" },
      { letter: "c", text: "Has been already fully dispensed" },
      { letter: "d", text: "States the name, address and qualification of the person signing it" }
    ],
    correctAnswer: "c",
    explanation: "A fully dispensed prescription is no longer valid for dispensing."
  },
  {
    id: 22,
    question: "Two dessertspoons is equal to",
    options: [
      { letter: "a", text: "10ml" },
      { letter: "b", text: "15ml" },
      { letter: "c", text: "20ml" },
      { letter: "d", text: "30ml" }
    ],
    correctAnswer: "c",
    explanation: "One dessertspoon = 10ml, so two = 20ml."
  },
  {
    id: 23,
    question: "The maximum daily adult dose of acetaminophen is",
    options: [
      { letter: "a", text: "500mg" },
      { letter: "b", text: "1g" },
      { letter: "c", text: "4g" },
      { letter: "d", text: "8g" }
    ],
    correctAnswer: "c",
    explanation: "Maximum daily paracetamol dose is 4g to prevent liver toxicity."
  },
  {
    id: 24,
    question: "Which of the following viruses is implicated in causing diarrhea?",
    options: [
      { letter: "a", text: "Norovirus" },
      { letter: "b", text: "Rotavirus" },
      { letter: "c", text: "Coronavirus" },
      { letter: "d", text: "(a) and (b)" }
    ],
    correctAnswer: "d",
    explanation: "Both Norovirus and Rotavirus are common causes of viral gastroenteritis."
  },
  {
    id: 25,
    question: "The law that regulates the practice of pharmacy is",
    options: [
      { letter: "a", text: "Pharmacy act 489" },
      { letter: "b", text: "Health professions regulatory bodies (HPRBA) act, 2013" },
      { letter: "c", text: "HPRBA part IV" },
      { letter: "d", text: "None of the above" }
    ],
    correctAnswer: "b",
    explanation: "HPRBA Act, 2013 governs health professions including pharmacy in Ghana."
  },
  {
    id: 26,
    question: "By which of the following routes are drugs administered directly into the bloodstream?",
    options: [
      { letter: "a", text: "Oral route" },
      { letter: "b", text: "Intravenous route" },
      { letter: "c", text: "Intramuscular route" },
      { letter: "d", text: "Sublingual route" }
    ],
    correctAnswer: "b",
    explanation: "IV route delivers drugs directly into the bloodstream."
  },
  {
    id: 27,
    question: "Fever is a raise in body temperature above",
    options: [
      { letter: "a", text: "36.5°C" },
      { letter: "b", text: "37.0°C" },
      { letter: "c", text: "38.0°C" },
      { letter: "d", text: "37.5°C" }
    ],
    correctAnswer: "d",
    explanation: "Fever is generally defined as body temperature above 37.5°C."
  },
  {
    id: 28,
    question: "Which of the following is supposedly an abbreviation for the Latin word for recipe?",
    options: [
      { letter: "a", text: "Rx" },
      { letter: "b", text: "Tx" },
      { letter: "c", text: "Sx" },
      { letter: "d", text: "Dx" }
    ],
    correctAnswer: "a",
    explanation: "Rx comes from the Latin 'recipe' meaning 'take thou'."
  },
  {
    id: 29,
    question: "The word Pharmacy is derived from the ancient Greek word",
    options: [
      { letter: "a", text: "Pharmakos" },
      { letter: "b", text: "Pharmakon" },
      { letter: "c", text: "Pharmakopeia" },
      { letter: "d", text: "Pharmakot" }
    ],
    correctAnswer: "b",
    explanation: "Pharmakon means drug, medicine, or poison in Greek."
  },
  {
    id: 30,
    question: "The _______ is responsible for dispensing Prescription Only Medication",
    options: [
      { letter: "a", text: "Pharmacist" },
      { letter: "b", text: "Pharmacy Technician" },
      { letter: "c", text: "Medicine counter assistant" },
      { letter: "d", text: "Over-the-counter medicine sellers" }
    ],
    correctAnswer: "a",
    explanation: "Only pharmacists can legally dispense prescription medications."
  },
  {
    id: 31,
    question: "Keeping the Pharmacy tidy is the duty of the",
    options: [
      { letter: "a", text: "Pharmacist" },
      { letter: "b", text: "Pharmacy Technician" },
      { letter: "c", text: "Medicine counter assistant" },
      { letter: "d", text: "Pharmacologist" }
    ],
    correctAnswer: "c",
    explanation: "Medicine counter assistants handle general pharmacy housekeeping."
  },
  {
    id: 32,
    question: "_______ is producing, mixing, or preparing a drug by combining ingredients",
    options: [
      { letter: "a", text: "Preparation" },
      { letter: "b", text: "Reconstitution" },
      { letter: "c", text: "Compounding" },
      { letter: "d", text: "Dispensing" }
    ],
    correctAnswer: "c",
    explanation: "Compounding is the process of combining ingredients to create medications."
  },
  {
    id: 33,
    question: "Which of the following Pharmacies are registered by Pharmacy council?",
    options: [
      { letter: "a", text: "I only" },
      { letter: "b", text: "I and II" },
      { letter: "c", text: "I, II, III" },
      { letter: "d", text: "I, II, III, IV (Retail, Wholesale, Retail+Wholesale, Hospital)" }
    ],
    correctAnswer: "d",
    explanation: "All pharmacy types must be registered with the Pharmacy Council."
  },
  {
    id: 34,
    question: "The following are examples of class A drugs EXCEPT",
    options: [
      { letter: "a", text: "Amlodipine" },
      { letter: "b", text: "Metformin" },
      { letter: "c", text: "IV ceftriaxone" },
      { letter: "d", text: "Iron III polymaltose" }
    ],
    correctAnswer: "d",
    explanation: "Iron III polymaltose is not a Class A (prescription only) medication."
  },
  {
    id: 35,
    question: "The following are the main types of customers",
    options: [
      { letter: "a", text: "I and II" },
      { letter: "b", text: "I and III" },
      { letter: "c", text: "III and IV" },
      { letter: "d", text: "II and III (Internal and External customers)" }
    ],
    correctAnswer: "d",
    explanation: "Internal (staff) and external (patients/public) are the main customer types."
  },
  {
    id: 36,
    question: "Rx: Tab metronidazole 400mg tid X 7/7. Available in the pharmacy is 200mg tablets, how many tablets will you dispense?",
    options: [
      { letter: "a", text: "36" },
      { letter: "b", text: "42" },
      { letter: "c", text: "21" },
      { letter: "d", text: "49" }
    ],
    correctAnswer: "b",
    explanation: "400mg = 2 tablets × 3 times × 7 days = 42 tablets."
  },
  {
    id: 37,
    question: "Medicine can be used for",
    options: [
      { letter: "a", text: "Treatment only" },
      { letter: "b", text: "Treatment and Diagnosis" },
      { letter: "c", text: "Treatment, Diagnosis, and Prevention" },
      { letter: "d", text: "None of the above" }
    ],
    correctAnswer: "c",
    explanation: "Medicines serve therapeutic, diagnostic, and preventive purposes."
  },
  {
    id: 38,
    question: "The following are the main classes of drugs EXCEPT",
    options: [
      { letter: "a", text: "Prescription-Only Medication" },
      { letter: "b", text: "Over-the-counter medicines" },
      { letter: "c", text: "Doctor's recommended medicine" },
      { letter: "d", text: "Pharmacist's Recommended Medicines" }
    ],
    correctAnswer: "c",
    explanation: "Doctor's recommended medicine is not a formal drug classification."
  },
  {
    id: 39,
    question: "Which of the following does NOT include the roles and functions of the Registrar of Pharmacy Council?",
    options: [
      { letter: "a", text: "Publishing notices of cancellation of pharmacist's registration" },
      { letter: "b", text: "Publishing notices of supervision of pharmacist's registration" },
      { letter: "c", text: "Submitting complaints about pharmacists in breach of standards" },
      { letter: "d", text: "Paying salaries of registered pharmacists" }
    ],
    correctAnswer: "d",
    explanation: "The Registrar does not pay pharmacist salaries."
  },
  {
    id: 40,
    question: "Professional misconduct according to L.I.1645 include the following EXCEPT",
    options: [
      { letter: "a", text: "Dispensing unwholesome medicine" },
      { letter: "b", text: "Supplying medicines whilst not under influence of alcohol" },
      { letter: "c", text: "Convicted of a criminal offence involving fraud" },
      { letter: "d", text: "Willfully advising on wrong medication" }
    ],
    correctAnswer: "b",
    explanation: "Working sober is expected, not misconduct."
  },
  {
    id: 41,
    question: "The set of ethical rules and principles by a profession to which its members abide by is known as",
    options: [
      { letter: "a", text: "Professionalism" },
      { letter: "b", text: "Code of ethics" },
      { letter: "c", text: "Codes of profession" },
      { letter: "d", text: "Rules" }
    ],
    correctAnswer: "b",
    explanation: "Code of ethics defines professional conduct standards."
  },
  {
    id: 42,
    question: "The following are all Sexually Transmitted Infections (STIs) EXCEPT",
    options: [
      { letter: "a", text: "Gonorrhea" },
      { letter: "b", text: "Syphilis" },
      { letter: "c", text: "Rhinitis" },
      { letter: "d", text: "Chancroid" }
    ],
    correctAnswer: "c",
    explanation: "Rhinitis is inflammation of the nasal passages, not an STI."
  },
  {
    id: 43,
    context: "Label:\n18/11/20\nSyrup Paracetamol\nTake 5mg three (3) times daily for five (5) days After meals\nPatient's name: Rosemary Appiah",
    question: "What do you find wrong on the Label above?",
    options: [
      { letter: "a", text: "The dosage form of the drug is not stated" },
      { letter: "b", text: "The date of dispensing the medicine is not stated" },
      { letter: "c", text: "The dosage is wrong" },
      { letter: "d", text: "There is nothing wrong with the label" }
    ],
    correctAnswer: "c",
    explanation: "5mg is incorrect for syrup paracetamol; it should be 5ml."
  },
  {
    id: 44,
    question: "Which is the right way to prepare Oral Rehydrating Salt (ORS)?",
    options: [
      { letter: "a", text: "Boil 600ml of water, cool, dissolve 2 sachets of ORS, stir till dissolved" },
      { letter: "b", text: "Boil water, measure 600ml, cool, dissolve 2 sachets of ORS, stir till dissolved" },
      { letter: "c", text: "Boil water, measure 600ml, dissolve 1 sachet of ORS, stir till dissolved" },
      { letter: "d", text: "Boil 600ml of water, cool, dissolve 1 sachet of ORS, stir till dissolved" }
    ],
    correctAnswer: "d",
    explanation: "1 sachet ORS is dissolved in 600ml of cooled boiled water."
  },
  {
    id: 45,
    question: "Ten (10) drops of water from a medicine dropper is equivalent to 2ml. How many drops will give you 0.6ml?",
    options: [
      { letter: "a", text: "10" },
      { letter: "b", text: "30" },
      { letter: "c", text: "3" },
      { letter: "d", text: "6" }
    ],
    correctAnswer: "c",
    explanation: "10 drops = 2ml, so 1ml = 5 drops, 0.6ml = 3 drops."
  },
  {
    id: 46,
    question: "If the dosage for a medication is 2 tablets every 4 hours, how many tablets can be taken in a week?",
    options: [
      { letter: "a", text: "12" },
      { letter: "b", text: "6" },
      { letter: "c", text: "84" },
      { letter: "d", text: "2" }
    ],
    correctAnswer: "c",
    explanation: "2 tablets × 6 times/day × 7 days = 84 tablets."
  },
  {
    id: 47,
    question: "If you receive a prescription which reads 20mls t.i.d X5/7 and the medicine is packaged as 60ml, 150ml, 250ml and 300ml. Which is most appropriate?",
    options: [
      { letter: "a", text: "300ml" },
      { letter: "b", text: "60ml" },
      { letter: "c", text: "150ml" },
      { letter: "d", text: "250ml" }
    ],
    correctAnswer: "a",
    explanation: "20ml × 3 times × 5 days = 300ml needed."
  },
  {
    id: 48,
    question: "You have received a prescription for betadine topical preparation. Which instruction is most appropriate?",
    options: [
      { letter: "a", text: "To be taken with water" },
      { letter: "b", text: "Not to be chewed but swallowed" },
      { letter: "c", text: "To be inserted deep into the vagina" },
      { letter: "d", text: "Apply thinly to the affected part" }
    ],
    correctAnswer: "d",
    explanation: "Topical preparations are applied externally to the skin."
  },
  {
    id: 49,
    question: "A patient reports with headache, fever, loss of smell and taste, and diarrhea. What is the most likely diagnosis?",
    options: [
      { letter: "a", text: "Malaria" },
      { letter: "b", text: "Cholera" },
      { letter: "c", text: "Corona virus" },
      { letter: "d", text: "SARS-CoV-2 COVID-19" }
    ],
    correctAnswer: "d",
    explanation: "Loss of smell/taste with these symptoms is characteristic of COVID-19."
  },
  {
    id: 50,
    question: "How will you manage the patient with the symptoms above (headache, fever, loss of smell/taste, diarrhea)?",
    options: [
      { letter: "a", text: "Artemether/lumefantrine, paracetamol and multivitamin" },
      { letter: "b", text: "ORS, zinc tablet, loperamide" },
      { letter: "c", text: "Vitamin C, zinc tablet, nasal drops" },
      { letter: "d", text: "Vitamin C, zinc tablet, self isolation, refer to hospital" }
    ],
    correctAnswer: "d",
    explanation: "COVID-19 requires supportive care, isolation, and hospital referral."
  }
];
