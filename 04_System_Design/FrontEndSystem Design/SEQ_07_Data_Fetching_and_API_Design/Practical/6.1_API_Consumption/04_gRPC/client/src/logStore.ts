/**
 * logStore.ts — Minimal pub/sub log store for the Interceptor lab.
 *
 * Zero dependencies. Interceptors push entries here; the InterceptorLog
 * component subscribes and re-renders whenever a new entry arrives.
 *
 * Why not React context / Zustand?
 *   Interceptors live outside React (they're constructed once at module level).
 *   A plain module-level pub/sub is the simplest correct approach.
 */

export type LogEventKind =
  | 'request'        // outbound RPC call started
  | 'response'       // RPC completed (unary) or stream established (streaming)
  | 'token-added'    // auth interceptor injected a token
  | 'token-refresh'  // auth interceptor triggered a token refresh
  | 'stream-data'    // a single streaming message received
  | 'error';         // RPC threw

export interface LogEntry {
  id: number;
  timestamp: string;        // HH:MM:SS.mmm
  event: LogEventKind;
  method: string;           // RPC name, e.g. "GetUser"
  detail: string;           // human-readable description
  durationMs?: number;      // only on 'response' events
}

type Listener = (entries: LogEntry[]) => void;

let entries: LogEntry[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function now(): string {
  const d = new Date();
  const hms = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${hms}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

export const logStore = {
  /** Push a new log entry and notify all subscribers. */
  push(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const newEntry: LogEntry = { ...entry, id: nextId++, timestamp: now() };
    entries = [newEntry, ...entries].slice(0, 100); // cap at 100 entries
    listeners.forEach((fn) => fn(entries));
  },

  /** Subscribe to log updates. Returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(entries); // send current snapshot immediately
    return () => listeners.delete(fn);
  },

  /** Clear all log entries. */
  clear(): void {
    entries = [];
    listeners.forEach((fn) => fn(entries));
  },
};
