import { z } from 'zod';
import { MealTypeSchema } from './enums.schema';

export const DashboardMealSummarySchema = z.object({
  id: z.string().uuid(),
  time: z.string(),
  mealType: MealTypeSchema,
  summaryText: z.string(),
  calories: z.number().nonnegative(),
});
export type DashboardMealSummary = z.infer<typeof DashboardMealSummarySchema>;

export const DashboardActivitySummarySchema = z.object({
  id: z.string().uuid(),
  time: z.string(),
  activityType: z.string(),
  summaryText: z.string(),
  caloriesBurned: z.number().nonnegative(),
});
export type DashboardActivitySummary = z.infer<typeof DashboardActivitySummarySchema>;

export const DashboardTodaySchema = z.object({
  date: z.string(),
  caloriesConsumed: z.number().nonnegative(),
  calorieTarget: z.number().nullable(),
  proteinConsumed: z.number().nonnegative(),
  proteinTarget: z.number().nullable(),
  carbsConsumed: z.number().nonnegative(),
  fatConsumed: z.number().nonnegative(),
  fiberConsumed: z.number().nonnegative(),
  waterConsumedMl: z.number().nonnegative(),
  waterTargetMl: z.number().nullable(),
  steps: z.number().nullable(),
  stepsTarget: z.number().nullable(),
  sleepDurationMin: z.number().nullable(),
  /** From real ExerciseEntry data (not HealthDataProvider — that stays Phase 4/unwired). */
  activeCalories: z.number().nonnegative(),
  exerciseDurationMin: z.number().nonnegative(),
  meals: z.array(DashboardMealSummarySchema),
  activities: z.array(DashboardActivitySummarySchema),
});
export type DashboardToday = z.infer<typeof DashboardTodaySchema>;

export const DashboardHistoryDaySchema = z.object({
  date: z.string(),
  caloriesConsumed: z.number().nonnegative(),
  proteinConsumed: z.number().nonnegative(),
  carbsConsumed: z.number().nonnegative(),
  fatConsumed: z.number().nonnegative(),
});
export type DashboardHistoryDay = z.infer<typeof DashboardHistoryDaySchema>;

export const DashboardHistorySchema = z.object({
  days: z.array(DashboardHistoryDaySchema),
  calorieTarget: z.number().nullable(),
  proteinTarget: z.number().nullable(),
});
export type DashboardHistory = z.infer<typeof DashboardHistorySchema>;
