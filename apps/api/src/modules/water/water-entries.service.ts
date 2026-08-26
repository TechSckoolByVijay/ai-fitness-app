import type { Prisma, PrismaClient } from '@prisma/client';
import type { CreateWaterEntryRequest, WaterEntriesResponse, WaterEntryDto } from '@fitness-app/shared';
import { NotFoundError } from '../../lib/errors';
import { recomputeDailySummary, toDateOnly } from '../daily-summary';

function toWaterEntryDto(entry: { id: string; amountMl: number; loggedAt: Date; createdAt: Date }): WaterEntryDto {
  return {
    id: entry.id,
    amountMl: entry.amountMl,
    loggedAt: entry.loggedAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function createWaterEntry(
  prisma: PrismaClient,
  userId: string,
  input: CreateWaterEntryRequest,
): Promise<WaterEntryDto> {
  const entry = await prisma.waterEntry.create({
    data: { userId, amountMl: input.amountMl, loggedAt: new Date(input.loggedAt) },
  });

  await recomputeDailySummary(prisma, userId, toDateOnly(entry.loggedAt));

  return toWaterEntryDto(entry);
}

export async function listWaterEntries(
  prisma: PrismaClient,
  userId: string,
  params: { date?: string },
): Promise<WaterEntriesResponse> {
  const where: Prisma.WaterEntryWhereInput = { userId };
  if (params.date) {
    const start = toDateOnly(new Date(params.date));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    where.loggedAt = { gte: start, lt: end };
  }

  const entries = await prisma.waterEntry.findMany({ where, orderBy: { loggedAt: 'desc' } });

  return { entries: entries.map(toWaterEntryDto) };
}

export async function deleteWaterEntry(prisma: PrismaClient, userId: string, id: string): Promise<void> {
  const existing = await prisma.waterEntry.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError('Water entry not found');
  }

  await prisma.waterEntry.delete({ where: { id } });
  await recomputeDailySummary(prisma, userId, toDateOnly(existing.loggedAt));
}
