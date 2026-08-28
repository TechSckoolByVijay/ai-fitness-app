import type { Env } from '../../config/env';
import type { AIProvider } from './ai-provider.interface';
import { MockAIProvider } from './mock-ai.provider';
import { OpenAIProvider } from './openai.provider';

export function createAIProvider(env: Env): AIProvider {
  if (env.MOCK_AI || !env.AI_API_KEY) {
    return new MockAIProvider();
  }
  // AI_BASE_URL switches between api.openai.com (unset) and any
  // OpenAI-compatible endpoint — in practice Azure OpenAI's v1 endpoint,
  // where AI_MODEL is the Azure *deployment* name. Pure env-var switch.
  return new OpenAIProvider(env.AI_API_KEY, env.AI_MODEL || undefined, env.AI_BASE_URL);
}
