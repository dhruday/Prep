import { NextRequest } from "next/server";
import { streamHyperspace } from "@/lib/hyperspace";
import { generateEmbedding } from "@/lib/embeddings";
import { querySimilar } from "@/lib/pinecone";
import { buildPromptMessages } from "@/lib/prompt";
import { getCachedResponse, setCachedResponse } from "@/lib/cache";
import { getApiHistory, addMessage } from "@/lib/memory";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";
import type { ChatRequest, ChatMessage, SourceChunk } from "@/types";

// Node runtime required: pinecone.ts imports localVectorStore which uses fs/path
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const { allowed, remaining, reset } = await checkRateLimit(request);
  if (!allowed) {
    return rateLimitResponse(reset);
  }

  // ── 2. Parse & validate request body ────────────────────────────────────────
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { message, conversationId } = body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Sanitize user input — strip null bytes and limit length
  const sanitizedMessage = message.replace(/\0/g, "").trim().slice(0, 2000);
  const convId = conversationId ?? crypto.randomUUID();

  // ── 3. Check cache for identical queries ─────────────────────────────────────
  const cached = await getCachedResponse(sanitizedMessage);
  if (cached) {
    return streamCachedResponse(cached.answer, cached.sources, convId);
  }

  // ── 4. Generate query embedding ──────────────────────────────────────────────
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(sanitizedMessage);
  } catch (error) {
    console.error("[Chat] Embedding error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process query. Please try again." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 5. Semantic search in Pinecone ────────────────────────────────────────────
  let sources: SourceChunk[] = [];
  try {
    const results = await querySimilar(queryEmbedding, 5);
    sources = results.map((r) => ({
      id: r.id,
      text: r.metadata.text,
      source: r.metadata.source,
      title: r.metadata.title,
      score: r.score,
    }));
  } catch (error) {
    console.error("[Chat] Pinecone query error:", error);
    // Continue without context — model will say it couldn't find info
  }

  // ── 6. Build prompt (Anthropic format: system + messages) ────────────────────
  const history = getApiHistory(convId);
  const { system, messages } = buildPromptMessages(sanitizedMessage, sources, history);

  // ── 7. Store user message in memory ──────────────────────────────────────────
  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: sanitizedMessage,
    createdAt: new Date(),
  };
  addMessage(convId, userMsg);

  // ── 8. Stream response from Hyperspace AI ─────────────────────────────────────
  let hyperspaceStream: ReadableStream<string>;
  try {
    hyperspaceStream = await streamHyperspace(system, messages);
  } catch (error) {
    console.error("[Chat] Hyperspace stream error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to reach Hyperspace AI. Make sure it is running on port 6655." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 9. Forward as SSE to browser ─────────────────────────────────────────────
  const encoder = new TextEncoder();
  let fullAnswer = "";

  const readable = new ReadableStream({
    async start(controller) {
      // First event: send sources immediately so UI can render citations
      controller.enqueue(
        encoder.encode(
          `event: sources\ndata: ${JSON.stringify({ sources, conversationId: convId })}\n\n`
        )
      );

      // Stream text deltas from Hyperspace → SSE tokens
      const reader = hyperspaceStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            fullAnswer += value;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ token: value })}\n\n`)
            );
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Done event
      controller.enqueue(
        encoder.encode(`event: done\ndata: ${JSON.stringify({ conversationId: convId })}\n\n`)
      );

      // Persist to memory + cache
      addMessage(convId, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullAnswer,
        createdAt: new Date(),
        sources,
      });
      await setCachedResponse(sanitizedMessage, { answer: fullAnswer, sources });

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-RateLimit-Remaining": remaining.toString(),
    },
  });
}

// ─── Helper: replay a cached response as SSE ──────────────────────────────────

function streamCachedResponse(
  answer: string,
  sources: SourceChunk[],
  conversationId: string
): Response {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `event: sources\ndata: ${JSON.stringify({ sources, conversationId })}\n\n`
        )
      );

      // Re-stream in small chunks to preserve typing-effect UX
      const CHUNK_SIZE = 8;
      for (let i = 0; i < answer.length; i += CHUNK_SIZE) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ token: answer.slice(i, i + CHUNK_SIZE), cached: true })}\n\n`
          )
        );
      }

      controller.enqueue(
        encoder.encode(
          `event: done\ndata: ${JSON.stringify({ conversationId, cached: true })}\n\n`
        )
      );
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Cache": "HIT",
    },
  });
}

