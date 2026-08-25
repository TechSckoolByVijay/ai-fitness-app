import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env';
import { createAIProvider } from '../providers/ai/ai-provider.factory';
import type { AIProvider } from '../providers/ai/ai-provider.interface';
import { createHealthDataProvider } from '../providers/health/health-data-provider.factory';
import type { HealthDataProvider } from '../providers/health/health-data-provider.interface';
import { createNutritionService } from '../providers/nutrition/nutrition.factory';
import type { NutritionService } from '../providers/nutrition/nutrition-service.interface';
import { createSpeechProvider } from '../providers/speech/speech-provider.factory';
import type { SpeechProvider } from '../providers/speech/speech-provider.interface';

declare module 'fastify' {
  interface FastifyInstance {
    aiProvider: AIProvider;
    speechProvider: SpeechProvider;
    nutritionService: NutritionService;
    healthDataProvider: HealthDataProvider;
  }
}

export const providersPlugin = fp(async (app: FastifyInstance, opts: { env: Env }) => {
  app.decorate('aiProvider', createAIProvider(opts.env));
  app.decorate('speechProvider', createSpeechProvider(opts.env));
  app.decorate('nutritionService', createNutritionService(opts.env));
  app.decorate('healthDataProvider', createHealthDataProvider(opts.env));
});
