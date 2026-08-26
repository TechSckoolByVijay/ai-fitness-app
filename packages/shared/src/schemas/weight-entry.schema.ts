import { z } from 'zod';

export const CreateWeightEntryRequestSchema = z.object({
  weightKg: z.number().positive(),
  loggedAt: z.string().min(1),
});
export type CreateWeightEntryRequest = z.infer<typeof CreateWeightEntryRequestSchema>;

export const WeightEntryDtoSchema = CreateWeightEntryRequestSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
});
export type WeightEntryDto = z.infer<typeof WeightEntryDtoSchema>;

export const WeightEntriesResponseSchema = z.object({
  entries: z.array(WeightEntryDtoSchema),
});
export type WeightEntriesResponse = z.infer<typeof WeightEntriesResponseSchema>;
