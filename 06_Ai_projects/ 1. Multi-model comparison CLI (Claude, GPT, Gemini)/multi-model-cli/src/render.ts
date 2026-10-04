import type { NormalizedResponse } from './types.js';

const secs = (ms: number | undefined) => (ms === undefined ? '-' : `${(ms / 1000).toFixed(2)}s`);
const usd = (v: number | null) => (v === null ? 'n/a' : `$${v.toFixed(4)}`);

export function formatTable(results: NormalizedResponse[]): string {
  const header = ['Provider', 'Model', 'Latency', 'TTFT', 'In/Out tok', 'Cost', 'Status'];
  const rows = results.map((r) => [
    r.provider,
    r.model,
    secs(r.latencyMs),
    secs(r.ttftMs),
    `${r.inputTokens} / ${r.outputTokens}`,
    usd(r.costUsd),
    r.error ? `${r.error.type}` : r.finishReason,
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i]!.length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join('  ').trimEnd();
  return [line(header), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n');
}

export function formatAnswers(results: NormalizedResponse[]): string {
  return results
    .map((r) => {
      const body = r.error ? `[error: ${r.error.message}]` : r.text.trim() || '[empty response]';
      return `--- ${r.provider} ---\n${body}`;
    })
    .join('\n\n');
}

export function renderRun(prompt: string, results: NormalizedResponse[]): string {
  const preview = prompt.length > 120 ? `${prompt.slice(0, 117)}...` : prompt;
  return `Prompt: ${preview}\n\n${formatTable(results)}\n\n${formatAnswers(results)}\n`;
}
