/**
 * Lightweight token counter using a simple heuristic.
 * For production accuracy, use tiktoken (loaded lazily to avoid edge runtime issues).
 * Rule of thumb: 1 token ≈ 4 characters for English text.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to a maximum token budget.
 * Used for context window management before sending to GPT-4.
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const estimatedChars = maxTokens * 4;
  if (text.length <= estimatedChars) return text;
  return text.slice(0, estimatedChars) + "…";
}

/** Sum tokens across multiple strings */
export function totalTokens(texts: string[]): number {
  return texts.reduce((acc, t) => acc + estimateTokens(t), 0);
}
