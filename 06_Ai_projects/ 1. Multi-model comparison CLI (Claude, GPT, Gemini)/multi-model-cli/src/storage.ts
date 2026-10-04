import fs from 'node:fs';
import path from 'node:path';
import type { RunRecord } from './types.js';

/** Appends one run to results/<YYYY-MM-DD>.jsonl and returns the file path. */
export function appendRun(record: RunRecord, dir = 'results'): string {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${record.timestamp.slice(0, 10)}.jsonl`);
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
  return file;
}

export function readRuns(dir = 'results'): RunRecord[] {
  if (!fs.existsSync(dir)) return [];
  const records: RunRecord[] = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.jsonl')).sort()) {
    const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        records.push(JSON.parse(line) as RunRecord);
      } catch {
        // Skip a corrupt line rather than failing the whole report.
      }
    }
  }
  return records;
}
