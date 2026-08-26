import type { FastifyInstance } from 'fastify';
import { privacyPolicyHtml, termsOfServiceHtml } from './legal-content';

/**
 * Publicly reachable (no auth) static pages — Play Console's Data Safety /
 * Health Apps declaration and general app-store review both require a live
 * privacy policy URL, and a Terms of Service page is expected alongside it.
 * Serving them from the API itself gives a stable, permanent URL without
 * needing separate hosting.
 */
export async function legalRoutes(app: FastifyInstance) {
  app.get('/legal/privacy', async (_request, reply) => {
    reply.type('text/html').send(privacyPolicyHtml());
  });

  app.get('/legal/terms', async (_request, reply) => {
    reply.type('text/html').send(termsOfServiceHtml());
  });
}
