import { z } from 'zod';

export const CreateWaterEntryRequestSchema = z.object({
  amountMl: z.number().int().positive(),
  loggedAt: z.string().min(1),
});
export type CreateWaterEntryRequest = z.infer<typeof CreateWaterEntryRequestSchema>;

export const WaterEntryDtoSchema = CreateWaterEntryRequestSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
});
export type WaterEntryDto = z.infer<typeof WaterEntryDtoSchema>;

export const WaterEntriesResponseSchema = z.object({
  entries: z.array(WaterEntryDtoSchema),
});
export type WaterEntriesResponse = z.infer<typeof WaterEntriesResponseSchema>;
