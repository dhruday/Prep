# DevDocs AI Assistant

> **A production-ready RAG chatbot that reads your technical documentation and answers questions about it using semantic search + GPT-4 streaming.**

---

## What Is This Project?

**DevDocs AI** is a full-stack AI assistant that turns your static documentation into a living, searchable knowledge base you can have a conversation with.

**The core idea:** Instead of reading through 50 pages of docs to find one answer, you ask the AI in plain English and it finds the relevant sections, synthesises them, and replies in real-time — with links to the exact source chunks it used.

### What it does end-to-end

| User Action | What Happens |
|---|---|
| Uploads a PDF / Markdown / URL | Document is parsed, split into chunks, embedded as vectors, stored in Pinecone |
| Types a question in chat | Question is embedded → Pinecone finds the 5 most similar chunks → GPT-4 answers using only that context |
| Gets an answer | Response streams in real-time (typing effect) with collapsible source citations |
| Asks a follow-up | Previous conversation is included so GPT-4 maintains context |
| Asks the same question again | Returned from cache instantly (0ms) — no API calls made |

---

## Complete Request/Response Cycle

### Phase 1 — Document Ingestion (one-time per document)

```
┌─────────────────────────────────────────────────────────────────┐
│  USER uploads a file or pastes a URL on /upload page            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ POST /api/ingest  (multipart or JSON)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  PARSE (Node.js runtime)                                        │
│  • PDF     → pdf-parse extracts raw text + page count          │
│  • Markdown → strip # / ** / [] syntax, keep clean text        │
│  • URL     → fetch HTML, strip tags, extract <title>           │
│              (SSRF protection: blocks 192.168.x, localhost etc) │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  CHUNK  (lib/chunker.ts)                                        │
│  • Split on sentences (not arbitrary char count)               │
│  • Target: 750 tokens per chunk                                │
│  • Overlap: 100 tokens between adjacent chunks                 │
│    (so context near chunk boundaries isn't lost)               │
│  • Each chunk gets: id, text, source, title, chunkIndex        │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  EMBED  (lib/embeddings.ts)                                     │
│  • Model: text-embedding-3-small (1536 dimensions)             │
│  • Batched: 100 chunks per API call for efficiency             │
│  • Result: each chunk = 1536-dimensional float array           │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STORE  (lib/pinecone.ts)                                       │
│  • Upsert vectors to Pinecone (100 per batch)                  │
│  • Stored with metadata: text, source, title, chunkIndex       │
│  • Index auto-created on first ingest if missing               │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
                   ✅ Response: { success, chunkCount, docId }
```

---

### Phase 2 — Chat Query (every question)

```
┌─────────────────────────────────────────────────────────────────┐
│  USER types a question in chat UI, hits Enter                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ POST /api/chat  { message, conversationId }
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  RATE LIMIT CHECK  (lib/ratelimit.ts)                           │
│  • 20 requests/minute per IP (sliding window)                  │
│  • Uses Upstash Redis sorted sets                              │
│  • Without Redis: allows all (dev mode)                        │
│  • On limit: 429 response with Retry-After header              │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  CACHE CHECK  (lib/cache.ts)                                    │
│  • SHA-256 hash of lowercased+trimmed question                 │
│  • L1: in-memory Map  → instant, no network                   │
│  • L2: Upstash Redis  → survives restarts                     │
│  • TTL: 1 hour                                                 │
│  ─── CACHE HIT → stream stored answer character by character  │
│  ─── CACHE MISS → continue below                              │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  EMBED THE QUESTION  (lib/embeddings.ts)                        │
│  • Same model: text-embedding-3-small                          │
│  • Converts user question to 1536-dimensional vector           │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  VECTOR SEARCH  (lib/pinecone.ts)                               │
│  • Cosine similarity between question vector + all doc vectors │
│  • Returns top-5 closest chunks (k=5)                         │
│  • Filters out chunks with score < 0.3 (irrelevant content)   │
│  • Each result: { text, source, title, score }                 │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  BUILD PROMPT  (lib/prompt.ts)                                  │
│  • System message: "Answer only from the context below"        │
│  • Context block: top-5 chunks numbered [1]–[5]               │
│  • History: last 6 conversation turns (3 user + 3 assistant)  │
│  • User message: the actual question                           │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  GPT-4 STREAMING  (OpenAI API)                                  │
│  • Model: gpt-4o, temperature: 0.2 (factual, not creative)    │
│  • stream: true → tokens arrive one by one                    │
│  • Max 1024 output tokens                                      │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  SSE STREAM TO BROWSER  (app/api/chat/route.ts)                 │
│  • Content-Type: text/event-stream                             │
│  • First event: "sources" — sends all citations immediately    │
│  • Then: "data" events with each token as it arrives           │
│  • Final: "done" event with conversationId                     │
│  • On cancel: AbortController stops OpenAI stream             │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER (hooks/useChat.ts)                                     │
│  • ReadableStream reader processes SSE line by line            │
│  • "sources" event → renders SourcesPanel immediately         │
│  • Each "data" token → appended to message in React state     │
│  • "done" event → stops loading indicator                     │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST-RESPONSE STORAGE                                          │
│  • Full answer + sources stored in memory.ts (conversation)   │
│  • Full answer + sources cached in cache.ts (repeated queries) │
└─────────────────────────────────────────────────────────────────┘
```

---

---

## Features

| Feature | Details |
|---|---|
| Document ingestion | PDF, Markdown, plain text, and web URLs |
| Semantic chunking | 750-token chunks with 100-token overlap |
| Vector search | Pinecone cosine similarity (top-5) |
| Streaming responses | SSE with real-time typing effect |
| Source citations | Collapsible panel with relevance scores |
| Conversation memory | Last 20 messages per session |
| Query caching | In-memory L1 + Upstash Redis L2 (1hr TTL) |
| Rate limiting | 20 req/min per IP (sliding window) |
| Clean chat UI | Dark-mode, ChatGPT-style, mobile-friendly |

---

## Quick Start

### 1. Clone and install

```bash
cd devdocs-ai
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Then fill in the values (see [Environment Variables](#environment-variables)).

### 3. Create your Pinecone index

The index is created automatically on first document ingestion, OR you can create it manually:

```bash
# Install ts-node if needed
npx ts-node --project tsconfig.json -e "
  const { ensureIndex } = require('./lib/pinecone');
  ensureIndex().then(() => console.log('Done')).catch(console.error);
"
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | OpenAI API key (get from platform.openai.com) |
| `PINECONE_API_KEY` | ✅ | Pinecone API key (get from app.pinecone.io) |
| `PINECONE_ENVIRONMENT` | ✅ | e.g. `us-east-1-aws` (found in Pinecone console) |
| `PINECONE_INDEX_NAME` | ✅ | e.g. `devdocs` (any name, auto-created) |
| `UPSTASH_REDIS_REST_URL` | ⚠️ Optional | Upstash Redis URL for caching + rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | ⚠️ Optional | Upstash Redis token |
| `NEXT_PUBLIC_APP_URL` | ⚠️ Optional | Public URL of your deployment |

> Without Upstash Redis, caching and rate limiting degrade gracefully (in-memory cache only, no rate limits).

### Getting API keys

**OpenAI:**
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new secret key

**Pinecone:**
1. Go to [app.pinecone.io](https://app.pinecone.io)
2. Create a free Starter account
3. Copy your API key from the "API Keys" section
4. Note your environment (e.g. `us-east-1-aws`)

**Upstash Redis (optional):**
1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a free Redis database
3. Copy the REST URL and token

---

## Project Structure

```
devdocs-ai/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Global + Tailwind styles
│   ├── page.tsx                # Redirects to /chat
│   ├── chat/page.tsx           # Chat UI page
│   ├── upload/page.tsx         # Document upload page
│   └── api/
│       ├── chat/route.ts       # 🔑 Streaming chat (Edge runtime)
│       └── ingest/route.ts     # 🔑 Document ingestion (Node runtime)
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx      # Chat container + scroll
│   │   ├── MessageBubble.tsx   # Message with markdown rendering
│   │   ├── ChatInput.tsx       # Auto-resize input + send
│   │   ├── SourcesPanel.tsx    # Collapsible citations
│   │   └── TypingIndicator.tsx # Animated dots
│   ├── upload/
│   │   ├── DropZone.tsx        # Drag-and-drop + URL input
│   │   └── IngestionStatus.tsx # Upload feedback
│   └── ui/
│       ├── Skeleton.tsx
│       ├── Badge.tsx
│       └── ErrorBanner.tsx
├── lib/
│   ├── embeddings.ts           # OpenAI text-embedding-3-small
│   ├── pinecone.ts             # Vector DB client + upsert/query
│   ├── chunker.ts              # Semantic text splitting
│   ├── parsers.ts              # PDF, Markdown, URL → text
│   ├── prompt.ts               # System prompt + context builder
│   ├── cache.ts                # L1/L2 response caching
│   ├── ratelimit.ts            # Sliding-window rate limiter
│   └── memory.ts               # Conversation history store
├── hooks/
│   ├── useChat.ts              # Chat state + SSE streaming
│   └── useUpload.ts            # File/URL upload state
├── types/index.ts              # Shared TypeScript types
└── utils/
    ├── cn.ts                   # Tailwind class merger
    ├── tokens.ts               # Token counting
    └── hash.ts                 # SHA-256 for cache keys
```

---

## How It Works

### Document Ingestion

```
User uploads file/URL
        ↓
Parse → PDF (pdf-parse), Markdown (regex strip), URL (fetch + HTML strip)
        ↓
Chunk → 750 tokens, 100-token overlap, sentence-boundary aware
        ↓
Embed → OpenAI text-embedding-3-small (batched, 100 at a time)
        ↓
Store → Pinecone upsert with metadata (source, title, chunk_index, text)
```

### Query Pipeline

```
User question
        ↓
Cache check (SHA-256 hash of question)
        ↓ miss
Embed question → text-embedding-3-small
        ↓
Pinecone top-5 cosine similarity search (score ≥ 0.3)
        ↓
Build GPT-4 prompt: [system + context] + [history] + [question]
        ↓
Stream GPT-4o response via SSE
        ↓
Token-by-token to browser (typing effect)
        ↓
Store in conversation memory + cache
```

---

## Deploy on Vercel

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual deploy

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Login**
```bash
vercel login
```

**Step 3: Deploy**
```bash
vercel --prod
```

**Step 4: Set environment variables**

In the Vercel dashboard → Project → Settings → Environment Variables, add:
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_ENVIRONMENT`
- `PINECONE_INDEX_NAME`
- `UPSTASH_REDIS_REST_URL` (optional)
- `UPSTASH_REDIS_REST_TOKEN` (optional)

Or via CLI:
```bash
vercel env add OPENAI_API_KEY
vercel env add PINECONE_API_KEY
vercel env add PINECONE_ENVIRONMENT
vercel env add PINECONE_INDEX_NAME
```

**Step 5: Redeploy**
```bash
vercel --prod
```

### Vercel-specific notes

- `/api/chat` uses **Edge Runtime** — cold starts ~50ms
- `/api/ingest` uses **Node Runtime** — required for `pdf-parse`
- Set `maxDuration = 60` on the ingest route for large documents
- Vercel Hobby plan has 10s max duration on edge functions — upgrade to Pro for long documents

---

## Performance Notes

| Optimization | Impact |
|---|---|
| Edge runtime on `/api/chat` | ~50ms cold start vs ~300ms for Node |
| text-embedding-3-small | 3x cheaper than large, similar quality |
| Query caching | 0ms for repeated questions |
| Batched embeddings (100/req) | Reduces API calls 100x during ingestion |
| Score threshold (≥0.3) | Removes irrelevant chunks from context |
| 750-token chunks | Fits 5 chunks + answer in GPT-4 context budget |
| Conversation history capped at 6 turns | Prevents context overflow |

---

## Extending the Project

### Add authentication (NextAuth)
```bash
npm install next-auth
```
Wrap API routes with `getServerSession()` checks.

### Add document management UI
Create `/api/documents/route.ts` to list and delete indexed documents using Pinecone's `listVectors` and `deleteMany`.

### Swap to a local LLM (Ollama)
Replace the OpenAI client in `/app/api/chat/route.ts` with the Ollama REST API.

### Add multi-tenancy
Add a `namespace` parameter to Pinecone queries to isolate each user's documents.
