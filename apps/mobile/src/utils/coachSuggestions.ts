/**
 * Picks which quick-suggestion chips to show on the Coach screen, purely
 * from the clock — no AI call involved in choosing them (only tapping one
 * spends a token, by sending it as a normal message). Keeps suggestions
 * from being tone-deaf to the time of day, e.g. never offering a dinner
 * idea at breakfast or a snack right at dinner time.
 */
export function getContextualCoachPrompts(now: Date = new Date()): string[] {
  const hour = now.getHours();

  if (hour >= 5 && hour < 11) {
    return ['Suggest a breakfast idea', 'I want a high-protein breakfast', "What's my calorie budget left today?"];
  }
  if (hour >= 11 && hour < 15.5) {
    return ['Suggest a lunch idea', 'I want a light lunch', "What's my calorie budget left today?"];
  }
  if (hour >= 15.5 && hour < 18.5) {
    return ['Suggest a healthy snack', 'Any high-protein snack ideas?', "What's my calorie budget left today?"];
  }
  if (hour >= 18.5 && hour < 22) {
    return ['Suggest a dinner idea', 'I want a high-protein dinner', "What's my calorie budget left today?"];
  }
  return ['Any light bedtime snack ideas?', 'How did I do with my goal today?', "What's my calorie budget left today?"];
}
