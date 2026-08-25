import {
  AuthResponseSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  RegisterRequestSchema,
} from '@fitness-app/shared';
import type { FastifyInstance } from 'fastify';
import { loginUser, logoutUser, refreshTokens, registerUser } from './auth.service';

export async function authRoutes(app: FastifyInstance) {
  const signAccessToken = (userId: string) => app.jwt.sign({ sub: userId });

  app.post('/auth/register', async (request, reply) => {
    const body = RegisterRequestSchema.parse(request.body);
    const result = await registerUser(app.prisma, app.env, signAccessToken, body);
    reply.status(201).send(AuthResponseSchema.parse(result));
  });

  app.post('/auth/login', async (request, reply) => {
    const body = LoginRequestSchema.parse(request.body);
    const result = await loginUser(app.prisma, app.env, signAccessToken, body);
    reply.send(AuthResponseSchema.parse(result));
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = RefreshRequestSchema.parse(request.body);
    const result = await refreshTokens(app.prisma, app.env, signAccessToken, body.refreshToken);
    reply.send(result);
  });

  app.post('/auth/logout', async (request, reply) => {
    const body = RefreshRequestSchema.parse(request.body);
    await logoutUser(app.prisma, app.env, body.refreshToken);
    reply.status(204).send();
  });
}
