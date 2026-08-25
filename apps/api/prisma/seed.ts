import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { calculateTargets } from '../src/modules/onboarding/calorie-targets';
import { recomputeDailySummary, toDateOnly } from '../src/modules/daily-summary';
import { MockNutritionProvider } from '../src/providers/nutrition/mock-nutrition.provider';

const prisma = new PrismaClient();
const nutrition = new MockNutritionProvider();

const DEMO_EMAIL = 'demo@fitnessapp.local';
const DEMO_PASSWORD = 'demo1234';

interface SeedItem {
  name: string;
  quantity: number;
  unit: string;
  preparationMethod?: string;
}

interface SeedMeal {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  hour: number;
  minute: number;
  sourceText: string;
  items: SeedItem[];
}

const SAMPLE_MEALS: SeedMeal[] = [
  {
    mealType: 'breakfast',
    hour: 8,
    minute: 0,
    sourceText: 'I had a banana and a protein shake.',
    items: [
      { name: 'banana', quantity: 1, unit: 'whole' },
      { name: 'protein shake', quantity: 1, unit: 'glass' },
    ],
  },
  {
    mealType: 'lunch',
    hour: 12,
    minute: 0,
    sourceText: 'I had two chapatis, dal, and salad.',
    items: [
      { name: 'chapati', quantity: 2, unit: 'medium' },
      { name: 'dal', quantity: 1, unit: 'bowl' },
      { name: 'salad', quantity: 1, unit: 'bowl' },
    ],
  },
  {
    mealType: 'snack',
    hour: 15,
    minute: 30,
    sourceText: 'I had tea.',
    items: [{ name: 'tea', quantity: 1, unit: 'cup' }],
  },
  {
    mealType: 'dinner',
    hour: 19,
    minute: 45,
    sourceText: 'I had paneer curry with vegetables.',
    items: [
      { name: 'paneer curry', quantity: 1, unit: 'bowl', preparationMethod: 'less_oily' },
      { name: 'vegetable curry', quantity: 1, unit: 'bowl' },
    ],
  },
];

async function main() {
  console.log(`Seeding demo user ${DEMO_EMAIL}...`);

  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      name: 'Demo User',
      profile: { create: {} },
    },
  });

  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.goal.create({ data: { userId: user.id, type: 'lose_weight', isPrimary: true } });

  await prisma.dietPreference.upsert({
    where: { userId: user.id },
    update: { dietType: 'vegetarian' },
    create: { userId: user.id, dietType: 'vegetarian' },
  });

  const bodyMetrics = {
    dateOfBirth: new Date('1994-03-10'),
    sex: 'female' as const,
    heightCm: 162,
    currentWeightKg: 68,
    targetWeightKg: 60,
    activityLevel: 'light' as const,
  };

  const targets = calculateTargets({
    ...bodyMetrics,
    primaryGoal: 'lose_weight',
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { ...bodyMetrics, ...(targets ?? {}), onboardingCompletedAt: new Date() },
    create: { userId: user.id, ...bodyMetrics, ...(targets ?? {}), onboardingCompletedAt: new Date() },
  });

  // Re-runnable: clear the demo user's existing food log before re-seeding today's meals.
  await prisma.foodEntry.deleteMany({ where: { userId: user.id } });

  const today = toDateOnly(new Date());

  for (const meal of SAMPLE_MEALS) {
    const loggedAt = new Date(today);
    loggedAt.setHours(meal.hour, meal.minute, 0, 0);

    const items = await Promise.all(
      meal.items.map(async (item) => {
        const estimate = await nutrition.lookup(item);
        return {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          preparationMethod: item.preparationMethod,
          confidence: 0.9,
          nutrition: {
            create: {
              calories: estimate.calories,
              proteinG: estimate.proteinG,
              carbsG: estimate.carbsG,
              fatG: estimate.fatG,
              fiberG: estimate.fiberG,
              sugarG: estimate.sugarG,
              sodiumMg: estimate.sodiumMg,
              source: estimate.source,
              isEstimate: estimate.isEstimate,
            },
          },
        };
      }),
    );

    await prisma.foodEntry.create({
      data: {
        userId: user.id,
        mealType: meal.mealType,
        loggedAt,
        sourceText: meal.sourceText,
        confidenceTier: 'high',
        status: 'confirmed',
        items: { create: items },
      },
    });
  }

  await recomputeDailySummary(prisma, user.id, today);

  console.log(`Seed complete. Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
