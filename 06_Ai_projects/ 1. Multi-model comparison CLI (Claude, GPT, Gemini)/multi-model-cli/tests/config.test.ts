import { describe, expect, it } from 'vitest';
import { parseConfig, parsePricing, parsePromptFile, selectProviders } from '../src/config.js';

describe('config', () => {
  it('applies defaults', () => {
    const cfg = parseConfig({ models: { claude: 'x' }, defaults: {} });
    expect(cfg.defaults.maxTokens).toBe(1024);
    expect(cfg.defaults.retries).toBe(2);
    expect(cfg.defaults.timeoutMs).toBe(60000);
  });

  it('rejects invalid config with a readable message', () => {
    expect(() => parseConfig({ models: { claude: '' }, defaults: {} })).toThrow(/Invalid config/);
  });

  it('accepts null prices and rejects negative ones', () => {
    expect(() =>
      parsePricing({ models: { a: { inputPerMTok: null, outputPerMTok: null } } }),
    ).not.toThrow();
    expect(() =>
      parsePricing({ models: { a: { inputPerMTok: -1, outputPerMTok: 1 } } }),
    ).toThrow(/Invalid pricing/);
  });

  it('rejects empty prompt files', () => {
    expect(() => parsePromptFile([])).toThrow(/Invalid prompt file/);
  });

  it('selectProviders validates the --models flag', () => {
    const available = ['claude', 'openai', 'gemini'];
    expect(selectProviders(undefined, available)).toEqual(available);
    expect(selectProviders('Claude, openai', available)).toEqual(['claude', 'openai']);
    expect(() => selectProviders('claude,llama', available)).toThrow(/Unknown provider/);
  });
});
