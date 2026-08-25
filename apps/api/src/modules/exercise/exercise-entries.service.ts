import type { Prisma, PrismaClient } from '@prisma/client';
import type { CreateExerciseEntryRequest, ExerciseEntriesResponse, ExerciseEntryDto } from '@fitness-app/shared';
import { recomputeDailySummary, toDateOnly } from '../daily-summary';

function toExerciseEntryDto(entry: {
  id: string;
  activityType: string;
  loggedAt: Date;
  sourceText: string | null;
  durationMin: number;
  steps: number | null;
  distanceKm: unknown;
  intensity: string | null;
  caloriesBurned: unknown;
  confidence: unknown;
  createdAt: Date;
}): ExerciseEntryDto {
  return {
    id: entry.id,
    activityType: entry.activityType as ExerciseEntryDto['activityType'],
    loggedAt: entry.loggedAt.toISOString(),
    sourceText: entry.sourceText ?? undefined,
    durationMinutes: entry.durationMin,
    steps: entry.steps ?? undefined,
    distanceKm: entry.distanceKm ? Number(entry.distanceKm) : undefined,
    intensity: (entry.intensity as ExerciseEntryDto['intensity']) ?? undefined,
    caloriesBurned: Number(entry.caloriesBurned),
    confidence: Number(entry.confidence),
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function createExerciseEntry(
  prisma: PrismaClient,
  userId: string,
  input: CreateExerciseEntryRequest,
): Promise<ExerciseEntryDto> {
  const entry = await prisma.exerciseEntry.create({
    data: {
      userId,
      activityType: input.activityType,
      loggedAt: new Date(input.loggedAt),
      sourceText: input.sourceText,
      durationMin: Math.round(input.durationMinutes),
      steps: input.steps ? Math.round(input.steps) : undefined,
      distanceKm: input.distanceKm,
      intensity: input.intensity,
      caloriesBurned: input.caloriesBurned,
      confidence: input.confidence,
    },
  });

  await recomputeDailySummary(prisma, userId, toDateOnly(entry.loggedAt));

  return toExerciseEntryDto(entry);
}

export async function listExerciseEntries(
  prisma: PrismaClient,
  userId: string,
  params: { date?: string; page?: number; pageSize?: number },
): Promise<ExerciseEntriesResponse> {
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 20;

  const where: Prisma.ExerciseEntryWhereInput = { userId };
  if (params.date) {
    const start = toDateOnly(new Date(params.date));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    where.loggedAt = { gte: start, lt: end };
  }

  const [entries, total] = await Promise.all([
    prisma.exerciseEntry.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
      skip: page * pageSize,
      take: pageSize,
    }),
    prisma.exerciseEntry.count({ where }),
  ]);

  return {
    entries: entries.map(toExerciseEntryDto),
    pagination: { page, pageSize, total },
  };
}
