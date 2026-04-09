/**
 * Document parsers — extract raw text from PDF, Markdown, and web URLs.
 * These run in Node runtime only (not Edge) due to pdf-parse dependency.
 */

export interface ParsedDocument {
  title: string;
  text: string;
  source: string;
  type: "pdf" | "markdown" | "url";
  pageCount?: number;
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function parsePdf(
  buffer: Buffer,
  filename: string
): Promise<ParsedDocument> {
  // Dynamic import keeps pdf-parse out of the edge bundle
  // serverComponentsExternalPackages in next.config.js ensures webpack doesn't bundle it
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
  const data = await pdfParse(buffer);

  return {
    title: filename.replace(/\.pdf$/i, ""),
    text: data.text,
    source: filename,
    type: "pdf",
    pageCount: data.numpages,
  };
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

export function parseMarkdown(
  content: string,
  filename: string
): ParsedDocument {
  // Extract title from first H1 heading if present
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.md$/i, "");

  // Strip markdown syntax for cleaner text embedding
  const text = stripMarkdown(content);

  return { title, text, source: filename, type: "markdown" };
}

/** Remove markdown syntax while preserving structure */
function stripMarkdown(md: string): string {
  return md
    // Remove code blocks but keep content
    .replace(/```[\s\S]*?```/g, (match) => {
      const lines = match.split("\n").slice(1, -1).join("\n");
      return lines;
    })
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove headings (#) but keep text
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove images
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, "")
    // Clean up extra whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── URL / Web Page ───────────────────────────────────────────────────────────

export async function parseUrl(url: string): Promise<ParsedDocument> {
  // Validate URL to prevent SSRF
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }

  // Block private/internal IP ranges (SSRF protection)
  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateHost(hostname)) {
    throw new Error("Access to private/internal hosts is not allowed");
  }

  const response = await fetch(url, {
    headers: { "User-Agent": "DevDocs-AI-Bot/1.0" },
    signal: AbortSignal.timeout(10_000), // 10s timeout
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/")) {
    throw new Error("URL must return text content (HTML or plain text)");
  }

  const html = await response.text();
  const text = extractTextFromHtml(html);

  // Extract <title> tag or use URL as fallback
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : url;

  return { title, text, source: url, type: "url" };
}

/** Naive HTML → plain text extraction (no external DOM parser needed) */
function extractTextFromHtml(html: string): string {
  return html
    // Remove script and style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    // Replace block-level elements with newlines
    .replace(/<\/?(p|div|h[1-6]|li|br|tr)[^>]*>/gi, "\n")
    // Strip remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Normalize whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Check if a hostname resolves to a private/internal address */
function isPrivateHost(hostname: string): boolean {
  const privatePatterns = [
    /^localhost$/,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^::1$/,
    /^0\.0\.0\.0$/,
    /^169\.254\./, // link-local
    /\.internal$/,
    /\.local$/,
  ];
  return privatePatterns.some((p) => p.test(hostname));
}
