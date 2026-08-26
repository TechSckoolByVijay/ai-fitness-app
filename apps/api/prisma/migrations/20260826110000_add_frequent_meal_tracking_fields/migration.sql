/*
  Warnings:

  - Added the required column `mealType` to the `FrequentMeal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signature` to the `FrequentMeal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FrequentMeal" ADD COLUMN     "mealType" "MealType" NOT NULL;
ALTER TABLE "FrequentMeal" ADD COLUMN     "signature" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FrequentMeal_userId_signature_key" ON "FrequentMeal"("userId", "signature");
