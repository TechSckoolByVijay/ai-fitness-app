import type { Env } from '../../config/env';
import type { AIProvider } from './ai-provider.interface';
import { MockAIProvider } from './mock-ai.provider';
import { OpenAIProvider } from './openai.provider';

/**
 * Picks the AI backend. Both real backends can be configured in .env at the
 * same time; AI_PROVIDER decides which one is live, so switching between
 * them is a one-word edit plus a restart — no credential shuffling, and no
 * risk of losing the other provider's settings in the process.
 *
 * Falling back to the mock provider is deliberate ONLY for "no credentials
 * configured at all". A half-configured Azure selection is rejected at boot
 * by the env schema instead, because silently serving canned data from a
 * provider the operator explicitly selected is far worse than not starting.
 */
export function createAIProvider(env: Env): AIProvider {
  if (env.MOCK_AI) {
    return new MockAIProvider();
  }

  if (env.AI_PROVIDER === 'azure') {
    // Presence of these three is guaranteed by the env schema's superRefine
    // whenever AI_PROVIDER=azure and MOCK_AI=false.
    if (!env.AZURE_OPENAI_API_KEY || !env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_DEPLOYMENT) {
      return new MockAIProvider();
    }
    return new OpenAIProvider(
      env.AZURE_OPENAI_API_KEY,
      // On Azure the "model" the SDK sends is the deployment name.
      env.AZURE_OPENAI_DEPLOYMENT,
      env.AZURE_OPENAI_ENDPOINT,
      env.AZURE_OPENAI_API_VERSION,
    );
  }

  if (!env.AI_API_KEY) {
    return new MockAIProvider();
  }

  // AI_BASE_URL still allows pointing the OpenAI path at any other
  // OpenAI-compatible endpoint; AI_AZURE_API_VERSION remains supported for
  // the pre-AI_PROVIDER way of reaching Azure through these same vars.
  return new OpenAIProvider(env.AI_API_KEY, env.AI_MODEL || undefined, env.AI_BASE_URL, env.AI_AZURE_API_VERSION);
}
