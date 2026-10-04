import { describe, expect, it } from 'vitest';
import { formatTable, renderRun } from '../src/render.js';
import type { NormalizedResponse } from '../src/types.js';

const base: NormalizedResponse = {
  provider: 'claude',
  model: 'model-x',
  text: 'An answer',
  inputTokens: 18,
  outputTokens: 74,
  latencyMs: 1900,
  ttftMs: 600,
  costUsd: 0.0012,
  finishReason: 'end_turn',
  attempts: 1,
};

describe('render', () => {
  it('shows latency, TTFT, tokens and cost', () => {
    const t = formatTable([base]);
    expect(t).toContain('1.90s');
    expect(t).toContain('0.60s');
    expect(t).toContain('18 / 74');
    expect(t).toContain('$0.0012');
  });

  it('shows n/a for missing pricing and the error type for failures', () => {
    const t = formatTable([
      { ...base, costUsd: null },
      { ...base, provider: 'openai', error: { type: 'timeout', message: 'Request timed out' } },
    ]);
    expect(t).toContain('n/a');
    expect(t).toContain('timeout');
  });

  it('prints each provider answer and error message', () => {
    const out = renderRun('Hello?', [
      base,
      { ...base, provider: 'gemini', text: '', error: { type: 'http_400', message: 'bad' } },
    ]);
    expect(out).toContain('--- claude ---');
    expect(out).toContain('An answer');
    expect(out).toContain('[error: bad]');
  });
});
