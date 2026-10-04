import { GoogleGenAI } from '@google/genai';
import type { CompareRequest, ProviderAdapter, RawResult } from '../types.js';

interface Usage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
}

// Thinking models bill "thought" tokens as output, so count them as output.
const outTokens = (u: Usage | undefined) =>
  (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0);

export const geminiAdapter: ProviderAdapter = {
  name: 'gemini',
  envKey: 'GEMINI_API_KEY',

  async call(req: CompareRequest, model: string, signal: AbortSignal): Promise<RawResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const t0 = performance.now();

    // Gemini puts system prompt, temperature and token cap inside `config`.
    const params = {
      model,
      contents: req.prompt,
      config: {
        abortSignal: signal,
        maxOutputTokens: req.maxTokens,
        ...(req.system ? { systemInstruction: req.system } : {}),
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      },
    };

    if (!req.stream) {
      const res = await ai.models.generateContent(params);
      return {
        model,
        text: res.text ?? '',
        inputTokens: res.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: outTokens(res.usageMetadata),
        finishReason: String(res.candidates?.[0]?.finishReason ?? 'unknown'),
      };
    }

    const stream = await ai.models.generateContentStream(params);
    let text = '';
    let ttftMs: number | undefined;
    let usage: Usage | undefined;
    let finishReason = 'unknown';
    for await (const chunk of stream) {
      const piece = chunk.text;
      if (piece) {
        ttftMs ??= performance.now() - t0;
        text += piece;
      }
      if (chunk.usageMetadata) usage = chunk.usageMetadata;
      const fr = chunk.candidates?.[0]?.finishReason;
      if (fr) finishReason = String(fr);
    }
    return {
      model,
      text,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: outTokens(usage),
      ttftMs,
      finishReason,
    };
  },
};
