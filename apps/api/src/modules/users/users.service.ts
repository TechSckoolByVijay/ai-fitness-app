import type { PrismaClient } from '@prisma/client';
import type { MeResponse, UpdateProfileRequest } from '@fitness-app/shared';
import { NotFoundError } from '../../lib/errors';

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export async function getMe(prisma: PrismaClient, userId: string): Promise<MeResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      goals: true,
      dietPreference: true,
      allergies: true,
      healthConditions: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profilePhotoUrl: user.profilePhotoUrl,
    profile: {
      dateOfBirth: user.profile?.dateOfBirth?.toISOString() ?? null,
      sex: user.profile?.sex ?? null,
      heightCm: toNumber(user.profile?.heightCm),
      currentWeightKg: toNumber(user.profile?.currentWeightKg),
      targetWeightKg: toNumber(user.profile?.targetWeightKg),
      activityLevel: user.profile?.activityLevel ?? null,
      waterTargetMl: user.profile?.waterTargetMl ?? null,
      calorieTarget: user.profile?.calorieTarget ?? null,
      proteinTarget: user.profile?.proteinTarget ?? null,
      onboardingCompletedAt: user.profile?.onboardingCompletedAt?.toISOString() ?? null,
    },
    goals: user.goals.map((g) => ({ type: g.type, isPrimary: g.isPrimary })),
    dietPreference: user.dietPreference
      ? { dietType: user.dietPreference.dietType, otherText: user.dietPreference.otherText }
      : null,
    allergies: user.allergies.map((a) => ({ type: a.type, otherText: a.otherText })),
    healthConditions: user.healthConditions.map((h) => ({
      type: h.type,
      otherText: h.otherText,
    })),
  };
}

export async function updateProfile(
  prisma: PrismaClient,
  userId: string,
  input: UpdateProfileRequest,
): Promise<MeResponse> {
  await prisma.profile.upsert({
    where: { userId },
    update: {
      ...(input.dateOfBirth !== undefined ? { dateOfBirth: new Date(input.dateOfBirth) } : {}),
      ...(input.sex !== undefined ? { sex: input.sex } : {}),
      ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
      ...(input.currentWeightKg !== undefined ? { currentWeightKg: input.currentWeightKg } : {}),
      ...(input.targetWeightKg !== undefined ? { targetWeightKg: input.targetWeightKg } : {}),
      ...(input.activityLevel !== undefined ? { activityLevel: input.activityLevel } : {}),
    },
    create: {
      userId,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      sex: input.sex,
      heightCm: input.heightCm,
      currentWeightKg: input.currentWeightKg,
      targetWeightKg: input.targetWeightKg,
      activityLevel: input.activityLevel,
    },
  });

  return getMe(prisma, userId);
}
