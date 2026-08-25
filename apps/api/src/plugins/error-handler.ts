import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({ error: error.code, message: error.message });
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.flatten(),
      });
      return;
    }

    // Fastify's own errors (malformed body, bad content-type, etc.) carry a
    // meaningful 4xx statusCode — surface it instead of flattening every
    // unexpected error to a opaque 500.
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode >= 400 && statusCode < 500) {
      reply.status(statusCode).send({ error: error.code ?? 'BAD_REQUEST', message: error.message });
      return;
    }

    request.log.error({ err: error }, 'Unhandled error');
    reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Something went wrong' });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: 'NOT_FOUND', message: `Route ${request.url} not found` });
  });
}
