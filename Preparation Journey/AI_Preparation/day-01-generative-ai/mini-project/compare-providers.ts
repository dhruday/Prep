/**
 * Day 01 · Mini Project — Multi-Provider Comparison
 *
 * Sends the SAME prompt to OpenAI, Anthropic, and Google in parallel,
 * then prints all three responses side by side.
 *
 * Run with:  npm run start
 *
 * You need to fill in three TODOs below. That's the exercise.
 */

import 'dotenv/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface ProviderResponse {
  provider: string;
  model: string;
  text: string;
  tokensUsed: number | null;
  latencyMs: number;
  error?: string;
}

// -----------------------------------------------------------------------------
// Provider clients (initialized once)
// -----------------------------------------------------------------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? '');

// -----------------------------------------------------------------------------
// TODO #1 — Implement callOpenAI
// Docs: https://platform.openai.com/docs/api-reference/chat
// Use model: 'gpt-4o-mini'
// Return a ProviderResponse populated with the model's text response.
// -----------------------------------------------------------------------------
async function callOpenAI(prompt: string): Promise<ProviderResponse> {
  const start = Date.now();
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
    });

    return {
      provider: 'OpenAI',
      model: response.model,
      text: response.choices[0]?.message?.content ?? '(empty)',
      tokensUsed: response.usage?.total_tokens ?? null,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      provider: 'OpenAI',
      model: 'gpt-4o-mini',
      text: '',
      tokensUsed: null,
      latencyMs: Date.now() - start,
      error: (err as Error).message,
    };
  }
}

// -----------------------------------------------------------------------------
// TODO #2 — Implement callClaude
// Docs: https://docs.anthropic.com/en/api/messages
// Use model: 'claude-3-5-haiku-latest'
// Note: Anthropic returns content as an array of blocks — you want the first text block.
// -----------------------------------------------------------------------------
async function callClaude(prompt: string): Promise<ProviderResponse> {
  const start = Date.now();
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    // Anthropic returns content as an array of content blocks
    const firstBlock = response.content[0];
    const text =
      firstBlock && firstBlock.type === 'text' ? firstBlock.text : '(no text block)';

    return {
      provider: 'Anthropic',
      model: response.model,
      text,
      tokensUsed:
        (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      provider: 'Anthropic',
      model: 'claude-3-5-haiku-latest',
      text: '',
      tokensUsed: null,
      latencyMs: Date.now() - start,
      error: (err as Error).message,
    };
  }
}

// -----------------------------------------------------------------------------
// TODO #3 — Implement callGemini
// Docs: https://ai.google.dev/gemini-api/docs
// Use model: 'gemini-1.5-flash'
// -----------------------------------------------------------------------------
async function callGemini(prompt: string): Promise<ProviderResponse> {
  const start = Date.now();
  try {
    const model = google.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response;

    return {
      provider: 'Google',
      model: 'gemini-1.5-flash',
      text: response.text(),
      // Gemini SDK exposes usageMetadata on the response
      tokensUsed: response.usageMetadata?.totalTokenCount ?? null,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      provider: 'Google',
      model: 'gemini-1.5-flash',
      text: '',
      tokensUsed: null,
      latencyMs: Date.now() - start,
      error: (err as Error).message,
    };
  }
}

// -----------------------------------------------------------------------------
// Print helper — clean side-by-side output
// -----------------------------------------------------------------------------
function printResponse(r: ProviderResponse): void {
  const header = `--- ${r.provider} (${r.model}) [${(r.latencyMs / 1000).toFixed(1)}s, ${r.tokensUsed ?? '?'} tokens] ---`;
  console.log(header);
  if (r.error) {
    console.log(`❌ ERROR: ${r.error}`);
  } else {
    console.log(r.text);
  }
  console.log('');
}

// -----------------------------------------------------------------------------
// Main — try these three prompts in turn
// -----------------------------------------------------------------------------
async function main(): Promise<void> {
  // Change this prompt and re-run to feel each provider's personality.
  const prompt =
    'Write a two-line haiku about a broken code deploy at 3am.';

  const banner = '='.repeat(70);
  console.log(`\n${banner}`);
  console.log(` PROMPT: ${prompt}`);
  console.log(`${banner}\n`);

  // Fire all three in parallel — total time = slowest response, not sum.
  const [openaiRes, claudeRes, geminiRes] = await Promise.all([
    callOpenAI(prompt),
    callClaude(prompt),
    callGemini(prompt),
  ]);

  printResponse(openaiRes);
  printResponse(claudeRes);
  printResponse(geminiRes);

  console.log(banner);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
