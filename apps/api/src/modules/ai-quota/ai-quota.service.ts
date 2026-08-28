import type { PrismaClient } from '@prisma/client';
import { QuotaExceededError } from '../../lib/errors';
import { toDateOnly } from '../daily-summary';

export type AiUsageKind = 'interpret' | 'coach';

/**
 * Increments the user's daily counter for an AI-backed call and throws 429
 * once the limit is passed. Increment-then-check (not check-then-increment)
 * so concurrent requests can't slip past the limit — worst case the counter
 * records a few attempts beyond it, which is harmless.
 */
export async function consumeAiQuota(
  prisma: PrismaClient,
  userId: string,
  kind: AiUsageKind,
  dailyLimit: number,
): Promise<void> {
  const today = toDateOnly(new Date());
  const usage = await prisma.aiUsage.upsert({
    where: { userId_date_kind: { userId, date: today, kind } },
    create: { userId, date: today, kind, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (usage.count > dailyLimit) {
    throw new QuotaExceededError();
  }
}
