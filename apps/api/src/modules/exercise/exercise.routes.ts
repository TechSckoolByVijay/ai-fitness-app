import { CreateExerciseEntryRequestSchema, ExerciseEntriesResponseSchema, ExerciseEntryDtoSchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createExerciseEntry, listExerciseEntries } from './exercise-entries.service';

const ListExerciseEntriesQuerySchema = z.object({
  date: z.string().optional(),
  page: z.coerce.number().int().nonnegative().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export async function exerciseRoutes(app: FastifyInstance) {
  app.post('/exercise/entries', { preHandler: app.authenticate }, async (request, reply) => {
    const body = CreateExerciseEntryRequestSchema.parse(request.body);
    const entry = await createExerciseEntry(app.prisma, request.user.sub, body);
    reply.status(201).send(ExerciseEntryDtoSchema.parse(entry));
  });

  app.get('/exercise/entries', { preHandler: app.authenticate }, async (request, reply) => {
    const query = ListExerciseEntriesQuerySchema.parse(request.query);
    const result = await listExerciseEntries(app.prisma, request.user.sub, query);
    reply.send(ExerciseEntriesResponseSchema.parse(result));
  });
}
