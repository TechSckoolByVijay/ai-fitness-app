import {
  DeleteAccountRequestSchema,
  MeResponseSchema,
  UpdateBudgetRequestSchema,
  UpdateProfileRequestSchema,
} from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { updateBudget } from './budget.service';
import { deleteAccount, getMe, updateProfile } from './users.service';

export async function usersRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const me = await getMe(app.prisma, request.user.sub);
    reply.send(MeResponseSchema.parse(me));
  });

  app.patch('/me/profile', { preHandler: app.authenticate }, async (request, reply) => {
    const body = UpdateProfileRequestSchema.parse(request.body);
    const me = await updateProfile(app.prisma, request.user.sub, body);
    reply.send(MeResponseSchema.parse(me));
  });

  app.patch('/me/budget', { preHandler: app.authenticate }, async (request, reply) => {
    const body = UpdateBudgetRequestSchema.parse(request.body);
    const me = await updateBudget(app.prisma, request.user.sub, body);
    reply.send(MeResponseSchema.parse(me));
  });

  app.delete('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const body = DeleteAccountRequestSchema.parse(request.body ?? {});
    await deleteAccount(app.prisma, request.user.sub, body.password);
    reply.code(204).send();
  });
}
