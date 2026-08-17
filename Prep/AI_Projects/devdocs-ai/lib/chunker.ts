import { estimateTokens } from "@/utils/tokens";
import type { DocumentChunk } from "@/types";

interface ChunkOptions {
  chunkSize?: number;      // target token count per chunk (default: 750)
  chunkOverlap?: number;   // overlap in tokens between adjacent chunks (default: 100)
  source: string;
  title: string;
}

/**
 * Split a long text into overlapping chunks of ~750 tokens.
 *
 * Strategy:
 * 1. Split on paragraph breaks (double newline) first — respects document structure
 * 2. If a paragraph is still too large, split by sentence
 * 3. Accumulate sentences into chunks until token budget is hit
 * 4. Add overlap by prepending the tail of the previous chunk
 */
export function chunkText(text: string, options: ChunkOptions): DocumentChunk[] {
  const {
    chunkSize = 750,
    chunkOverlap = 100,
    source,
    title,
  } = options;

  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Flatten paragraphs into sentences, keeping source paragraph index
  const sentences: string[] = [];
  for (const para of paragraphs) {
    const segs = splitIntoSentences(para);
    sentences.push(...segs);
  }

  const chunks: string[] = [];
  let current = "";
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > chunkSize && current.length > 0) {
      chunks.push(current.trim());

      // Build overlap: take last `chunkOverlap` tokens from current chunk
      const overlapText = getLastNTokens(current, chunkOverlap);
      current = overlapText + " " + sentence;
      currentTokens = estimateTokens(current);
    } else {
      current += (current ? " " : "") + sentence;
      currentTokens += sentenceTokens;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.map((text, index) => ({
    id: `${sanitizeId(source)}-chunk-${index}-${crypto.randomUUID().slice(0, 8)}`,
    text,
    metadata: {
      source,
      title,
      chunkIndex: index,
      charCount: text.length,
    },
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Split text into sentences using punctuation boundaries */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Return the last N tokens of a text string */
function getLastNTokens(text: string, n: number): string {
  const words = text.split(/\s+/);
  // Rough approximation: 1 token ≈ 0.75 words
  const wordCount = Math.ceil(n * 0.75);
  return words.slice(-wordCount).join(" ");
}

/** Sanitize a string to be a valid Pinecone vector ID */
function sanitizeId(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}
