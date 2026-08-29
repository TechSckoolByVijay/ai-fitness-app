-- Per-user display preference for weights and heights.
--
-- Storage stays metric everywhere (cm/kg) and every calculation — BMR/TDEE,
-- BMI, calorie targets — continues to run on those values. This column only
-- decides how a number is rendered and how an entered number is interpreted,
-- so existing rows need no conversion and flipping it is always reversible.

-- CreateEnum
CREATE TYPE "UnitSystem" AS ENUM ('metric', 'imperial');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "unitSystem" "UnitSystem" NOT NULL DEFAULT 'metric';
