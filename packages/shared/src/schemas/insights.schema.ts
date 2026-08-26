import { z } from 'zod';

export const InsightToneSchema = z.enum(['positive', 'neutral', 'nudge']);
export type InsightTone = z.infer<typeof InsightToneSchema>;

export const InsightCardSchema = z.object({
  id: z.string(),
  emoji: z.string(),
  message: z.string(),
  tone: InsightToneSchema,
});
export type InsightCard = z.infer<typeof InsightCardSchema>;

export const InsightsResponseSchema = z.object({
  cards: z.array(InsightCardSchema),
});
export type InsightsResponse = z.infer<typeof InsightsResponseSchema>;
