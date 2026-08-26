import type { Prisma, PrismaClient } from '@prisma/client';
import type { CreateWeightEntryRequest, WeightEntriesResponse, WeightEntryDto } from '@fitness-app/shared';
import { NotFoundError } from '../../lib/errors';
import { recalculateProfileTargets } from '../onboarding/recalculate-targets';

function toWeightEntryDto(entry: { id: string; weightKg: unknown; loggedAt: Date; createdAt: Date }): WeightEntryDto {
  return {
    id: entry.id,
    weightKg: Number(entry.weightKg),
    loggedAt: entry.loggedAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function createWeightEntry(
  prisma: PrismaClient,
  userId: string,
  input: CreateWeightEntryRequest,
): Promise<WeightEntryDto> {
  const loggedAt = new Date(input.loggedAt);

  const latestExisting = await prisma.weightEntry.findFirst({
    where: { userId },
    orderBy: { loggedAt: 'desc' },
  });

  const entry = await prisma.weightEntry.create({
    data: { userId, weightKg: input.weightKg, loggedAt },
  });

  // Only treat this as the user's "current" weight if it's not a back-filled
  // older reading — otherwise an out-of-order entry would incorrectly
  // overwrite a more recent one and skew the calorie/protein/water targets.
  if (!latestExisting || loggedAt >= latestExisting.loggedAt) {
    await prisma.profile.upsert({
      where: { userId },
      update: { currentWeightKg: input.weightKg },
      create: { userId, currentWeightKg: input.weightKg },
    });
    await recalculateProfileTargets(prisma, userId);
  }

  return toWeightEntryDto(entry);
}

export async function listWeightEntries(
  prisma: PrismaClient,
  userId: string,
  params: { from?: string; to?: string },
): Promise<WeightEntriesResponse> {
  const where: Prisma.WeightEntryWhereInput = { userId };
  if (params.from || params.to) {
    where.loggedAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to) } : {}),
    };
  }

  const entries = await prisma.weightEntry.findMany({ where, orderBy: { loggedAt: 'desc' } });

  return { entries: entries.map(toWeightEntryDto) };
}

export async function deleteWeightEntry(prisma: PrismaClient, userId: string, id: string): Promise<void> {
  const existing = await prisma.weightEntry.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError('Weight entry not found');
  }

  await prisma.weightEntry.delete({ where: { id } });
}
