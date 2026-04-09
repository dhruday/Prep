// Uses Hyperspace AI's OpenAI-compatible embeddings endpoint via raw fetch.
// The OpenAI SDK adds X-Stainless-* headers that Hyperspace rejects with 400,
// so we call the endpoint directly.

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 100;

function getEmbedConfig() {
  return {
    url: `${process.env.HYPERSPACE_OPENAI_URL ?? "http://localhost:6655/openai/v1"}/embeddings`,
    key: process.env.HYPERSPACE_API_KEY ?? "",
  };
}

interface EmbeddingResponse {
  data: { index: number; embedding: number[] }[];
}

async function callEmbeddings(input: string | string[]): Promise<EmbeddingResponse> {
  const { url, key } = getEmbedConfig();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input, dimensions: EMBEDDING_DIMENSIONS }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Embeddings request failed: HTTP ${res.status}${body ? ` — ${body}` : ""}`);
  }

  return res.json() as Promise<EmbeddingResponse>;
}

/**
 * Generate an embedding for a single text string.
 * Used for query embeddings at query time.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleaned = text.replace(/\n/g, " ").trim();
  const response = await callEmbeddings(cleaned);
  return response.data[0].embedding;
}

/**
 * Generate embeddings for a batch of texts.
 * Automatically splits into sub-batches if > MAX_BATCH_SIZE.
 * Used during document ingestion for efficiency.
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE).map((t) =>
      t.replace(/\n/g, " ").trim()
    );
    const response = await callEmbeddings(batch);
    const sorted = [...response.data].sort((a, b) => a.index - b.index);
    results.push(...sorted.map((item) => item.embedding));
  }

  return results;
}

export { EMBEDDING_DIMENSIONS };
