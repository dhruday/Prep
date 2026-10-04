import type { RunRecord } from './types.js';

export function percentile(values: number[], p: number): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid];
}

export interface ProviderSummary {
  provider: string;
  model: string;
  calls: number;
  errors: number;
  medianLatencyMs?: number;
  p95LatencyMs?: number;
  medianTtftMs?: number;
  /** Total cost divided by total output tokens, scaled to 1K tokens. */
  costPer1KOutput?: number;
}

export function summarize(records: RunRecord[]): ProviderSummary[] {
  const byProvider = new Map<string, RunRecord['results']>();
  for (const rec of records) {
    for (const r of rec.results) {
      if (r.error?.type === 'missing_api_key') continue;
      const list = byProvider.get(r.provider) ?? [];
      list.push(r);
      byProvider.set(r.provider, list);
    }
  }
  return [...byProvider.entries()].map(([provider, all]) => {
    const ok = all.filter((r) => !r.error);
    const priced = ok.filter((r) => r.costUsd !== null && r.outputTokens > 0);
    const cost = priced.reduce((s, r) => s + (r.costUsd ?? 0), 0);
    const outTok = priced.reduce((s, r) => s + r.outputTokens, 0);
    const ttfts = ok.flatMap((r) => (r.ttftMs === undefined ? [] : [r.ttftMs]));
    const lat = ok.map((r) => r.latencyMs);
    return {
      provider,
      model: all[all.length - 1]?.model ?? '',
      calls: all.length,
      errors: all.length - ok.length,
      medianLatencyMs: median(lat),
      p95LatencyMs: percentile(lat, 95),
      medianTtftMs: median(ttfts),
      costPer1KOutput: outTok > 0 ? (cost / outTok) * 1000 : undefined,
    };
  });
}

export function formatReport(summaries: ProviderSummary[]): string {
  if (summaries.length === 0) return 'No results found. Run some comparisons first.';
  const s = (v: number | undefined) => (v === undefined ? '-' : `${(v / 1000).toFixed(2)}s`);
  const header = ['Provider', 'Model', 'Calls', 'Errors', 'Med latency', 'p95 latency', 'Med TTFT', '$/1K out'];
  const rows = summaries.map((x) => [
    x.provider,
    x.model,
    String(x.calls),
    String(x.errors),
    s(x.medianLatencyMs),
    s(x.p95LatencyMs),
    s(x.medianTtftMs),
    x.costPer1KOutput === undefined ? 'n/a' : `$${x.costPer1KOutput.toFixed(4)}`,
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const line = (c: string[]) => c.map((v, i) => v.padEnd(widths[i]!)).join('  ').trimEnd();
  return [line(header), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n');
}
