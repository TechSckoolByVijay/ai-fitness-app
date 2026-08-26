import type { Prisma, PrismaClient } from '@prisma/client';
import {
  sumNutrition,
  type CreateFoodEntryRequest,
  type FoodEntriesResponse,
  type FoodEntryDto,
  type FoodItemInput,
  type NutritionEstimate,
  type UpdateFoodEntryRequest,
} from '@fitness-app/shared';
import { NotFoundError } from '../../lib/errors';
import { classifyItemConfidence, classifyMealConfidence } from '../confidence';
import { recomputeDailySummary, toDateOnly } from '../daily-summary';
import { trackFrequentMeal } from './frequent-meal-tracking';

type FoodEntryWithItems = Prisma.FoodEntryGetPayload<{
  include: { items: { include: { nutrition: true } } };
}>;

function toNutritionCreateInput(nutrition: NutritionEstimate) {
  return {
    calories: nutrition.calories,
    proteinG: nutrition.proteinG,
    carbsG: nutrition.carbsG,
    fatG: nutrition.fatG,
    fiberG: nutrition.fiberG,
    sugarG: nutrition.sugarG,
    sodiumMg: nutrition.sodiumMg,
    source: nutrition.source,
    isEstimate: nutrition.isEstimate,
  };
}

function toItemsCreateInput(items: FoodItemInput[]) {
  return items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    preparationMethod: item.preparationMethod,
    ingredientsJson: item.ingredients ?? undefined,
    estimatedWeightGrams: item.estimatedWeightGrams,
    confidence: item.confidence,
    rawDescriptorsJson: item.descriptors ?? undefined,
    nutrition: { create: toNutritionCreateInput(item.nutrition) },
  }));
}

function toFoodEntryDto(entry: FoodEntryWithItems): FoodEntryDto {
  const items = entry.items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: Number(item.quantity),
    unit: item.unit,
    estimatedWeightGrams: item.estimatedWeightGrams ? Number(item.estimatedWeightGrams) : undefined,
    preparationMethod: item.preparationMethod ?? undefined,
    ingredients: (item.ingredientsJson as string[] | null) ?? undefined,
    descriptors: (item.rawDescriptorsJson as string[] | null) ?? undefined,
    confidence: Number(item.confidence),
    nutrition: item.nutrition
      ? {
          calories: Number(item.nutrition.calories),
          proteinG: Number(item.nutrition.proteinG),
          carbsG: Number(item.nutrition.carbsG),
          fatG: Number(item.nutrition.fatG),
          fiberG: item.nutrition.fiberG ? Number(item.nutrition.fiberG) : 0,
          sugarG: item.nutrition.sugarG ? Number(item.nutrition.sugarG) : undefined,
          sodiumMg: item.nutrition.sodiumMg ? Number(item.nutrition.sodiumMg) : undefined,
          isEstimate: item.nutrition.isEstimate,
          source: item.nutrition.source,
        }
      : { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, isEstimate: true, source: 'mock' as const },
  }));

  return {
    id: entry.id,
    mealType: entry.mealType,
    loggedAt: entry.loggedAt.toISOString(),
    sourceText: entry.sourceText,
    confidenceTier: entry.confidenceTier,
    status: entry.status,
    items,
    totals: sumNutrition(items.map((item) => item.nutrition)),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export async function createFoodEntry(
  prisma: PrismaClient,
  userId: string,
  input: CreateFoodEntryRequest,
): Promise<FoodEntryDto> {
  const itemTiers = input.items.map((item) => classifyItemConfidence(item.confidence));
  const confidenceTier = input.confidenceTier ?? classifyMealConfidence(itemTiers);

  const entry = await prisma.foodEntry.create({
    data: {
      userId,
      mealType: input.mealType,
      loggedAt: new Date(input.loggedAt),
      sourceText: input.sourceText,
      confidenceTier,
      status: 'confirmed',
      items: { create: toItemsCreateInput(input.items) },
    },
    include: { items: { include: { nutrition: true } } },
  });

  await recomputeDailySummary(prisma, userId, toDateOnly(entry.loggedAt));
  await trackFrequentMeal(prisma, userId, input.mealType, input.items);

  return toFoodEntryDto(entry);
}

export async function listFoodEntries(
  prisma: PrismaClient,
  userId: string,
  params: { date?: string; page?: number; pageSize?: number },
): Promise<FoodEntriesResponse> {
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? 20;

  const where: Prisma.FoodEntryWhereInput = { userId };
  if (params.date) {
    const start = toDateOnly(new Date(params.date));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    where.loggedAt = { gte: start, lt: end };
  }

  const [entries, total] = await Promise.all([
    prisma.foodEntry.findMany({
      where,
      include: { items: { include: { nutrition: true } } },
      orderBy: { loggedAt: 'desc' },
      skip: page * pageSize,
      take: pageSize,
    }),
    prisma.foodEntry.count({ where }),
  ]);

  return {
    entries: entries.map(toFoodEntryDto),
    pagination: { page, pageSize, total },
  };
}

export async function updateFoodEntry(
  prisma: PrismaClient,
  userId: string,
  id: string,
  input: UpdateFoodEntryRequest,
): Promise<FoodEntryDto> {
  const existing = await prisma.foodEntry.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError('Food entry not found');
  }

  const oldDate = toDateOnly(existing.loggedAt);
  const updateData: Prisma.FoodEntryUpdateInput = { status: 'edited' };

  if (input.mealType) updateData.mealType = input.mealType;
  if (input.loggedAt) updateData.loggedAt = new Date(input.loggedAt);

  if (input.items) {
    await prisma.foodItem.deleteMany({ where: { foodEntryId: id } });
    const itemTiers = input.items.map((item) => classifyItemConfidence(item.confidence));
    updateData.confidenceTier = classifyMealConfidence(itemTiers);
    updateData.items = { create: toItemsCreateInput(input.items) };
  }

  const updated = await prisma.foodEntry.update({
    where: { id },
    data: updateData,
    include: { items: { include: { nutrition: true } } },
  });

  const newDate = toDateOnly(updated.loggedAt);
  await recomputeDailySummary(prisma, userId, oldDate);
  if (newDate.getTime() !== oldDate.getTime()) {
    await recomputeDailySummary(prisma, userId, newDate);
  }

  return toFoodEntryDto(updated);
}

export async function deleteFoodEntry(prisma: PrismaClient, userId: string, id: string): Promise<void> {
  const existing = await prisma.foodEntry.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError('Food entry not found');
  }

  await prisma.foodEntry.delete({ where: { id } });
  await recomputeDailySummary(prisma, userId, toDateOnly(existing.loggedAt));
}
