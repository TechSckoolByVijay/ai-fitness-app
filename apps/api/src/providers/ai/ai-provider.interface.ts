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
  frequentFoods: string[];
  todaysMealsSummary: string[];
}

export interface CoachChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  extractHealthEvents(input: { text: string; nowISO: string }): Promise<HealthExtractionResult>;
  coachChat(input: { messages: CoachChatMessage[]; context: CoachContextInput }): Promise<string>;
}
