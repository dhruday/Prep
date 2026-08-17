/**
 * Local vector store — zero-dependency fallback when Pinecone is not configured.
 * Stores vectors + metadata in a JSON file at .vectors.json in the project root.
 * Uses cosine similarity for nearest-neighbour search.
 *
 * Automatically used when PINECONE_API_KEY is missing or set to "replace-me".
 */

import fs from "fs";
import path from "path";
import type { PineconeVector, PineconeQueryResult, ChunkMetadata } from "@/types";

const STORE_PATH = path.join(process.cwd(), ".vectors.json");

interface StoredVector {
  id: string;
  values: number[];
  metadata: Record<string, unknown>;
}

interface VectorStore {
  vectors: StoredVector[];
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function load(): VectorStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
    }
  } catch {
    // corrupt file — start fresh
  }
  return { vectors: [] };
}

function save(store: VectorStore): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store), "utf-8");
}

// ─── Math ─────────────────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Public API (mirrors Pinecone interface) ──────────────────────────────────

export async function localUpsert(vectors: PineconeVector[]): Promise<void> {
  const store = load();

  for (const v of vectors) {
    const idx = store.vectors.findIndex((s) => s.id === v.id);
    const entry: StoredVector = {
      id: v.id,
      values: v.values,
      metadata: v.metadata as unknown as Record<string, unknown>,
    };
    if (idx >= 0) {
      store.vectors[idx] = entry; // overwrite existing
    } else {
      store.vectors.push(entry);
    }
  }

  save(store);
  console.log(`[LocalStore] Upserted ${vectors.length} vectors. Total: ${store.vectors.length}`);
}

export async function localQuery(
  embedding: number[],
  topK = 5,
  _filter?: Record<string, string>
): Promise<PineconeQueryResult[]> {
  const store = load();

  if (store.vectors.length === 0) return [];

  const scored = store.vectors.map((v) => ({
    v,
    score: cosineSimilarity(embedding, v.values),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored
    .slice(0, topK)
    .filter((s) => s.score > 0.3)
    .map((s) => ({
      id: s.v.id,
      score: s.score,
      metadata: s.v.metadata as unknown as ChunkMetadata & { text: string },
    }));
}

export async function localEnsureIndex(): Promise<void> {
  // No-op for local store — file is created on first upsert
}

export async function localDeleteBySource(source: string): Promise<void> {
  const store = load();
  const before = store.vectors.length;
  store.vectors = store.vectors.filter((v) => v.metadata.source !== source);
  save(store);
  console.log(`[LocalStore] Deleted ${before - store.vectors.length} vectors for source: ${source}`);
}

/** Returns total number of vectors in the local store */
export function localCount(): number {
  return load().vectors.length;
}
