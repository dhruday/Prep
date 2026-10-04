import { describe, expect, it } from 'vitest';
import { median, percentile, summarize } from '../src/stats.js';
import type { NormalizedResponse, RunRecord } from '../src/types.js';

const resp = (over: Partial<NormalizedResponse>): NormalizedResponse => ({
  provider: 'claude',
  model: 'm',
  text: 'x',
  inputTokens: 10,
  outputTokens: 1000,
  latencyMs: 1000,
  costUsd: 0.01,
  finishReason: 'stop',
  attempts: 1,
  ...over,
});

const rec = (results: NormalizedResponse[]): RunRecord => ({
  timestamp: '2026-10-04T00:00:00.000Z',
  prompt: 'p',
  maxTokens: 100,
  stream: false,
  results,
});

describe('stats', () => {
  it('median handles odd, even and empty input', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeUndefined();
  });

  it('percentile picks the nearest rank', () => {
    const vals = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(vals, 95)).toBe(95);
  });

  it('summarize ignores skipped providers and excludes errors from latency', () => {
    const records = [
      rec([
        resp({ latencyMs: 1000, ttftMs: 400 }),
        resp({ provider: 'openai', error: { type: 'missing_api_key', message: 'skipped' } }),
      ]),
      rec([
        resp({ latencyMs: 3000, ttftMs: 600 }),
        resp({ error: { type: 'timeout', message: 't' }, latencyMs: 60000 }),
      ]),
    ];
    const out = summarize(records);
    expect(out).toHaveLength(1);
    const claude = out[0]!;
    expect(claude.calls).toBe(3);
    expect(claude.errors).toBe(1);
    expect(claude.medianLatencyMs).toBe(2000);
    expect(claude.medianTtftMs).toBe(500);
    // 0.02 total cost over 2000 output tokens => $0.01 per 1K
    expect(claude.costPer1KOutput).toBeCloseTo(0.01, 6);
  });
});
