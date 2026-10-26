import type { Encounter, Decisions } from '../../../supabase/functions/_shared/clinical';
import type { evaluateAttempt, checkSafety } from '../../../supabase/functions/_shared/evaluate';
export type { Encounter, Decisions, Character, Order } from '../../../supabase/functions/_shared/clinical';
export type ClinicalResult = ReturnType<typeof evaluateAttempt>;
export type SafetyResult = ReturnType<typeof checkSafety>;
export interface Attempt { id: string; revision: number; mode: string; status: string; decisions: Decisions; events: { id: string; kind: string; at: string }[]; result: ClinicalResult | null; deadline_at: string | null }
export interface SessionData { attempt: Attempt; encounter: Encounter; caseKey: string; title: string; specialty: string; reviewStatus: string; expired?: boolean }
export interface LibraryCase { id: string; key: string; title: string; specialty: string; reviewStatus: string; difficulty: string; characters: Encounter['characters']; emergency: boolean; procedural: boolean }