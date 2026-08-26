import type { PrismaClient } from '@prisma/client';
import type {
  MeResponse,
  UpdateAllergiesRequest,
  UpdateDietRequest,
  UpdateGoalsRequest,
  UpdateHealthConditionsRequest,
} from '@fitness-app/shared';
import { getMe } from '../users/users.service';
import { recalculateProfileTargets } from './recalculate-targets';

export async function updateGoals(
  prisma: PrismaClient,
  userId: string,
  input: UpdateGoalsRequest,
): Promise<MeResponse> {
  await prisma.$transaction([
    prisma.goal.deleteMany({ where: { userId } }),
    prisma.goal.createMany({
      data: [
        { userId, type: input.primaryGoal, isPrimary: true },
        ...(input.secondaryGoals ?? []).map((type) => ({ userId, type, isPrimary: false })),
      ],
    }),
  ]);
  // The primary goal feeds the calorie-target adjustment (e.g. lose_weight
  // -500 kcal) — recompute so changing it doesn't leave targets stale.
  await recalculateProfileTargets(prisma, userId);
  return getMe(prisma, userId);
}

export async function updateDiet(
  prisma: PrismaClient,
  userId: string,
  input: UpdateDietRequest,
): Promise<MeResponse> {
  await prisma.dietPreference.upsert({
    where: { userId },
    update: { dietType: input.dietType, otherText: input.otherText ?? null },
    create: { userId, dietType: input.dietType, otherText: input.otherText ?? null },
  });
  return getMe(prisma, userId);
}

export async function updateAllergies(
  prisma: PrismaClient,
  userId: string,
  input: UpdateAllergiesRequest,
): Promise<MeResponse> {
  await prisma.$transaction([
    prisma.allergy.deleteMany({ where: { userId } }),
    prisma.allergy.createMany({
      data: input.allergies.map((a) => ({ userId, type: a.type, otherText: a.otherText ?? null })),
    }),
  ]);
  return getMe(prisma, userId);
}

export async function updateHealthConditions(
  prisma: PrismaClient,
  userId: string,
  input: UpdateHealthConditionsRequest,
): Promise<MeResponse> {
  await prisma.$transaction([
    prisma.healthCondition.deleteMany({ where: { userId } }),
    prisma.healthCondition.createMany({
      data: input.conditions.map((c) => ({
        userId,
        type: c.type,
        otherText: c.otherText ?? null,
      })),
    }),
  ]);
  return getMe(prisma, userId);
}

export async function completeOnboarding(prisma: PrismaClient, userId: string): Promise<MeResponse> {
  await prisma.profile.upsert({
    where: { userId },
    update: { onboardingCompletedAt: new Date() },
    create: { userId, onboardingCompletedAt: new Date() },
  });

  await recalculateProfileTargets(prisma, userId);

  return getMe(prisma, userId);
}
