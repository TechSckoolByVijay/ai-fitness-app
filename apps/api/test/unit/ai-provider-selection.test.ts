import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env';
import { createAIProvider } from '../../src/providers/ai/ai-provider.factory';
import { MockAIProvider } from '../../src/providers/ai/mock-ai.provider';
import { OpenAIProvider } from '../../src/providers/ai/openai.provider';

/** Minimum set of vars unrelated to AI that the schema always requires. */
const BASE = {
  DATABASE_URL: 'postgresql://u:p@localhost:5433/db',
  JWT_SECRET: 'x'.repeat(32),
  JWT_REFRESH_SECRET: 'y'.repeat(32),
};

const AZURE = {
  AI_PROVIDER: 'azure',
  AZURE_OPENAI_API_KEY: 'azure-key',
  AZURE_OPENAI_ENDPOINT: 'https://example.openai.azure.com/openai',
  AZURE_OPENAI_DEPLOYMENT: 'my-deployment',
  AZURE_OPENAI_API_VERSION: '2025-04-01-preview',
};

describe('AI provider selection', () => {
  it('uses the mock provider whenever MOCK_AI is on, whatever else is set', () => {
    const env = loadEnv({ ...BASE, ...AZURE, MOCK_AI: 'true' } as NodeJS.ProcessEnv);
    expect(createAIProvider(env)).toBeInstanceOf(MockAIProvider);
  });

  it('defaults to the openai provider when AI_PROVIDER is unset', () => {
    const env = loadEnv({ ...BASE, MOCK_AI: 'false', AI_API_KEY: 'sk-test' } as NodeJS.ProcessEnv);
    expect(env.AI_PROVIDER).toBe('openai');
    expect(createAIProvider(env)).toBeInstanceOf(OpenAIProvider);
  });

  it('falls back to mock when no credentials are configured at all', () => {
    const env = loadEnv({ ...BASE, MOCK_AI: 'false' } as NodeJS.ProcessEnv);
    expect(createAIProvider(env)).toBeInstanceOf(MockAIProvider);
  });

  it('builds an Azure-backed provider when AI_PROVIDER=azure', () => {
    const env = loadEnv({ ...BASE, ...AZURE, MOCK_AI: 'false' } as NodeJS.ProcessEnv);
    expect(createAIProvider(env)).toBeInstanceOf(OpenAIProvider);
  });

  it('keeps both providers configured at once and honours the selector', () => {
    // The whole point of the AI_PROVIDER split: switching backends must not
    // require removing the other backend's credentials.
    const both = { ...BASE, ...AZURE, MOCK_AI: 'false', AI_API_KEY: 'sk-test', AI_MODEL: 'gpt-4o' };

    const azure = loadEnv({ ...both, AI_PROVIDER: 'azure' } as NodeJS.ProcessEnv);
    expect(azure.AI_API_KEY).toBe('sk-test');
    expect(azure.AZURE_OPENAI_DEPLOYMENT).toBe('my-deployment');

    const openai = loadEnv({ ...both, AI_PROVIDER: 'openai' } as NodeJS.ProcessEnv);
    expect(openai.AZURE_OPENAI_API_KEY).toBe('azure-key');
    expect(openai.AI_MODEL).toBe('gpt-4o');
  });

  it('refuses to boot on a half-configured Azure selection rather than silently mocking', () => {
    expect(() =>
      loadEnv({ ...BASE, MOCK_AI: 'false', AI_PROVIDER: 'azure', AZURE_OPENAI_API_KEY: 'k' } as NodeJS.ProcessEnv),
    ).toThrow(/Invalid environment configuration/);
  });

  it('rejects a pasted portal URL that still carries the path or query string', () => {
    const bad = (endpoint: string) =>
      loadEnv({ ...BASE, ...AZURE, MOCK_AI: 'false', AZURE_OPENAI_ENDPOINT: endpoint } as NodeJS.ProcessEnv);

    expect(() => bad('https://example.openai.azure.com/openai/responses?api-version=2025-04-01-preview')).toThrow();
    expect(() => bad('https://example.openai.azure.com/openai/responses')).toThrow();
    expect(() => bad('https://example.openai.azure.com/openai')).not.toThrow();
  });

  it('does not apply the Azure requirement when the openai path is selected', () => {
    expect(() =>
      loadEnv({ ...BASE, MOCK_AI: 'false', AI_PROVIDER: 'openai', AI_API_KEY: 'sk-test' } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });
});
