export const queryKeys = {
  me: ['me'] as const,
  dashboardToday: ['dashboard', 'today'] as const,
  foodEntries: (date?: string) => ['food', 'entries', date ?? 'all'] as const,
  exerciseEntries: (date?: string) => ['exercise', 'entries', date ?? 'all'] as const,
  coachConversation: ['coach', 'conversation'] as const,
};
