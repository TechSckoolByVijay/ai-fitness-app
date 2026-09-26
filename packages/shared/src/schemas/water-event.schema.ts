import { z } from 'zod';
import { TimePrecisionSchema } from './enums.schema';

/**
 * Water named in a spoken/typed log ("…and about 3 litres of water"). Kept
 * separate from food because water has its own table and its own Home card —
 * it has no calories to review, just an amount.
 */
export const WaterExtractionEventSchema = z.object({
  type: z.literal('water'),
  timestamp: z.string().min(1),
  /** "day" for a day's total ("3 litres today"), whose timestamp only carries the date. */
  timePrecision: TimePrecisionSchema.optional(),
  amountMl: z.number().int().positive().max(10_000),
});
export type WaterExtractionEvent = z.infer<typeof WaterExtractionEventSchema>;

export const InterpretedWaterSchema = z.object({
  amountMl: z.number().int().positive(),
  loggedAt: z.string().min(1),
  sourceText: z.string().optional(),
});
export type InterpretedWater = z.infer<typeof InterpretedWaterSchema>;
