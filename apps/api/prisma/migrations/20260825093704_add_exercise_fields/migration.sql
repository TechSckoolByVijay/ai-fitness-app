/*
  Warnings:

  - You are about to drop the column `type` on the `ExerciseEntry` table. All the data in the column will be lost.
  - Added the required column `activityType` to the `ExerciseEntry` table without a default value. This is not possible if the table is not empty.
  - Made the column `caloriesBurned` on table `ExerciseEntry` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('walking', 'running', 'cycling', 'swimming', 'yoga', 'badminton', 'tennis', 'football', 'basketball', 'cricket', 'gym_workout', 'weight_training', 'dancing', 'hiking', 'other');

-- CreateEnum
CREATE TYPE "ActivityIntensity" AS ENUM ('light', 'moderate', 'vigorous');

-- AlterTable
ALTER TABLE "ExerciseEntry" DROP COLUMN "type",
ADD COLUMN     "activityType" "ActivityType" NOT NULL,
ADD COLUMN     "confidence" DECIMAL(3,2) NOT NULL DEFAULT 1,
ADD COLUMN     "distanceKm" DECIMAL(6,2),
ADD COLUMN     "intensity" "ActivityIntensity",
ADD COLUMN     "sourceText" TEXT,
ADD COLUMN     "steps" INTEGER,
ALTER COLUMN "caloriesBurned" SET NOT NULL;
