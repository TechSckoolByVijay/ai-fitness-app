import { describe, expect, it } from 'vitest';
import { mockCoachReply } from '../../src/providers/ai/coach-chat-utils';
import type { CoachContextInput } from '../../src/providers/ai/ai-provider.interface';

const BASE_CONTEXT: CoachContextInput = {
  calorieTarget: 1800,
  proteinTarget: 90,
  caloriesConsumedToday: 1200,
  proteinConsumedToday: 40,
  activeCaloriesBurnedToday: 0,
  remainingCalories: 600,
  dietType: 'vegetarian',
  dietOtherText: null,
  allergies: [],
  frequentFoods: ['chapati', 'dal'],
  todaysMealsSummary: ['lunch: chapati, dal'],
};

describe('mockCoachReply', () => {
  it('suggests a vegetarian dish mentioning the requested ingredient', () => {
    const reply = mockCoachReply(
      [{ role: 'user', content: 'I want to prepare a dish for evening snacks with peanuts.' }],
      BASE_CONTEXT,
    );
    expect(reply.toLowerCase()).toContain('peanut');
  });

  it('never suggests a non-vegetarian dish for a vegetarian user', () => {
    for (let i = 0; i < 20; i++) {
      const reply = mockCoachReply([{ role: 'user', content: 'suggest a snack for me' }], BASE_CONTEXT);
      expect(reply.toLowerCase()).not.toContain('chicken');
    }
  });

  it('excludes dishes containing a listed allergen', () => {
    const context: CoachContextInput = { ...BASE_CONTEXT, allergies: ['peanuts'] };
    const reply = mockCoachReply(
      [{ role: 'user', content: 'suggest a dish with peanuts for me' }],
      context,
    );
    expect(reply.toLowerCase()).not.toContain('peanut chikki');
    expect(reply.toLowerCase()).not.toContain('roasted peanut chaat');
  });

  it('gives numbered recipe steps when asked as a follow-up to a suggested dish', () => {
    const messages = [
      { role: 'user' as const, content: 'suggest a dish with peanuts for me' },
      {
        role: 'assistant' as const,
        content: 'How about Peanut Chikki (~160 kcal)? Let me know if you would like the recipe.',
      },
      { role: 'user' as const, content: 'yes please give me the recipe' },
    ];
    const reply = mockCoachReply(messages, BASE_CONTEXT);
    expect(reply).toContain('1.');
    expect(reply).toContain('2.');
    expect(reply.toLowerCase()).toContain('peanut chikki');
  });

  it('mentions the remaining calorie budget in a generic reply', () => {
    const reply = mockCoachReply([{ role: 'user', content: 'hi there' }], BASE_CONTEXT);
    expect(reply).toContain('600');
  });

  it('asks a clarifying question when a recipe is requested with no prior suggested dish', () => {
    const reply = mockCoachReply([{ role: 'user', content: 'give me the recipe' }], BASE_CONTEXT);
    expect(reply.toLowerCase()).toContain('mood');
  });
});
