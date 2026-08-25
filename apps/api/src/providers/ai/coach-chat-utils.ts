import type { CoachChatMessage, CoachContextInput } from './ai-provider.interface';

interface CuratedDish {
  name: string;
  vegetarian: boolean;
  allergens: string[];
  approxCalories: number;
  tags: string[];
  recipeSteps: string[];
}

const CURATED_DISHES: CuratedDish[] = [
  {
    name: 'Peanut Chikki',
    vegetarian: true,
    allergens: ['peanuts'],
    approxCalories: 160,
    tags: ['peanut', 'sweet', 'snack', 'evening'],
    recipeSteps: [
      'Dry-roast 1 cup peanuts until fragrant, then let them cool and rub off the skins.',
      'Melt 1/2 cup jaggery in a pan on low heat, stirring until it turns into a thick syrup.',
      'Mix in the roasted peanuts quickly and stir to coat evenly.',
      'Pour the mixture onto a greased plate or surface and flatten it with a rolling pin.',
      'While still warm, score it into squares; let it cool completely before breaking apart.',
    ],
  },
  {
    name: 'Roasted Peanut Chaat',
    vegetarian: true,
    allergens: ['peanuts'],
    approxCalories: 180,
    tags: ['peanut', 'savory', 'snack', 'evening', 'less spicy'],
    recipeSteps: [
      'Dry-roast 1 cup peanuts and let them cool slightly.',
      'Finely chop half an onion, one tomato, and a few coriander leaves.',
      'Toss the peanuts with the chopped vegetables in a bowl.',
      'Add a squeeze of lemon juice, a pinch of salt, and a light dash of chaat masala (skip chili powder to keep it mild).',
      'Mix well and serve immediately while the peanuts are still crunchy.',
    ],
  },
  {
    name: 'Peanut Butter Toast',
    vegetarian: true,
    allergens: ['peanuts', 'gluten'],
    approxCalories: 210,
    tags: ['peanut', 'sweet', 'snack', 'quick'],
    recipeSteps: [
      'Toast 2 slices of whole wheat bread until lightly golden.',
      'Spread a tablespoon of peanut butter evenly on each slice.',
      'Optionally add banana slices on top for extra sweetness.',
      'Cut diagonally and serve right away.',
    ],
  },
  {
    name: 'Sprouts Salad',
    vegetarian: true,
    allergens: [],
    approxCalories: 120,
    tags: ['salad', 'snack', 'light', 'less spicy', 'evening'],
    recipeSteps: [
      'Steam 1 cup mixed sprouts (moong, chana) for 4-5 minutes until just tender.',
      'Let them cool, then toss with chopped cucumber, tomato, and onion.',
      'Add a squeeze of lemon juice, a pinch of salt, and a light sprinkle of roasted cumin powder.',
      'Mix well and serve chilled or at room temperature.',
    ],
  },
  {
    name: 'Moong Dal Chilla',
    vegetarian: true,
    allergens: [],
    approxCalories: 150,
    tags: ['savory', 'snack', 'evening', 'protein'],
    recipeSteps: [
      'Soak 1 cup split moong dal for 2-3 hours, then grind into a smooth batter with a little water.',
      'Add finely chopped onion, coriander, ginger, and a pinch of salt to the batter.',
      'Heat a non-stick pan, pour a ladle of batter and spread it into a thin round.',
      'Cook on medium heat with a few drops of oil until golden on both sides.',
      'Serve hot with mint chutney or plain yogurt.',
    ],
  },
  {
    name: 'Grilled Chicken Skewers',
    vegetarian: false,
    allergens: [],
    approxCalories: 220,
    tags: ['protein', 'snack', 'evening', 'non-vegetarian'],
    recipeSteps: [
      'Cut 200g chicken breast into cubes and marinate with yogurt, ginger-garlic paste, and mild spices for 30 minutes.',
      'Thread the pieces onto skewers.',
      'Grill or pan-sear on medium-high heat, turning occasionally, until cooked through (about 10-12 minutes).',
      'Serve with a side of mint chutney or lemon wedges.',
    ],
  },
];

function extractMentionedIngredients(message: string): string[] {
  const lower = message.toLowerCase();
  const known = ['peanut', 'peanuts', 'chicken', 'paneer', 'egg', 'eggs', 'dal', 'moong'];
  return known.filter((word) => lower.includes(word));
}

function dishAllowed(dish: CuratedDish, context: CoachContextInput): boolean {
  if (context.dietType === 'vegetarian' || context.dietType === 'vegan' || context.dietType === 'eggetarian') {
    if (!dish.vegetarian) return false;
  }
  const blockedAllergens = context.allergies.map((a) => a.toLowerCase());
  return !dish.allergens.some((allergen) => blockedAllergens.includes(allergen));
}

function findRecentlySuggestedDish(messages: CoachChatMessage[]): CuratedDish | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== 'assistant') continue;
    const match = CURATED_DISHES.find((dish) => message.content.includes(dish.name));
    if (match) return match;
  }
  return null;
}

function isRecipeFollowUp(message: string): boolean {
  return /\b(recipe|steps|how do i make|how to make|instructions)\b/i.test(message);
}

function isSuggestionRequest(message: string): boolean {
  return /\b(suggest|recommend|dish|snack|meal|make|prepare|cook|eat)\b/i.test(message);
}

function formatBudgetLine(context: CoachContextInput): string {
  if (context.remainingCalories === null) {
    return "You haven't set a calorie target yet, so I can't estimate your remaining budget precisely.";
  }
  return `You have about ${Math.round(context.remainingCalories)} kcal left in today's budget.`;
}

/**
 * Rule-based stand-in for a real conversational LLM (mirrors the mock
 * food/exercise parsers — deliberately covers the suggestion -> follow-up
 * recipe flow so the full Coach UX is exercisable without an API key).
 */
export function mockCoachReply(messages: CoachChatMessage[], context: CoachContextInput): string {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const text = lastUserMessage?.content ?? '';

  if (isRecipeFollowUp(text)) {
    const dish = findRecentlySuggestedDish(messages);
    if (dish) {
      const steps = dish.recipeSteps.map((step, index) => `${index + 1}. ${step}`).join('\n');
      return `Here's how to make ${dish.name}:\n\n${steps}`;
    }
    return "I don't have a dish in mind yet — tell me what you're in the mood for and I'll suggest one first!";
  }

  if (isSuggestionRequest(text)) {
    const mentioned = extractMentionedIngredients(text);
    const candidates = CURATED_DISHES.filter((dish) => dishAllowed(dish, context));
    const withIngredient = mentioned.length
      ? candidates.filter((dish) => mentioned.some((word) => dish.tags.includes(word.replace(/s$/, ''))))
      : [];
    const pool = withIngredient.length ? withIngredient : candidates;
    const withinBudget =
      context.remainingCalories !== null
        ? pool.filter((dish) => dish.approxCalories <= context.remainingCalories!)
        : pool;
    const dish = (withinBudget.length ? withinBudget : pool)[0];

    if (!dish) {
      return `${formatBudgetLine(context)} I couldn't find a suggestion matching your preferences right now — could you tell me a bit more about what you'd like?`;
    }

    return `${formatBudgetLine(context)} How about ${dish.name} (~${dish.approxCalories} kcal)? Let me know if you'd like the recipe.`;
  }

  return `${formatBudgetLine(context)} Ask me for a meal or snack suggestion any time, or tell me what you'd like to eat and I can help plan around your budget.`;
}
