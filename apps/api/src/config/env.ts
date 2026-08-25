import { z } from 'zod';

/**
 * z.coerce.boolean() uses JS's Boolean(x), where ANY non-empty string is
 * truthy — so "false" in a .env file would coerce to `true`. This parses
 * the actual string value instead.
 */
function envBoolean(defaultValue: boolean) {
  return z
    .string()
    .optional()
    .transform((val) => (val === undefined ? defaultValue : val.toLowerCase() === 'true' || val === '1'));
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),

  MOCK_AI: envBoolean(true),
  MOCK_SPEECH: envBoolean(true),
  MOCK_NUTRITION: envBoolean(true),
  MOCK_HEALTH_DATA: envBoolean(true),

  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  SPEECH_API_KEY: z.string().optional(),
  NUTRITION_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Parsed once at boot. Every module that needs config (provider factories in
 * particular) takes this typed object as an argument rather than reading
 * process.env directly, so mock/real provider selection stays unit-testable.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment configuration:', result.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}
