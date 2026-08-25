import { z } from 'zod';

export const MealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof MealTypeSchema>;

export const ConfidenceTierSchema = z.enum(['high', 'medium', 'low']);
export type ConfidenceTier = z.infer<typeof ConfidenceTierSchema>;

export const NutritionSourceSchema = z.enum([
  'mock',
  'usda',
  'open_food_facts',
  'indian_dataset',
  'custom',
  'user_edited',
]);
export type NutritionSource = z.infer<typeof NutritionSourceSchema>;

export const SexSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);
export type Sex = z.infer<typeof SexSchema>;

export const ActivityLevelSchema = z.enum([
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
]);
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;

export const GoalTypeSchema = z.enum([
  'lose_weight',
  'gain_muscle',
  'maintain_weight',
  'improve_fitness',
  'improve_health',
  'improve_sleep',
  'healthier_eating',
]);
export type GoalType = z.infer<typeof GoalTypeSchema>;

export const DietTypeSchema = z.enum([
  'vegetarian',
  'eggetarian',
  'non_vegetarian',
  'vegan',
  'other',
]);
export type DietType = z.infer<typeof DietTypeSchema>;

export const AllergyTypeSchema = z.enum([
  'milk',
  'lactose',
  'curd',
  'gluten',
  'nuts',
  'peanuts',
  'eggs',
  'seafood',
  'other',
]);
export type AllergyType = z.infer<typeof AllergyTypeSchema>;

export const HealthConditionTypeSchema = z.enum([
  'diabetes',
  'blood_pressure',
  'cholesterol',
  'thyroid',
  'kidney',
  'digestive',
  'medications',
  'other',
  'prefer_not_to_answer',
]);
export type HealthConditionType = z.infer<typeof HealthConditionTypeSchema>;

export const FoodEntryStatusSchema = z.enum(['confirmed', 'pending_clarification', 'edited']);
export type FoodEntryStatus = z.infer<typeof FoodEntryStatusSchema>;
