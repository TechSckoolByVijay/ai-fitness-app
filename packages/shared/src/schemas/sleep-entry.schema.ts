import { z } from 'zod';

export const CreateSleepEntryRequestSchema = z.object({
  sleptAt: z.string().min(1),
  wokeAt: z.string().min(1),
});
export type CreateSleepEntryRequest = z.infer<typeof CreateSleepEntryRequestSchema>;

/** durationMin is always computed server-side from sleptAt/wokeAt — never trusted from the client. */
export const SleepEntryDtoSchema = z.object({
  id: z.string().uuid(),
  sleptAt: z.string(),
  wokeAt: z.string(),
  durationMin: z.number().int().nonnegative(),
  source: z.string(),
  createdAt: z.string(),
});
export type SleepEntryDto = z.infer<typeof SleepEntryDtoSchema>;

export const SleepEntriesResponseSchema = z.object({
  entries: z.array(SleepEntryDtoSchema),
});
export type SleepEntriesResponse = z.infer<typeof SleepEntriesResponseSchema>;
