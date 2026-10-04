import Anthropic from '@anthropic-ai/sdk';
import type { CompareRequest, ProviderAdapter, RawResult } from '../types.js';

function extractText(content: Array<{ type: string; text?: string }>): string {
  let out = '';
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string') out += block.text;
  }
  return out;
}

export const anthropicAdapter: ProviderAdapter = {
  name: 'claude',
  envKey: 'ANTHROPIC_API_KEY',

  async call(req: CompareRequest, model: string, signal: AbortSignal): Promise<RawResult> {
    // maxRetries: 0 because the runner owns the retry policy.
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
    const t0 = performance.now();

    // Anthropic requires max_tokens and takes the system prompt as a top-level field.
    const params = {
      model,
      max_tokens: req.maxTokens,
      messages: [{ role: 'user' as const, content: req.prompt }],
      ...(req.system ? { system: req.system } : {}),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    };

    let ttftMs: number | undefined;
    let msg;
    if (req.stream) {
      const stream = client.messages.stream(params, { signal });
      stream.on('text', () => {
        ttftMs ??= performance.now() - t0;
      });
      msg = await stream.finalMessage();
    } else {
      msg = await client.messages.create(params, { signal });
    }

    return {
      model: msg.model ?? model,
      text: extractText(msg.content as Array<{ type: string; text?: string }>),
      inputTokens: msg.usage.input_tokens,
      outputTokens: msg.usage.output_tokens,
      ttftMs,
      finishReason: msg.stop_reason ?? 'unknown',
    };
  },
};
