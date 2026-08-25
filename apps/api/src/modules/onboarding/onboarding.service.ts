import type { PrismaClient } from '@prisma/client';
import type {
  MeResponse,
  UpdateAllergiesRequest,
  UpdateDietRequest,
  UpdateGoalsRequest,
  UpdateHealthConditionsRequest,
} from '@fitness-app/shared';
import { getMe } from '../users/users.service';
import { calculateTargets } from './calorie-targets';

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

  await prisma.profile.upsert({
    where: { userId },
    update: {
      onboardingCompletedAt: new Date(),
      ...(targets ?? {}),
    },
    create: {
      userId,
      onboardingCompletedAt: new Date(),
      ...(targets ?? {}),
    },
  });

  return getMe(prisma, userId);
}
