import type { HealthExtractionResult } from '@fitness-app/shared';

/**
 * Everything a coach reply needs to be grounded in the user's actual state —
 * built deterministically by coach-context.service.ts, never by the LLM
 * itself, so budget/diet/allergy facts can't drift or be hallucinated.
 */
export interface CoachContextInput {
  calorieTarget: number | null;
  proteinTarget: number | null;
  caloriesConsumedToday: number;
  proteinConsumedToday: number;
  activeCaloriesBurnedToday: number;
  /** calorieTarget - caloriesConsumedToday + activeCaloriesBurnedToday, or null if no target is set. */
  remainingCalories: number | null;
  dietType: string | null;
  dietOtherText: string | null;
  allergies: string[];
  /** Onboarding-reported conditions (e.g. "diabetes", "hypertension") — used to keep suggestions from ignoring a real medical context, never to diagnose or prescribe. */
  healthConditions: string[];
  frequentFoods: string[];
  todaysMealsSummary: string[];
  /** The user's primary goal (lose_weight, gain_muscle, ...) — suggestions must fit it, e.g. no ghee-heavy dishes for weight loss. */
  primaryGoal: string | null;
  /** The user's local hour (0-23), sent by the client — the server clock is UTC and useless for "is it breakfast time". Null if the client didn't send it. */
  localHour: number | null;
  /** Snippets of previous coach suggestions the user explicitly disliked — never suggest these or close variants again. */
  dislikedSuggestions: string[];
  /** Snippets of previous coach suggestions the user explicitly liked — more like these is welcome. */
  likedSuggestions: string[];
}

export interface CoachChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  /** Exactly one of `text`/`imageBase64` is present — enforced by the shared request schema before this is called. */
  extractHealthEvents(input: {
    text?: string;
    imageBase64?: string;
    nowISO: string;
  }): Promise<HealthExtractionResult>;
  coachChat(input: { messages: CoachChatMessage[]; context: CoachContextInput }): Promise<string>;
}
