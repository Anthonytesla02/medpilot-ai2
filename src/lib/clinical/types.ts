import type { Encounter, Decisions, ClinicalEvent, ChallengeCategory } from '../../../supabase/functions/_shared/clinical';
import type { evaluateAttempt, checkSafety } from '../../../supabase/functions/_shared/evaluate';
export type { Encounter, Decisions, Character, Order, ChallengeCategory, BodyRegion, ClinicalScene, ClinicalEvent } from '../../../supabase/functions/_shared/clinical';
export type ClinicalResult = ReturnType<typeof evaluateAttempt>;
export type SafetyResult = ReturnType<typeof checkSafety> & { treatmentComparison?: { score: number; feedback: string } };
export interface Attempt { id: string; revision: number; mode: string; status: string; decisions: Decisions; events: ClinicalEvent[]; result: ClinicalResult | null; deadline_at: string | null }
export interface SessionData { attempt: Attempt; encounter: Encounter; caseKey: string; title: string; specialty: string; reviewStatus: string; expired?: boolean }
export interface LibraryCase { id: string; key: string; title: string; specialty: string; reviewStatus: string; difficulty: string; characters: Encounter['characters']; emergency: boolean; procedural: boolean; category?: ChallengeCategory }