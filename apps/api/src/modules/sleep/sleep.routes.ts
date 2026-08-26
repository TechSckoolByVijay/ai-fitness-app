import { CreateSleepEntryRequestSchema, SleepEntriesResponseSchema, SleepEntryDtoSchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createSleepEntry, deleteSleepEntry, listSleepEntries } from './sleep-entries.service';

const ListSleepEntriesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const EntryParamsSchema = z.object({ id: z.string().uuid() });

export async function sleepRoutes(app: FastifyInstance) {
  app.post('/sleep/entries', { preHandler: app.authenticate }, async (request, reply) => {
    const body = CreateSleepEntryRequestSchema.parse(request.body);
    const entry = await createSleepEntry(app.prisma, request.user.sub, body);
    reply.status(201).send(SleepEntryDtoSchema.parse(entry));
  });

  app.get('/sleep/entries', { preHandler: app.authenticate }, async (request, reply) => {
    const query = ListSleepEntriesQuerySchema.parse(request.query);
    const result = await listSleepEntries(app.prisma, request.user.sub, query);
    reply.send(SleepEntriesResponseSchema.parse(result));
  });

  app.delete('/sleep/entries/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = EntryParamsSchema.parse(request.params);
    await deleteSleepEntry(app.prisma, request.user.sub, id);
    reply.status(204).send();
  });
}
