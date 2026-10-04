import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  anthropicCreate: vi.fn(),
  anthropicStream: vi.fn(),
  openaiCreate: vi.fn(),
  geminiGenerate: vi.fn(),
  geminiStream: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: m.anthropicCreate, stream: m.anthropicStream };
  },
}));
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: m.openaiCreate } };
  },
}));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: m.geminiGenerate, generateContentStream: m.geminiStream };
  },
}));

import { anthropicAdapter } from '../src/providers/anthropic.js';
import { geminiAdapter } from '../src/providers/gemini.js';
import { openaiAdapter } from '../src/providers/openai.js';

const signal = new AbortController().signal;
const req = { prompt: 'hi', system: 'be brief', temperature: 0.2, maxTokens: 50, stream: false };

beforeEach(() => vi.clearAllMocks());

describe('anthropic adapter', () => {
  it('maps system prompt and max_tokens, and normalizes usage', async () => {
    m.anthropicCreate.mockResolvedValue({
      model: 'claude-x',
      content: [{ type: 'text', text: 'hello' }],
      usage: { input_tokens: 5, output_tokens: 7 },
      stop_reason: 'end_turn',
    });
    const r = await anthropicAdapter.call(req, 'claude-x', signal);
    const params = m.anthropicCreate.mock.calls[0]![0];
    expect(params.system).toBe('be brief');
    expect(params.max_tokens).toBe(50);
    expect(r).toMatchObject({ text: 'hello', inputTokens: 5, outputTokens: 7, finishReason: 'end_turn' });
  });

  it('records TTFT when streaming', async () => {
    let onText: () => void = () => {};
    m.anthropicStream.mockReturnValue({
      on: (_e: string, cb: () => void) => {
        onText = cb;
      },
      finalMessage: async () => {
        onText();
        return {
          model: 'claude-x',
          content: [{ type: 'text', text: 'streamed' }],
          usage: { input_tokens: 1, output_tokens: 2 },
          stop_reason: 'end_turn',
        };
      },
    });
    const r = await anthropicAdapter.call({ ...req, stream: true }, 'claude-x', signal);
    expect(r.text).toBe('streamed');
    expect(r.ttftMs).toBeTypeOf('number');
  });
});

describe('openai adapter', () => {
  it('sends system as a message and normalizes usage', async () => {
    m.openaiCreate.mockResolvedValue({
      model: 'gpt-x',
      choices: [{ message: { content: 'hey' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 4, completion_tokens: 6 },
    });
    const r = await openaiAdapter.call(req, 'gpt-x', signal);
    const params = m.openaiCreate.mock.calls[0]![0];
    expect(params.messages[0]).toEqual({ role: 'system', content: 'be brief' });
    expect(params.max_completion_tokens).toBe(50);
    expect(r).toMatchObject({ text: 'hey', inputTokens: 4, outputTokens: 6, finishReason: 'stop' });
  });

  it('collects streamed chunks, TTFT and final usage', async () => {
    async function* chunks() {
      yield { model: 'gpt-x', choices: [{ delta: { content: 'he' } }] };
      yield { model: 'gpt-x', choices: [{ delta: { content: 'y' }, finish_reason: 'stop' }] };
      yield { model: 'gpt-x', choices: [], usage: { prompt_tokens: 3, completion_tokens: 2 } };
    }
    m.openaiCreate.mockResolvedValue(chunks());
    const r = await openaiAdapter.call({ ...req, stream: true }, 'gpt-x', signal);
    expect(m.openaiCreate.mock.calls[0]![0].stream_options).toEqual({ include_usage: true });
    expect(r).toMatchObject({ text: 'hey', inputTokens: 3, outputTokens: 2, finishReason: 'stop' });
    expect(r.ttftMs).toBeTypeOf('number');
  });
});

describe('gemini adapter', () => {
  it('puts system prompt in config and counts thought tokens as output', async () => {
    m.geminiGenerate.mockResolvedValue({
      text: 'hi there',
      usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 10, thoughtsTokenCount: 5 },
      candidates: [{ finishReason: 'STOP' }],
    });
    const r = await geminiAdapter.call(req, 'gemini-x', signal);
    const params = m.geminiGenerate.mock.calls[0]![0];
    expect(params.config.systemInstruction).toBe('be brief');
    expect(params.config.maxOutputTokens).toBe(50);
    expect(r).toMatchObject({ text: 'hi there', inputTokens: 8, outputTokens: 15, finishReason: 'STOP' });
  });

  it('streams text and keeps the last usage metadata', async () => {
    async function* chunks() {
      yield { text: 'a', candidates: [{}] };
      yield {
        text: 'b',
        usageMetadata: { promptTokenCount: 2, candidatesTokenCount: 2 },
        candidates: [{ finishReason: 'STOP' }],
      };
    }
    m.geminiStream.mockResolvedValue(chunks());
    const r = await geminiAdapter.call({ ...req, stream: true }, 'gemini-x', signal);
    expect(r).toMatchObject({ text: 'ab', inputTokens: 2, outputTokens: 2, finishReason: 'STOP' });
    expect(r.ttftMs).toBeTypeOf('number');
  });
});
