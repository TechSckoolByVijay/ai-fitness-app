import {
  CreateFavoriteFoodRequestSchema,
  FavoriteFoodDtoSchema,
  FavoriteFoodsResponseSchema,
  FoodEntryDtoSchema,
  LogFavoriteFoodRequestSchema,
} from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createFavoriteFood, deleteFavoriteFood, listFavoriteFoods, logFavoriteFood } from './favorites.service';

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function favoritesRoutes(app: FastifyInstance) {
  app.post('/favorites', { preHandler: app.authenticate }, async (request, reply) => {
    const body = CreateFavoriteFoodRequestSchema.parse(request.body);
    const favorite = await createFavoriteFood(app.prisma, request.user.sub, body);
    reply.status(201).send(FavoriteFoodDtoSchema.parse(favorite));
  });

  app.get('/favorites', { preHandler: app.authenticate }, async (request, reply) => {
    const result = await listFavoriteFoods(app.prisma, request.user.sub);
    reply.send(FavoriteFoodsResponseSchema.parse(result));
  });

  app.delete('/favorites/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = ParamsSchema.parse(request.params);
    await deleteFavoriteFood(app.prisma, request.user.sub, id);
    reply.status(204).send();
  });

  app.post('/favorites/:id/log', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = ParamsSchema.parse(request.params);
    const body = LogFavoriteFoodRequestSchema.parse(request.body ?? {});
    const entry = await logFavoriteFood(app.prisma, request.user.sub, id, body.loggedAt);
    reply.status(201).send(FoodEntryDtoSchema.parse(entry));
  });
}
