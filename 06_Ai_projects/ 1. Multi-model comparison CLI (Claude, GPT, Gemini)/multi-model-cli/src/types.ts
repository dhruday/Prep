export interface CompareRequest {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens: number;
  stream: boolean;
}

/** What an adapter returns. The runner adds latency, cost and error handling. */
export interface RawResult {
  model: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  /** Time to first token in ms, only when streaming. */
  ttftMs?: number;
  finishReason: string;
}

export interface ProviderAdapter {
  /** Short name used in --models and config.json, e.g. "claude". */
  name: string;
  /** Environment variable holding the API key. */
  envKey: string;
  call(req: CompareRequest, model: string, signal: AbortSignal): Promise<RawResult>;
}

export interface ErrorInfo {
  type: string;
  message: string;
}

export interface NormalizedResponse {
  provider: string;
  model: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  ttftMs?: number;
  /** null when pricing for the model is not configured. */
  costUsd: number | null;
  finishReason: string;
  attempts: number;
  error?: ErrorInfo;
}

export interface RunRecord {
  timestamp: string;
  promptId?: string;
  category?: string;
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens: number;
  stream: boolean;
  results: NormalizedResponse[];
}
