import type { PrismaClient } from '@prisma/client';
import type {
  CreateFavoriteFoodRequest,
  FavoriteFoodDto,
  FavoriteFoodsResponse,
  FoodEntryDto,
  FoodItemInput,
} from '@fitness-app/shared';
import { NotFoundError } from '../../lib/errors';
import { createFoodEntry } from '../food/food-entries.service';

function toFavoriteFoodDto(favorite: {
  id: string;
  name: string;
  mealType: string;
  itemsJson: unknown;
  createdAt: Date;
}): FavoriteFoodDto {
  return {
    id: favorite.id,
    name: favorite.name,
    mealType: favorite.mealType as FavoriteFoodDto['mealType'],
    items: favorite.itemsJson as FoodItemInput[],
    createdAt: favorite.createdAt.toISOString(),
  };
}

export async function createFavoriteFood(
  prisma: PrismaClient,
  userId: string,
  input: CreateFavoriteFoodRequest,
): Promise<FavoriteFoodDto> {
  const favorite = await prisma.favoriteFood.create({
    data: { userId, name: input.name, mealType: input.mealType, itemsJson: input.items },
  });
  return toFavoriteFoodDto(favorite);
}

export async function listFavoriteFoods(prisma: PrismaClient, userId: string): Promise<FavoriteFoodsResponse> {
  const favorites = await prisma.favoriteFood.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return { favorites: favorites.map(toFavoriteFoodDto) };
}

export async function deleteFavoriteFood(prisma: PrismaClient, userId: string, id: string): Promise<void> {
  const existing = await prisma.favoriteFood.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new NotFoundError('Favorite not found');
  }
  await prisma.favoriteFood.delete({ where: { id } });
}

/** Re-logs a saved favorite as a real FoodEntry right now (or at a given time) — reuses the exact same persistence path as a fresh AI-interpreted meal, just skipping interpretation entirely since the items are already known-good. */
export async function logFavoriteFood(
  prisma: PrismaClient,
  userId: string,
  id: string,
  loggedAt?: string,
): Promise<FoodEntryDto> {
  const favorite = await prisma.favoriteFood.findFirst({ where: { id, userId } });
  if (!favorite) {
    throw new NotFoundError('Favorite not found');
  }

  return createFoodEntry(prisma, userId, {
    mealType: favorite.mealType as CreateFavoriteFoodRequest['mealType'],
    loggedAt: loggedAt ?? new Date().toISOString(),
    sourceText: `Favorite: ${favorite.name}`,
    items: favorite.itemsJson as FoodItemInput[],
  });
}
