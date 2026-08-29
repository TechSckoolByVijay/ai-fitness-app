-- User-set calorie and macro budget.
--
-- calorieTarget/proteinTarget stay the single source of truth for what the
-- app actually uses, so nothing downstream needs to know whether a target
-- was calculated or chosen. useCustomTargets only tells the recalculation
-- pass to leave them alone -- without it, logging a new weight would
-- silently overwrite the budget the user just set.

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "useCustomTargets" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "carbTargetPct" INTEGER;
ALTER TABLE "Profile" ADD COLUMN "fatTargetPct" INTEGER;
ALTER TABLE "Profile" ADD COLUMN "proteinTargetPct" INTEGER;
