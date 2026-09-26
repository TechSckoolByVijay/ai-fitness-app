const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  couple: 2,
  few: 2,
};

const VAGUE_QUANTITY_WORDS = ['some', 'a bit of', 'a little', 'few', 'a few'];

const UNIT_WORDS = [
  'grams',
  'gram',
  'g',
  'kg',
  'ml',
  'bowls',
  'bowl',
  'cups',
  'cup',
  'glasses',
  'glass',
  'teaspoons',
  'teaspoon',
  'tablespoons',
  'tablespoon',
  'medium',
  'small',
  'large',
  'pieces',
  'piece',
  'whole',
  'plate',
  'plates',
  'serving',
  'servings',
];

export interface ParsedQuantity {
  quantity: number;
  unit: string | null;
  explicit: boolean;
  estimatedWeightGrams?: number;
}

export function parseQuantity(phrase: string): ParsedQuantity {
  const lower = phrase.toLowerCase();

  const numericMatch = lower.match(/(\d+(?:\.\d+)?)\s*(kg|g|grams|gram|ml)?/);
  if (numericMatch) {
    const value = parseFloat(numericMatch[1]);
    const unitToken = numericMatch[2];
    if (unitToken) {
      const grams = unitToken === 'kg' ? value * 1000 : value;
      return {
        quantity: value,
        unit: unitToken === 'kg' ? 'g' : unitToken,
        explicit: true,
        estimatedWeightGrams: unitToken === 'ml' ? undefined : grams,
      };
    }
    // Bare number ("2 chapatis") — look for a unit word elsewhere in the phrase.
    const unit = UNIT_WORDS.find((u) => new RegExp(`\\b${u}\\b`).test(lower)) ?? null;
    return { quantity: value, unit, explicit: true };
  }

  if (VAGUE_QUANTITY_WORDS.some((w) => lower.includes(w))) {
    const unit = UNIT_WORDS.find((u) => new RegExp(`\\b${u}\\b`).test(lower)) ?? null;
    return { quantity: 1, unit, explicit: false };
  }

  const wordMatch = Object.keys(WORD_NUMBERS).find((word) =>
    new RegExp(`\\b${word}\\b`).test(lower),
  );
  const unit = UNIT_WORDS.find((u) => new RegExp(`\\b${u}\\b`).test(lower)) ?? null;
  if (wordMatch) {
    return { quantity: WORD_NUMBERS[wordMatch], unit, explicit: true };
  }

  // No quantity language at all — treat as a single implicit serving.
  return { quantity: 1, unit, explicit: false };
}

export interface ParsedDescriptors {
  preparationMethod?: string;
  spiceLevel?: 'mild' | 'medium' | 'spicy';
  descriptors: string[];
}

export function parseDescriptors(phrase: string): ParsedDescriptors {
  const lower = phrase.toLowerCase();
  const descriptors: string[] = [];
  let preparationMethod: string | undefined;
  let spiceLevel: 'mild' | 'medium' | 'spicy' | undefined;

  if (/less[- ]oily/.test(lower)) {
    preparationMethod = 'less_oily';
    descriptors.push('less oily');
  } else if (/more[- ]oily|extra[- ]oily/.test(lower)) {
    preparationMethod = 'more_oily';
    descriptors.push('more oily');
  } else if (/\bdry\b/.test(lower)) {
    preparationMethod = 'dry';
    descriptors.push('dry');
  }

  if (/medium[- ]spicy/.test(lower)) {
    spiceLevel = 'medium';
    descriptors.push('medium spicy');
  } else if (/\bspicy\b/.test(lower)) {
    spiceLevel = 'spicy';
    descriptors.push('spicy');
  } else if (/\bmild\b/.test(lower)) {
    spiceLevel = 'mild';
    descriptors.push('mild');
  }

  return { preparationMethod, spiceLevel, descriptors };
}

export function splitIntoItemPhrases(text: string): string[] {
  const withoutLeadIn = text
    .replace(/^\s*at\s+\d{1,2}(:\d{2})?\s*(o'?clock|am|pm)?\s*,?\s*/i, '')
    .replace(/\b(i ate|i had|i drank|i ate about|i had about)\b/gi, '')
    .trim();

  return withoutLeadIn
    .split(/,|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function extractTimeOverride(text: string): { hour: number; minute: number } | null {
  const match = text.match(/^\s*at\s+(\d{1,2})(:(\d{2}))?\s*(o'?clock|am|pm)?/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[3] ? parseInt(match[3], 10) : 0;
  const marker = match[4]?.toLowerCase();

  if (marker === 'pm' && hour < 12) hour += 12;
  if (marker === 'am' && hour === 12) hour = 0;

  return { hour, minute };
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'all_day';

export function inferMealType(text: string, hour: number): MealType {
  const lower = text.toLowerCase();
  if (/\bbreakfast\b/.test(lower)) return 'breakfast';
  if (/\blunch\b/.test(lower)) return 'lunch';
  if (/\bdinner\b/.test(lower)) return 'dinner';
  if (/\bsnack\b/.test(lower)) return 'snack';

  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 19) return 'snack';
  return 'dinner';
}

export function resolveTimestamp(text: string, nowISO: string): { iso: string; hour: number } {
  const now = new Date(nowISO);
  const override = extractTimeOverride(text);

  if (!override) {
    return { iso: now.toISOString(), hour: now.getHours() };
  }

  let { hour } = override;
  // "at 12 o'clock" / "at 1:30" with no am/pm marker and an afternoon-ish hour
  // is far more often a lunch/dinner time than the middle of the night.
  if (hour >= 1 && hour <= 7 && !/am|pm/i.test(text)) {
    hour += 12;
  }

  const resolved = new Date(now);
  resolved.setHours(hour, override.minute, 0, 0);
  return { iso: resolved.toISOString(), hour };
}

const WATER_PATTERN =
  /(\d+(?:\.\d+)?|a|one|two|three|four|five|six|seven|eight|nine|ten)\s*(litres?|liters?|l|glass(?:es)?|bottles?|ml)\s+(?:of\s+)?water\b/i;
const WATER_WORD_NUMBERS: Record<string, number> = {
  ...WORD_NUMBERS,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

/**
 * Pulls "3 litres of water" out of an utterance so it can be logged as water
 * rather than parsed as a food item. Returns the text with that phrase
 * removed, or null when no plain water is mentioned.
 */
export function extractWater(text: string): { amountMl: number; remainingText: string } | null {
  const match = WATER_PATTERN.exec(text);
  if (!match) return null;
  const count = WATER_WORD_NUMBERS[match[1].toLowerCase()] ?? Number(match[1]);
  const unit = match[2].toLowerCase();
  const perUnit = unit.startsWith('glass') ? 250 : unit === 'ml' ? 1 : 1000;
  const amountMl = Math.round(count * perUnit);
  if (!(amountMl > 0)) return null;
  // Stitch the sentence back together where the phrase was cut out:
  // "6 chapatis, [3 litres of water] and milk" -> "6 chapatis and milk".
  const remainingText = (text.slice(0, match.index) + text.slice(match.index + match[0].length))
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*(,\s*)+/g, ', ')
    .replace(/\s*,\s*and\b/gi, ' and')
    .replace(/\band\s+and\b/gi, 'and')
    .replace(/^[\s,]*(and\b)?|[\s,]*(\band)?[\s,.]*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { amountMl, remainingText };
}

/**
 * "Today I had 4 teas and 6 chapatis" — day totals with no meal named. Such
 * an utterance is logged as one all-day entry rather than forced into a meal.
 */
export function isWholeDayTotals(text: string): boolean {
  const lower = text.toLowerCase();
  const namesDay = /\b(today|yesterday|whole day|all day|throughout the day)\b/.test(lower);
  const namesMeal = /\b(breakfast|lunch|dinner|snack|morning|afternoon|evening|night)\b/.test(lower);
  return namesDay && !namesMeal;
}
