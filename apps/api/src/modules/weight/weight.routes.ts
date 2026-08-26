import { CreateWeightEntryRequestSchema, WeightEntriesResponseSchema, WeightEntryDtoSchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createWeightEntry, deleteWeightEntry, listWeightEntries } from './weight-entries.service';

const ListWeightEntriesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const EntryParamsSchema = z.object({ id: z.string().uuid() });

export async function weightRoutes(app: FastifyInstance) {
  app.post('/weight/entries', { preHandler: app.authenticate }, async (request, reply) => {
    const body = CreateWeightEntryRequestSchema.parse(request.body);
    const entry = await createWeightEntry(app.prisma, request.user.sub, body);
    reply.status(201).send(WeightEntryDtoSchema.parse(entry));
  });

  app.get('/weight/entries', { preHandler: app.authenticate }, async (request, reply) => {
    const query = ListWeightEntriesQuerySchema.parse(request.query);
    const result = await listWeightEntries(app.prisma, request.user.sub, query);
    reply.send(WeightEntriesResponseSchema.parse(result));
  });

  app.delete('/weight/entries/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = EntryParamsSchema.parse(request.params);
    await deleteWeightEntry(app.prisma, request.user.sub, id);
    reply.status(204).send();
  });
}
