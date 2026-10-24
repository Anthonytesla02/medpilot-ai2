# Med Pilot AI clinical simulation

## What will change

Transform the existing Case Studies page into the complete clinical encounter in your brief, preserving Chat, Tests, Modules, sign-in, navigation, and existing accounts. Include a researched interaction reference layer rather than inventing a drug list or claiming a complete safety database.

## Drug interaction research

Ten source-backed examples have been recorded for integration, with ingredient pairs, specific risks, precautions, source links, scope limitations, retrieval date, and an explicit **needs clinical review** status:

| Pair | Documented concern | Source classification |
| --- | --- | --- |
| Warfarin + ibuprofen | Serious gastrointestinal bleeding | Clinical assessment and monitoring |
| Codeine + diazepam | Sedation and respiratory depression | Reserve concurrent use for cases without adequate alternatives |
| Lisinopril + spironolactone | Hyperkalemia | Potassium and renal monitoring |
| Clarithromycin + simvastatin | Myopathy and rhabdomyolysis | Contraindicated concurrent use |
| Sildenafil + nitroglycerin | Dangerous hypotension | Contraindicated concurrent use |
| Low-dose methotrexate + trimethoprim | Severe bone-marrow suppression | Avoid; specialist management if unavoidable |
| Fluoxetine + phenelzine | Serotonin syndrome | Contraindicated concurrent use; switching intervals matter |
| Warfarin + clarithromycin | Increased anticoagulation and bleeding risk | INR and clinical monitoring |
| Warfarin + ciprofloxacin | Enhanced anticoagulant effect | INR and bleeding monitoring |
| Warfarin + doxycycline | Increased anticoagulation and bleeding risk | INR and clinical monitoring |

Original guidance was fetched and checked. Sources include [DailyMed prescribing information](https://dailymed.nlm.nih.gov/), [NHS SPS methotrexate guidance](https://sps.nhs.uk/articles/managing-interactions-with-methotrexate/), [NHS SPS macrolide/statin guidance](https://sps.nhs.uk/articles/managing-interactions-between-macrolides-and-statins/), and the [MHRA warfarin safety reminder](https://www.gov.uk/government/news/warfarin-and-other-blood-thinners-reminder-on-safe-use-during-covid-19-pandemic).

These are attributed summaries, not a licensed comprehensive interaction dataset or a clinical review. No dose rules, automatic adverse events, or scoring penalties will be inferred from them. Unknown pairs will display **“Not covered by this reference set”**, never “safe.” Broader coverage, including additional rhythm, organ-toxicity and concentration interactions, requires further source-specific verification.

## Implementation

1. **Repair the remixed app connection first.** The current app still points at an old account connection. The managed server connection has been refreshed, but the app connection remains mismatched. Verify the canonical connection and authenticated reads before extending private records.
2. **Create a versioned reference and case foundation.** Reuse the existing brand/ingredient catalog. Add ingredient identifiers, formulations, evidence records, review status, structured patient/companion profiles, hidden findings, treatment requirements, case-specific rubrics, progression checkpoints and safety constraints. Keep answer keys private.
3. **Preserve and constrain AI generation.** Retain the existing generator. Generate narratives and case variations only from structured eligible templates; validate demographics, history, medicines, allergy data, observations and clinical rules. Unverified cases remain clearly labeled drafts and cannot award competitive points or verified achievements.
4. **Build the encounter workspace.** Display distinct patient and companion avatars; presenting complaint, history, medicines, allergies and vital signs; meaningful history/examination/investigation actions; differential and primary diagnosis entry. Provide a coordinated multi-panel desktop layout and sequential smaller-screen flow.
5. **Add medication orders and safety checks.** Search by brand, generic name and ingredient. Capture dose, units, route, frequency and duration when supported by reviewed rules. Distinguish selection, prescription and simulated administration. Check existing medicines plus every submitted order for ingredient duplication, documented pairs, allergies and case-specific contraindications; explain the evidence and coverage gaps.
6. **Implement trusted clinical evaluation.** Evaluate diagnosis aliases, investigations, complete treatment requirements, accepted alternatives, medication details, monitoring, referral, procedures and timing. Calculate configurable subscores and critical errors server-side. Keep patient outcomes separate from score bands; an interaction warning alone will not cause a fabricated adverse event.
7. **Add progression and specialist workflows.** Advance through condition-specific checkpoints. Injury cases include supplies, ordered procedural decisions, red flags, referral and aftercare. Emergency cases use scenario-specific deadlines, server timestamps and ordered actions; reject late actions and duplicate submissions. Learning-mode hints and challenge-mode penalties remain distinct.
8. **Connect the Identity Profile.** Persist attempts, submitted decisions, medication events, findings, scoring breakdown, safety errors, outcome, ruleset version and timestamps. Derive metrics, specialty/skill trends, streaks and challenge rating from trusted attempt records. Award explicit achievement criteria transactionally; retries create new attempts without duplicating previous awards.
9. **Verify the full experience.** Test complete/incomplete/wrong treatment, high score with critical error, interactions, allergy/contraindication, injury, timed emergency, mother-and-child encounters, retries and persistence. Exercise the authenticated UI and confirm saved results and IDP read back correctly; check keyboard access, reduced motion and desktop/mobile layouts.

## Clinical safety and external dependencies

- The experience is a synthetic-patient educational simulator, not real-world prescribing or diagnosis.
- No separate attached drug list was supplied; the existing app catalog contains brand names, ingredients and categories, not dosing or safety rules.
- Source-backed content is **not** automatically clinician-reviewed. A qualified clinical reviewer must verify case protocols, dose rules, safety overrides and modeled outcomes before those records are labeled clinically reviewed or become eligible for competitive scoring and achievements.
- Establish reuse permissions before importing any third-party dataset wholesale; retain short attributed summaries and source links for the current research.
- The remaining app connection mismatch must be resolved through the managed Cloud connection before authenticated end-to-end verification can be claimed.

## Technical details

- Keep React/Vite and the existing design-system controls and theme tokens.
- Separate patient display, reference lookup, clinical evaluation, progression, procedure workflows, timers and profile reporting into focused modules.
- Store private cases/rules and user-owned attempts with explicit grants and row-level access controls; allow only trusted server operations to write scores and awards.
- Use versioned JSON structures where appropriate rather than duplicating every case field into unnecessary tables. Add unique submission and award keys, transaction boundaries and lifecycle checks.
- Missing clinical evidence produces an explicit unevaluated result; neither AI text nor browser events may become authoritative scores, badges or clinical outcome rules.