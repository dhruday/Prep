import { Pinecone } from "@pinecone-database/pinecone";
import type { PineconeVector, PineconeQueryResult, ChunkMetadata } from "@/types";
import { EMBEDDING_DIMENSIONS } from "./embeddings";
import {
  localUpsert,
  localQuery,
  localEnsureIndex,
  localDeleteBySource,
} from "./localVectorStore";

// Use local store when Pinecone is not configured
function isPineconeConfigured(): boolean {
  const key = process.env.PINECONE_API_KEY ?? "";
  return key.length > 10 && key !== "replace-me";
}

// Singleton client — reused across requests in Node runtime
let pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

function getIndex() {
  const client = getPineconeClient();
  return client.index(process.env.PINECONE_INDEX_NAME!);
}

/**
 * Upsert a batch of vectors into Pinecone (or local store if Pinecone not configured).
 * Pinecone's upsert limit is 100 vectors per request.
 */
export async function upsertVectors(vectors: PineconeVector[]): Promise<void> {
  if (!isPineconeConfigured()) {
    return localUpsert(vectors);
  }
  const index = getIndex();
  const UPSERT_BATCH = 100;

  for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
    const batch = vectors.slice(i, i + UPSERT_BATCH);
    await index.upsert(
      batch.map((v) => ({
        id: v.id,
        values: v.values,
        metadata: v.metadata as unknown as Record<string, string | number | boolean>,
      }))
    );
  }
}

/**
 * Semantic similarity search.
 * Returns top-k most similar chunks with their metadata.
 */
export async function querySimilar(
  embedding: number[],
  topK = 5,
  filter?: Record<string, string>
): Promise<PineconeQueryResult[]> {
  if (!isPineconeConfigured()) {
    return localQuery(embedding, topK, filter);
  }
  const index = getIndex();

  const result = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
    filter,
  });

  return (result.matches ?? [])
    .filter((m) => m.score !== undefined && m.score > 0.3) // minimum relevance threshold
    .map((m) => ({
      id: m.id,
      score: m.score!,
      metadata: m.metadata as unknown as ChunkMetadata & { text: string },
    }));
}

/**
 * Delete all vectors for a specific document source.
 * Used when re-ingesting or removing a document.
 */
export async function deleteBySource(source: string): Promise<void> {
  if (!isPineconeConfigured()) {
    return localDeleteBySource(source);
  }
  const index = getIndex();
  // Pinecone supports metadata filter deletes in paid tiers
  // For Starter tier, list IDs first then delete
  await index.deleteMany({ source } as Record<string, string>);
}

/**
 * Create the Pinecone index if it doesn't exist.
 * No-op when using local store.
 */
export async function ensureIndex(): Promise<void> {
  if (!isPineconeConfigured()) {
    console.log("[VectorStore] Using local file store (Pinecone not configured)");
    return localEnsureIndex();
  }
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME!;

  const existingIndexes = await client.listIndexes();
  const exists = existingIndexes.indexes?.some((idx) => idx.name === indexName);

  if (!exists) {
    await client.createIndex({
      name: indexName,
      dimension: EMBEDDING_DIMENSIONS,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: process.env.PINECONE_ENVIRONMENT ?? "us-east-1",
        },
      },
    });
    console.log(`[Pinecone] Created index: ${indexName}`);
  }
}
