import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers';

describe('legal pages', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the privacy policy publicly (no auth) as HTML', async () => {
    const response = await app.inject({ method: 'GET', url: '/legal/privacy' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Privacy Policy');
  });

  it('serves the terms of service publicly (no auth) as HTML', async () => {
    const response = await app.inject({ method: 'GET', url: '/legal/terms' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Terms of Service');
    expect(response.body).toContain('not a medical device');
  });
});
