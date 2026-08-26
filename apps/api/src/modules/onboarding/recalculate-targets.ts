import type { PrismaClient } from '@prisma/client';
import { calculateTargets } from './calorie-targets';

/**
 * Re-derives calorie/protein/water targets from the profile's current state
 * (spec principle #7 — personalized recommendations should track the user's
 * real state). Called after onboarding completes, and again any time body
 * info, weight, or the primary goal changes afterward — not just once — so
 * targets never go stale. Reads everything fresh from the DB rather than
 * taking values as parameters, so any caller can invoke it after whatever
 * field it just changed, without needing to know the others.
 */
export async function recalculateProfileTargets(prisma: PrismaClient, userId: string): Promise<void> {
  const [profile, primaryGoal] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.goal.findFirst({ where: { userId, isPrimary: true } }),
  ]);

  const targets = calculateTargets({
    sex: profile?.sex ?? null,
    dateOfBirth: profile?.dateOfBirth ?? null,
    heightCm: profile?.heightCm ? Number(profile.heightCm) : null,
    currentWeightKg: profile?.currentWeightKg ? Number(profile.currentWeightKg) : null,
    activityLevel: profile?.activityLevel ?? null,
    primaryGoal: primaryGoal?.type ?? null,
  });

  if (!targets) return;

  await prisma.profile.upsert({
    where: { userId },
    update: targets,
    create: { userId, ...targets },
  });
}
