import { z } from 'zod';

export const EXPORT_MAX_DAYS = 366;

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

/**
 * Either the last N days (ending today, in the user's time zone) or an
 * explicit inclusive date range. Dates are the user's own calendar dates.
 */
export const ExportQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(EXPORT_MAX_DAYS).optional(),
    from: IsoDateSchema.optional(),
    to: IsoDateSchema.optional(),
    /**
     * The device's IANA zone. Used when the profile has none on record —
     * it is only captured today when push notifications are set up.
     */
    tz: z.string().max(64).optional(),
  })
  .refine((q) => q.days !== undefined || q.from !== undefined, {
    message: 'Pass either days, or from (and optionally to)',
  })
  .refine((q) => !(q.days !== undefined && q.from !== undefined), {
    message: 'Pass days or from/to, not both',
  });
export type ExportQuery = z.infer<typeof ExportQuerySchema>;

export const ExportKindSchema = z.enum(['food', 'days']);
export type ExportKind = z.infer<typeof ExportKindSchema>;
