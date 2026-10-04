import type { Pricing } from './config.js';
import { computeCost } from './cost.js';
import type {
  CompareRequest,
  ErrorInfo,
  NormalizedResponse,
  ProviderAdapter,
} from './types.js';

export interface RunOptions {
  timeoutMs: number;
  retries: number;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const NETWORK_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED']);

function statusOf(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const s = (err as { status: unknown }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

/** Retry only 429, 5xx and network errors. Never retry 4xx such as 400/401. */
export function isRetryable(err: unknown): boolean {
  const status = statusOf(err);
  if (status !== undefined) return status === 429 || status >= 500;
  if (typeof err === 'object' && err !== null) {
    const e = err as { code?: unknown; name?: unknown };
    if (typeof e.code === 'string' && NETWORK_CODES.has(e.code)) return true;
    if (typeof e.name === 'string' && /Connection/i.test(e.name)) return true;
  }
  return false;
}

/** Strips anything that looks like a configured API key from error text. */
export function redact(message: string): string {
  let out = message;
  for (const k of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY']) {
    const v = process.env[k];
    if (v && v.length > 6) out = out.split(v).join('[redacted]');
  }
  return out.replace(/\b(sk-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{20,})\b/g, '[redacted]').slice(0, 300);
}

export function classifyError(err: unknown, timedOut: boolean): ErrorInfo {
  if (timedOut) return { type: 'timeout', message: 'Request timed out' };
  const status = statusOf(err);
  const message = redact(err instanceof Error ? err.message : String(err));
  return { type: status !== undefined ? `http_${status}` : 'error', message };
}

function failed(
  provider: string,
  model: string,
  latencyMs: number,
  attempts: number,
  error: ErrorInfo,
): NormalizedResponse {
  return {
    provider,
    model,
    text: '',
    inputTokens: 0,
    outputTokens: 0,
    latencyMs,
    costUsd: null,
    finishReason: 'error',
    attempts,
    error,
  };
}

export async function runOne(
  adapter: ProviderAdapter,
  model: string,
  req: CompareRequest,
  opts: RunOptions,
  pricing: Pricing,
): Promise<NormalizedResponse> {
  if (!process.env[adapter.envKey]) {
    return failed(adapter.name, model, 0, 0, {
      type: 'missing_api_key',
      message: `${adapter.envKey} is not set; provider skipped`,
    });
  }

  const sleep = opts.sleep ?? defaultSleep;
  const start = performance.now();
  let attempts = 0;

  for (;;) {
    attempts++;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
    try {
      const raw = await adapter.call(req, model, ctrl.signal);
      clearTimeout(timer);
      const resolvedModel = raw.model || model;
      return {
        provider: adapter.name,
        model: resolvedModel,
        text: raw.text,
        inputTokens: raw.inputTokens,
        outputTokens: raw.outputTokens,
        latencyMs: Math.round(performance.now() - start),
        ttftMs: raw.ttftMs === undefined ? undefined : Math.round(raw.ttftMs),
        // Pricing is keyed by the configured model name, not the dated alias returned by the API.
        costUsd: computeCost(model, raw.inputTokens, raw.outputTokens, pricing),
        finishReason: raw.finishReason,
        attempts,
      };
    } catch (err) {
      clearTimeout(timer);
      const timedOut = ctrl.signal.aborted;
      if (!timedOut && attempts <= opts.retries && isRetryable(err)) {
        const backoff = 500 * 2 ** (attempts - 1) + Math.floor(Math.random() * 250);
        await sleep(backoff);
        continue;
      }
      return failed(
        adapter.name,
        model,
        Math.round(performance.now() - start),
        attempts,
        classifyError(err, timedOut),
      );
    }
  }
}

/** Runs every provider in parallel. One failure never blocks the others. */
export async function compareAll(
  targets: Array<{ adapter: ProviderAdapter; model: string }>,
  req: CompareRequest,
  opts: RunOptions,
  pricing: Pricing,
): Promise<NormalizedResponse[]> {
  const settled = await Promise.allSettled(
    targets.map((t) => runOne(t.adapter, t.model, req, opts, pricing)),
  );
  return settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    const t = targets[i]!;
    return failed(t.adapter.name, t.model, 0, 0, classifyError(s.reason, false));
  });
}
