import { CreateWaterEntryRequestSchema, WaterEntriesResponseSchema, WaterEntryDtoSchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createWaterEntry, deleteWaterEntry, listWaterEntries } from './water-entries.service';

const ListWaterEntriesQuerySchema = z.object({
  date: z.string().optional(),
});

const EntryParamsSchema = z.object({ id: z.string().uuid() });

export async function waterRoutes(app: FastifyInstance) {
  app.post('/water/entries', { preHandler: app.authenticate }, async (request, reply) => {
    const body = CreateWaterEntryRequestSchema.parse(request.body);
    const entry = await createWaterEntry(app.prisma, request.user.sub, body);
    reply.status(201).send(WaterEntryDtoSchema.parse(entry));
  });

  app.get('/water/entries', { preHandler: app.authenticate }, async (request, reply) => {
    const query = ListWaterEntriesQuerySchema.parse(request.query);
    const result = await listWaterEntries(app.prisma, request.user.sub, query);
    reply.send(WaterEntriesResponseSchema.parse(result));
  });

  app.delete('/water/entries/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = EntryParamsSchema.parse(request.params);
    await deleteWaterEntry(app.prisma, request.user.sub, id);
    reply.status(204).send();
  });
}
