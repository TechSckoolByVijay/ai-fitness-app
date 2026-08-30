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

  /**
   * Runs the in-process reminder scheduler. Off in tests, where ticks would
   * fire against the shared test database at unpredictable moments.
   */
  ENABLE_REMINDER_SCHEDULER: envBoolean(true),

  /**
   * Which real AI backend to use when MOCK_AI=false. Both backends can be
   * configured at once — this picks the active one, so switching is a
   * one-word edit and a restart rather than swapping credentials in and out
   * (and losing the other set in the process).
   *
   *   openai — AI_API_KEY + AI_MODEL (+ optional AI_BASE_URL for any other
   *            OpenAI-compatible endpoint)
   *   azure  — the AZURE_OPENAI_* block below
   */
  AI_PROVIDER: z.enum(['openai', 'azure']).default('openai'),

  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  /**
   * Optional OpenAI-compatible endpoint. Leave unset for api.openai.com;
   * set to an Azure OpenAI resource's v1 endpoint
   * (https://<resource>.openai.azure.com/openai/v1) to use Azure instead —
   * with AI_API_KEY as the Azure key and AI_MODEL as the deployment name.
   * Switching providers is just changing these env vars, no code change.
   */
  AI_BASE_URL: z.string().url().optional(),
  /**
   * Set only for Azure OpenAI resources using the classic (non-"/v1")
   * endpoint shape, e.g. AI_BASE_URL=https://<resource>.openai.azure.com/openai
   * plus AI_AZURE_API_VERSION=2025-04-01-preview. When set, requests use
   * Azure's ?api-version=... + api-key header auth instead of the plain
   * OpenAI-compatible Bearer scheme. Leave unset for api.openai.com or an
   * Azure resource exposing the newer /openai/v1 endpoint.
   */
  AI_AZURE_API_VERSION: z.string().optional(),

  /**
   * Azure OpenAI credentials, used when AI_PROVIDER=azure. Kept in their own
   * namespace rather than reusing AI_API_KEY/AI_MODEL so that both providers
   * can sit in .env simultaneously and switching does not mean re-pasting a
   * key you then have to find again to switch back.
   *
   * AZURE_OPENAI_ENDPOINT is the base, WITHOUT the operation path or query
   * string. Given a portal URL like
   *   https://<resource>.openai.azure.com/openai/responses?api-version=2025-04-01-preview
   * the endpoint is  https://<resource>.openai.azure.com/openai
   * and the version  2025-04-01-preview  goes in AZURE_OPENAI_API_VERSION —
   * the SDK appends /responses and ?api-version= itself.
   *
   * AZURE_OPENAI_DEPLOYMENT is the *deployment* name you chose in the Azure
   * portal, which is an arbitrary alias and need not match any public model
   * name.
   */
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
  AZURE_OPENAI_DEPLOYMENT: z.string().optional(),
  /** Omit only for Azure resources exposing the newer OpenAI-compatible /openai/v1 endpoint. */
  AZURE_OPENAI_API_VERSION: z.string().optional(),
  /** Per-user daily caps on AI-backed calls — cost protection for the shared API key. */
  AI_DAILY_INTERPRET_LIMIT: z.coerce.number().int().positive().default(50),
  AI_DAILY_COACH_LIMIT: z.coerce.number().int().positive().default(100),
  SPEECH_API_KEY: z.string().optional(),
  NUTRITION_API_KEY: z.string().optional(),
  /**
   * Google OAuth client IDs. Both are accepted audiences for an ID token:
   * the native Android sign-in issues tokens for the WEB client id (that is
   * how the library is designed), while the Android client id authorises the
   * app itself by package name + signing fingerprint. Listing both means the
   * server keeps working whichever one Google stamps into `aud`.
   */
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),
  /** Unused for sign-in — kept only for a future auth-code exchange (refresh tokens). */
  GOOGLE_CLIENT_SECRET: z.string().optional(),
}).superRefine((env, ctx) => {
  // Only meaningful when a real provider is actually going to be built.
  if (env.MOCK_AI || env.AI_PROVIDER !== 'azure') return;

  // Selecting Azure and then falling back to the mock provider because a
  // variable is missing is the worst outcome: the app boots, answers, and
  // silently returns canned data. Refuse to start instead.
  const required = [
    ['AZURE_OPENAI_API_KEY', env.AZURE_OPENAI_API_KEY],
    ['AZURE_OPENAI_ENDPOINT', env.AZURE_OPENAI_ENDPOINT],
    ['AZURE_OPENAI_DEPLOYMENT', env.AZURE_OPENAI_DEPLOYMENT],
  ] as const;

  for (const [name, value] of required) {
    if (!value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [name],
        message: `${name} is required when AI_PROVIDER=azure (set MOCK_AI=true to run without a real provider).`,
      });
    }
  }

  // A pasted portal URL keeps the operation path and query string, which
  // would make the SDK build .../openai/responses/responses?api-version=…
  // twice over. Cheap to catch here; confusing to debug as a 404 later.
  const endpoint = env.AZURE_OPENAI_ENDPOINT;
  if (endpoint && (endpoint.includes('?') || /\/(responses|chat\/completions)\/?$/.test(endpoint))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['AZURE_OPENAI_ENDPOINT'],
      message:
        'AZURE_OPENAI_ENDPOINT must be the base URL only, e.g. https://<resource>.openai.azure.com/openai — drop the /responses path and the ?api-version= query string (that goes in AZURE_OPENAI_API_VERSION).',
    });
  }
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
