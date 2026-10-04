import OpenAI from 'openai';
import type { CompareRequest, ProviderAdapter, RawResult } from '../types.js';

export const openaiAdapter: ProviderAdapter = {
  name: 'openai',
  envKey: 'OPENAI_API_KEY',

  async call(req: CompareRequest, model: string, signal: AbortSignal): Promise<RawResult> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });
    const t0 = performance.now();

    // OpenAI takes the system prompt as a message with role "system".
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      ...(req.system ? [{ role: 'system' as const, content: req.system }] : []),
      { role: 'user' as const, content: req.prompt },
    ];

    // max_completion_tokens is accepted by current models; some reasoning
    // models also reject a custom temperature, so it is only sent when set.
    const base = {
      model,
      messages,
      max_completion_tokens: req.maxTokens,
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    };

    if (!req.stream) {
      const res = await client.chat.completions.create(base, { signal });
      const choice = res.choices[0];
      return {
        model: res.model ?? model,
        text: choice?.message?.content ?? '',
        inputTokens: res.usage?.prompt_tokens ?? 0,
        outputTokens: res.usage?.completion_tokens ?? 0,
        finishReason: choice?.finish_reason ?? 'unknown',
      };
    }

    // Usage only arrives in the final chunk, and only with include_usage.
    const stream = await client.chat.completions.create(
      { ...base, stream: true, stream_options: { include_usage: true } },
      { signal },
    );
    let text = '';
    let ttftMs: number | undefined;
    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason = 'unknown';
    let resolvedModel = model;
    for await (const chunk of stream) {
      resolvedModel = chunk.model ?? resolvedModel;
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        ttftMs ??= performance.now() - t0;
        text += delta;
      }
      const fr = chunk.choices[0]?.finish_reason;
      if (fr) finishReason = fr;
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
      }
    }
    return { model: resolvedModel, text, inputTokens, outputTokens, ttftMs, finishReason };
  },
};
