import type { Env } from '../../config/env';
import type { AIProvider } from './ai-provider.interface';
import { MockAIProvider } from './mock-ai.provider';
import { OpenAIProvider } from './openai.provider';

export function createAIProvider(env: Env): AIProvider {
  if (env.MOCK_AI || !env.AI_API_KEY) {
    return new MockAIProvider();
  }
  return new OpenAIProvider(env.AI_API_KEY, env.AI_MODEL || undefined);
}
