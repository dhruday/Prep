import { NextRequest, NextResponse } from "next/server";
import { parsePdf, parseMarkdown, parseUrl } from "@/lib/parsers";
import { chunkText } from "@/lib/chunker";
import { generateEmbeddingsBatch } from "@/lib/embeddings";
import { upsertVectors, ensureIndex } from "@/lib/pinecone";
import type { IngestionResult, PineconeVector } from "@/types";

// Node runtime required for pdf-parse
export const runtime = "nodejs";
export const maxDuration = 60; // 60s for large documents

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let result: IngestionResult;

    if (contentType.includes("multipart/form-data")) {
      result = await handleFileUpload(request);
    } else if (contentType.includes("application/json")) {
      result = await handleUrlIngestion(request);
    } else {
      return NextResponse.json(
        { error: "Unsupported content type. Use multipart/form-data for files or application/json for URLs." },
        { status: 415 }
      );
    }

    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Ingest] Error:", message);
    // Return the real error message so the UI can show it
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// ─── File Upload Handler ───────────────────────────────────────────────────────

async function handleFileUpload(request: NextRequest): Promise<IngestionResult> {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new Error("No file provided in form data");
  }

  // Validate file size (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("File too large. Maximum size is 10MB.");
  }

  const filename = sanitizeFilename(file.name);
  const ext = filename.split(".").pop()?.toLowerCase();

  let text: string;
  let title: string;
  let type: "pdf" | "markdown";

  if (ext === "pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parsePdf(buffer, filename);
    text = parsed.text;
    title = parsed.title;
    type = "pdf";
  } else if (ext === "md" || ext === "mdx" || ext === "txt") {
    const content = await file.text();
    const parsed = parseMarkdown(content, filename);
    text = parsed.text;
    title = parsed.title;
    type = "markdown";
  } else {
    throw new Error("Unsupported file type. Only PDF, Markdown (.md), and text files are supported.");
  }

  return await ingestText({ text, title, source: filename, type });
}

// ─── URL Ingestion Handler ─────────────────────────────────────────────────────

async function handleUrlIngestion(request: NextRequest): Promise<IngestionResult> {
  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    throw new Error("Invalid request: 'url' field is required");
  }

  const parsed = await parseUrl(url);
  return await ingestText({
    text: parsed.text,
    title: parsed.title,
    source: url,
    type: "url",
  });
}

// ─── Core Ingestion Logic ──────────────────────────────────────────────────────

interface IngestParams {
  text: string;
  title: string;
  source: string;
  type: "pdf" | "markdown" | "url";
}

async function ingestText(params: IngestParams): Promise<IngestionResult> {
  const { text, title, source, type } = params;

  if (text.length < 50) {
    throw new Error("Document is too short to be useful (less than 50 characters).");
  }

  // 1. Chunk the document
  const chunks = chunkText(text, {
    chunkSize: 750,
    chunkOverlap: 100,
    source,
    title,
  });

  if (chunks.length === 0) {
    throw new Error("No chunks generated from document — document may be empty.");
  }

  // 2. Generate embeddings in batch
  const texts = chunks.map((c) => c.text);
  const embeddings = await generateEmbeddingsBatch(texts);

  // 3. Ensure index exists
  await ensureIndex();

  // 4. Build Pinecone vectors
  const vectors: PineconeVector[] = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: embeddings[i],
    metadata: {
      ...chunk.metadata,
      text: chunk.text,
    },
  }));

  // 5. Upsert to Pinecone
  await upsertVectors(vectors);

  const docId = crypto.randomUUID();

  return {
    success: true,
    document: {
      id: docId,
      title,
      source,
      type,
      chunkCount: chunks.length,
      createdAt: new Date().toISOString(),
    },
    chunksUploaded: chunks.length,
  };
}

// ─── Security ─────────────────────────────────────────────────────────────────

/** Strip path traversal and dangerous chars from filenames */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\]/g, "-")
    .replace(/\.\./g, "")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .slice(0, 255);
}
