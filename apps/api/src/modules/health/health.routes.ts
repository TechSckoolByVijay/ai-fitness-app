import { HealthConnectionResponseSchema, SyncHealthDataRequestSchema } from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { disconnectHealthProvider, getHealthConnections, syncHealthData } from './health-sync.service';

export async function healthRoutes(app: FastifyInstance) {
  // Health Connect and HealthKit are on-device APIs the server cannot read,
  // so the client reads them and posts the result here.
  app.post('/health/sync', { preHandler: app.authenticate }, async (request, reply) => {
    const body = SyncHealthDataRequestSchema.parse(request.body);
    const result = await syncHealthData(app.prisma, request.user.sub, body);
    reply.send(result);
  });

  app.get('/health/connections', { preHandler: app.authenticate }, async (request, reply) => {
    const result = await getHealthConnections(app.prisma, request.user.sub);
    reply.send(HealthConnectionResponseSchema.parse(result));
  });

  app.delete<{ Params: { provider: string } }>(
    '/health/connections/:provider',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const provider = request.params.provider;
      if (provider !== 'health_connect' && provider !== 'apple_health') {
        reply.code(400).send({ message: 'Unknown health provider' });
        return;
      }
      await disconnectHealthProvider(app.prisma, request.user.sub, provider);
      reply.code(204).send();
    },
  );
}
