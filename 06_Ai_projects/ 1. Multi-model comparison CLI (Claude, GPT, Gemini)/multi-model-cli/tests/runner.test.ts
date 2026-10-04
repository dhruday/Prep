import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compareAll, isRetryable, redact, runOne } from '../src/runner.js';
import type { CompareRequest, ProviderAdapter } from '../src/types.js';

const pricing = { models: { m: { inputPerMTok: 1, outputPerMTok: 2 } } };
const req: CompareRequest = { prompt: 'hi', maxTokens: 100, stream: false };
const noSleep = async () => {};
const opts = { timeoutMs: 500, retries: 2, sleep: noSleep };

const okAdapter = (name: string): ProviderAdapter => ({
  name,
  envKey: 'TEST_KEY',
  call: async () => ({
    model: 'm',
    text: `hello from ${name}`,
    inputTokens: 1000,
    outputTokens: 1000,
    finishReason: 'stop',
  }),
});

beforeEach(() => {
  process.env.TEST_KEY = 'test-key';
});
afterEach(() => {
  delete process.env.TEST_KEY;
});

describe('runner', () => {
  it('normalizes a successful call and computes cost', async () => {
    const r = await runOne(okAdapter('a'), 'm', req, opts, pricing);
    expect(r.error).toBeUndefined();
    expect(r.text).toBe('hello from a');
    expect(r.costUsd).toBeCloseTo(0.003, 6);
    expect(r.attempts).toBe(1);
  });

  it('one failing provider never blocks the others', async () => {
    const bad: ProviderAdapter = {
      name: 'bad',
      envKey: 'TEST_KEY',
      call: async () => {
        throw Object.assign(new Error('bad request'), { status: 400 });
      },
    };
    const out = await compareAll(
      [
        { adapter: okAdapter('a'), model: 'm' },
        { adapter: bad, model: 'm' },
        { adapter: okAdapter('c'), model: 'm' },
      ],
      req,
      opts,
      pricing,
    );
    expect(out.map((r) => r.provider)).toEqual(['a', 'bad', 'c']);
    expect(out[0]!.error).toBeUndefined();
    expect(out[1]!.error?.type).toBe('http_400');
    expect(out[2]!.error).toBeUndefined();
  });

  it('times out using the abort signal', async () => {
    const slow: ProviderAdapter = {
      name: 'slow',
      envKey: 'TEST_KEY',
      call: (_r, _m, signal) =>
        new Promise((_res, rej) => signal.addEventListener('abort', () => rej(new Error('aborted')))),
    };
    const r = await runOne(slow, 'm', req, { ...opts, timeoutMs: 20 }, pricing);
    expect(r.error?.type).toBe('timeout');
    expect(r.attempts).toBe(1);
  });

  it('retries 429 then succeeds', async () => {
    let calls = 0;
    const flaky: ProviderAdapter = {
      name: 'flaky',
      envKey: 'TEST_KEY',
      call: async (...args) => {
        calls++;
        if (calls < 3) throw Object.assign(new Error('rate limited'), { status: 429 });
        return okAdapter('flaky').call(...args);
      },
    };
    const r = await runOne(flaky, 'm', req, opts, pricing);
    expect(r.error).toBeUndefined();
    expect(r.attempts).toBe(3);
  });

  it('does not retry 400 errors', async () => {
    let calls = 0;
    const bad: ProviderAdapter = {
      name: 'bad',
      envKey: 'TEST_KEY',
      call: async () => {
        calls++;
        throw Object.assign(new Error('nope'), { status: 400 });
      },
    };
    const r = await runOne(bad, 'm', req, opts, pricing);
    expect(calls).toBe(1);
    expect(r.error?.type).toBe('http_400');
  });

  it('gives up after the retry budget on persistent 500s', async () => {
    let calls = 0;
    const down: ProviderAdapter = {
      name: 'down',
      envKey: 'TEST_KEY',
      call: async () => {
        calls++;
        throw Object.assign(new Error('server error'), { status: 503 });
      },
    };
    const r = await runOne(down, 'm', req, opts, pricing);
    expect(calls).toBe(3); // 1 try + 2 retries
    expect(r.error?.type).toBe('http_503');
  });

  it('skips a provider with a missing API key without calling it', async () => {
    delete process.env.TEST_KEY;
    let called = false;
    const a: ProviderAdapter = {
      name: 'a',
      envKey: 'TEST_KEY',
      call: async () => {
        called = true;
        throw new Error('should not run');
      },
    };
    const r = await runOne(a, 'm', req, opts, pricing);
    expect(called).toBe(false);
    expect(r.error?.type).toBe('missing_api_key');
  });

  it('classifies retryable errors and redacts secrets', () => {
    expect(isRetryable(Object.assign(new Error(), { status: 429 }))).toBe(true);
    expect(isRetryable(Object.assign(new Error(), { status: 500 }))).toBe(true);
    expect(isRetryable(Object.assign(new Error(), { status: 401 }))).toBe(false);
    expect(isRetryable(Object.assign(new Error(), { code: 'ECONNRESET' }))).toBe(true);
    process.env.OPENAI_API_KEY = 'sk-supersecretvalue123';
    expect(redact('bad key sk-supersecretvalue123 used')).not.toContain('supersecret');
    delete process.env.OPENAI_API_KEY;
  });
});
