import type { Env } from '../../config/env';
import type { AIProvider } from './ai-provider.interface';
import { MockAIProvider } from './mock-ai.provider';
import { OpenAIProvider } from './openai.provider';

export function createAIProvider(env: Env): AIProvider {
  if (env.MOCK_AI || !env.AI_API_KEY) {
    return new MockAIProvider();
  }
  // AI_BASE_URL switches between api.openai.com (unset) and any
  // OpenAI-compatible endpoint — in practice Azure OpenAI, where AI_MODEL is
  // the Azure *deployment* name. AI_AZURE_API_VERSION additionally switches
  // auth/request shape for Azure's classic (non-"/v1") endpoints. Pure
  // env-var switch, either direction, anytime.
  return new OpenAIProvider(env.AI_API_KEY, env.AI_MODEL || undefined, env.AI_BASE_URL, env.AI_AZURE_API_VERSION);
}
