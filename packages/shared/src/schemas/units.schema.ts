import { z } from 'zod';

/**
 * Display preference only. Heights and weights are always stored and
 * transported in metric; see packages/shared/src/utils/units.ts.
 */
export const UnitSystemSchema = z.enum(['metric', 'imperial']);
