// ─── Document & Chunking ──────────────────────────────────────────────────────

export interface DocumentChunk {
  id: string;          // `${sourceId}-chunk-${index}`
  text: string;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export interface ChunkMetadata {
  source: string;      // file name or URL
  title: string;
  chunkIndex: number;
  charCount: number;
  pageNumber?: number;
}

export interface IngestedDocument {
  id: string;
  title: string;
  source: string;
  type: "pdf" | "markdown" | "url";
  chunkCount: number;
  createdAt: string;
}

export interface IngestionResult {
  success: boolean;
  document: IngestedDocument;
  chunksUploaded: number;
  error?: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  sources?: SourceChunk[];
}

export interface SourceChunk {
  id: string;
  text: string;
  source: string;
  title: string;
  score: number;
}

export interface ChatRequest {
  message: string;
  conversationId: string;
  history: Array<{ role: MessageRole; content: string }>;
}

export interface ChatResponse {
  answer: string;
  sources: SourceChunk[];
  conversationId: string;
  cached: boolean;
}

// ─── Pinecone ─────────────────────────────────────────────────────────────────

export interface PineconeVector {
  id: string;
  values: number[];
  metadata: ChunkMetadata & { text: string };
}

export interface PineconeQueryResult {
  id: string;
  score: number;
  metadata: ChunkMetadata & { text: string };
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}
