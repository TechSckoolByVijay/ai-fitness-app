import { buildApp } from '../../src/app';
import { loadEnv } from '../../src/config/env';

export async function createTestApp() {
  const env = loadEnv();
  const app = await buildApp(env);
  await app.ready();
  return app;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
}
