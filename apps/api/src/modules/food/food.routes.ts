import {
  CreateFoodEntryRequestSchema,
  FoodEntriesResponseSchema,
  FoodEntryDtoSchema,
  UpdateFoodEntryRequestSchema,
} from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createFoodEntry, deleteFoodEntry, listFoodEntries, updateFoodEntry } from './food-entries.service';

const ListFoodEntriesQuerySchema = z.object({
  date: z.string().optional(),
  page: z.coerce.number().int().nonnegative().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

const EntryParamsSchema = z.object({ id: z.string().uuid() });

export async function foodRoutes(app: FastifyInstance) {
  app.post('/food/entries', { preHandler: app.authenticate }, async (request, reply) => {
    const body = CreateFoodEntryRequestSchema.parse(request.body);
    const entry = await createFoodEntry(app.prisma, request.user.sub, body);
    reply.status(201).send(FoodEntryDtoSchema.parse(entry));
  });

  app.get('/food/entries', { preHandler: app.authenticate }, async (request, reply) => {
    const query = ListFoodEntriesQuerySchema.parse(request.query);
    const result = await listFoodEntries(app.prisma, request.user.sub, query);
    reply.send(FoodEntriesResponseSchema.parse(result));
  });

  app.patch('/food/entries/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = EntryParamsSchema.parse(request.params);
    const body = UpdateFoodEntryRequestSchema.parse(request.body);
    const entry = await updateFoodEntry(app.prisma, request.user.sub, id, body);
    reply.send(FoodEntryDtoSchema.parse(entry));
  });

  app.delete('/food/entries/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = EntryParamsSchema.parse(request.params);
    await deleteFoodEntry(app.prisma, request.user.sub, id);
    reply.status(204).send();
  });
}
