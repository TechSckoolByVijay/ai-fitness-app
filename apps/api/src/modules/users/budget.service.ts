import type { PrismaClient } from '@prisma/client';
import {
  DEFAULT_MACRO_SPLIT,
  macroGramsFor,
  type MacroSplit,
  type MeResponse,
  type UpdateBudgetRequest,
} from '@fitness-app/shared';
import { recalculateProfileTargets } from '../onboarding/recalculate-targets';
import { getMe } from './users.service';

/**
 * Applies a calorie/macro budget.
 *
 * `calorieTarget`/`proteinTarget` remain the single source of truth for what
 * the app actually uses, so nothing downstream — dashboard, warnings, coach —
 * needs to know whether a target was calculated or chosen. `useCustomTargets`
 * only tells the recalculation pass to leave them alone.
 */
export async function updateBudget(
  prisma: PrismaClient,
  userId: string,
  input: UpdateBudgetRequest,
): Promise<MeResponse> {
  if (input.mode === 'standard') {
    // Clear the flag first so the recalculation below is actually allowed to
    // write, then let the calculator restore the derived targets.
    await prisma.profile.upsert({
      where: { userId },
      update: { useCustomTargets: false },
      create: { userId, useCustomTargets: false },
    });
    await recalculateProfileTargets(prisma, userId);
    return getMe(prisma, userId);
  }

  const { proteinGrams } = macroGramsFor(input.calorieTarget, input.macros);

  await prisma.profile.upsert({
    where: { userId },
    update: {
      useCustomTargets: true,
      calorieTarget: input.calorieTarget,
      proteinTarget: proteinGrams,
      carbTargetPct: input.macros.carbPct,
      fatTargetPct: input.macros.fatPct,
      proteinTargetPct: input.macros.proteinPct,
    },
    create: {
      userId,
      useCustomTargets: true,
      calorieTarget: input.calorieTarget,
      proteinTarget: proteinGrams,
      carbTargetPct: input.macros.carbPct,
      fatTargetPct: input.macros.fatPct,
      proteinTargetPct: input.macros.proteinPct,
    },
  });

  return getMe(prisma, userId);
}

/** Falls back to the balanced default until the user has touched the sliders. */
export function storedMacroSplit(profile: {
  carbTargetPct: number | null;
  fatTargetPct: number | null;
  proteinTargetPct: number | null;
}): MacroSplit {
  if (profile.carbTargetPct === null || profile.fatTargetPct === null || profile.proteinTargetPct === null) {
    return DEFAULT_MACRO_SPLIT;
  }
  return {
    carbPct: profile.carbTargetPct,
    fatPct: profile.fatTargetPct,
    proteinPct: profile.proteinTargetPct,
  };
}
