/*
  Warnings:

  - Added the required column `mealType` to the `FavoriteFood` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FavoriteFood" ADD COLUMN     "mealType" "MealType" NOT NULL;
