-- AlterEnum
ALTER TYPE "MealType" ADD VALUE 'all_day';

-- CreateEnum
CREATE TYPE "TimePrecision" AS ENUM ('exact', 'approximate', 'day');

-- AlterTable: existing entries were all AI-inferred or "now", so approximate
ALTER TABLE "FoodEntry" ADD COLUMN "timePrecision" "TimePrecision" NOT NULL DEFAULT 'approximate';

-- AlterTable
ALTER TABLE "NutritionRecord" ADD COLUMN "estimatedCalories" DECIMAL(7,2),
ADD COLUMN "estimatedProteinG" DECIMAL(7,2),
ADD COLUMN "proteinSetByUser" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DailySummary" ADD COLUMN "calorieTarget" INTEGER,
ADD COLUMN "proteinTarget" INTEGER;
