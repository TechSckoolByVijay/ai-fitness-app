import type { Prisma, PrismaClient } from '@prisma/client';
import type { CreateSleepEntryRequest, SleepEntriesResponse, SleepEntryDto } from '@fitness-app/shared';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { recomputeDailySummary, toDateOnly } from '../daily-summary';
import { computeSleepDurationMinutes } from './sleep-duration';

function toSleepEntryDto(entry: {
  id: string;
  sleptAt: Date;
  wokeAt: Date;
  durationMin: number;
  source: string;
  createdAt: Date;
}): SleepEntryDto {
  return {
    id: entry.id,
    sleptAt: entry.sleptAt.toISOString(),
    wokeAt: entry.wokeAt.toISOString(),
    durationMin: entry.durationMin,
    source: entry.source,
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function createSleepEntry(
  prisma: PrismaClient,
  userId: string,
  input: CreateSleepEntryRequest,
): Promise<SleepEntryDto> {
  const sleptAt = new Date(input.sleptAt);
  const wokeAt = new Date(input.wokeAt);
  const durationMin = computeSleepDurationMinutes(sleptAt, wokeAt);

  if (durationMin <= 0) {
    throw new ValidationError('wokeAt must be after sleptAt');
  }

  const entry = await prisma.sleepEntry.create({
    data: { userId, sleptAt, wokeAt, durationMin, source: 'manual' },
  });

  await recomputeDailySummary(prisma, userId, toDateOnly(entry.wokeAt));

  return toSleepEntryDto(entry);
}

export async function listSleepEntries(
  prisma: PrismaClient,
  userId: string,
  params: { from?: string; to?: string },
): Promise<SleepEntriesResponse> {
  const where: Prisma.SleepEntryWhereInput = { userId };
  if (params.from || params.to) {
    where.wokeAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to) } : {}),
    };
  }

  const entries = await prisma.sleepEntry.findMany({ where, orderBy: { wokeAt: 'desc' } });

  return { entries: entries.map(toSleepEntryDto) };
}

export async function deleteSleepEntry(prisma: PrismaClient, userId: string, id: string): Promise<void> {
  const existing = await prisma.sleepEntry.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError('Sleep entry not found');
  }

  await prisma.sleepEntry.delete({ where: { id } });
  await recomputeDailySummary(prisma, userId, toDateOnly(existing.wokeAt));
}
