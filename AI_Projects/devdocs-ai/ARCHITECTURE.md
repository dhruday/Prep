# DevDocs AI Assistant — Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Next.js)                          │
│                                                                     │
│   ┌──────────────┐     ┌─────────────────┐     ┌───────────────┐  │
│   │  Chat UI     │────▶│  Upload UI      │     │  Sources Panel│  │
│   │  (streaming) │     │  (PDF/MD/URL)   │     │  (citations)  │  │
│   └──────┬───────┘     └────────┬────────┘     └───────────────┘  │
└──────────┼──────────────────────┼───────────────────────────────────┘
           │ SSE / fetch stream   │ multipart/form POST
           ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS API ROUTES                           │
│                                                                     │
│   /api/chat ──────── Edge Runtime ──────────────────────────────┐  │
│   /api/ingest ────── Node Runtime ──────────────────────────┐   │  │
│   /api/documents ─── Node Runtime                           │   │  │
└─────────────────────────────────────────────────────────────┼───┼──┘
                                                              │   │
        ┌─────────────────────────────────────────────────────┼───┼────┐
        │                     LIB LAYER                       │   │    │
        │                                                     │   │    │
        │  embeddings.ts ◀────── OpenAI text-embedding-3-small│   │    │
        │  pinecone.ts   ◀────────────── Pinecone Vector DB ──┘   │    │
        │  chunker.ts    ◀──── Document parsing + chunking ───────┘    │
        │  prompt.ts     ◀──── System prompt + context builder         │
        │  cache.ts      ◀──── In-memory + Vercel KV caching           │
        │  ratelimit.ts  ◀──── Upstash Redis rate limiting             │
        │  memory.ts     ◀──── Conversation memory store               │
        └────────────────────────────────────────────────────────────--┘
                    │                        │
                    ▼                        ▼
           ┌────────────────┐      ┌──────────────────┐
           │  OpenAI API    │      │  Pinecone Index  │
           │  GPT-4 (chat)  │      │  (vector store)  │
           │  Ada (embed)   │      │                  │
           └────────────────┘      └──────────────────┘
```

## Data Flow

### Ingestion Pipeline
```
Document (PDF/MD/URL)
        │
        ▼
   Parse & Extract Text
        │
        ▼
   Chunk into 500-1000 token segments
   (with 100-token overlap)
        │
        ▼
   Generate Embeddings (text-embedding-3-small)
   [Batched: 100 chunks per request]
        │
        ▼
   Upsert to Pinecone with metadata:
   { source, title, chunk_index, char_count, text }
        │
        ▼
   Return ingestion summary
```

### Query Pipeline
```
User Message
        │
        ▼
   Check cache (hash of query)
        │ cache miss
        ▼
   Generate query embedding
        │
        ▼
   Pinecone top-k (k=5) similarity search
        │
        ▼
   Build prompt with retrieved context chunks
        │
        ▼
   Append conversation history (last 6 turns)
        │
        ▼
   GPT-4 streaming response
        │
        ▼
   Stream SSE tokens to browser
        │
        ▼
   Cache full response + sources
```

## Folder Structure

```
devdocs-ai/
├── app/
│   ├── layout.tsx              # Root layout (Inter font, providers)
│   ├── page.tsx                # Home → redirect to /chat
│   ├── chat/
│   │   └── page.tsx            # Chat page (server component shell)
│   ├── upload/
│   │   └── page.tsx            # Document upload page
│   └── api/
│       ├── chat/
│       │   └── route.ts        # Streaming chat endpoint (Edge)
│       ├── ingest/
│       │   └── route.ts        # Document ingestion endpoint (Node)
│       └── documents/
│           └── route.ts        # List/delete documents
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx      # Main chat container
│   │   ├── MessageBubble.tsx   # Individual message with markdown
│   │   ├── ChatInput.tsx       # Input bar + send button
│   │   ├── SourcesPanel.tsx    # Citations accordion
│   │   └── TypingIndicator.tsx # Animated dots
│   ├── upload/
│   │   ├── DropZone.tsx        # Drag-and-drop file upload
│   │   └── IngestionStatus.tsx # Progress + results
│   └── ui/
│       ├── Skeleton.tsx        # Loading skeleton
│       ├── Badge.tsx           # Source badge chip
│       └── ErrorBanner.tsx     # Error display
├── lib/
│   ├── embeddings.ts           # OpenAI embedding generation
│   ├── pinecone.ts             # Pinecone client + CRUD helpers
│   ├── chunker.ts              # Text splitting into chunks
│   ├── parsers.ts              # PDF, markdown, URL parsers
│   ├── prompt.ts               # System prompt + context builder
│   ├── cache.ts                # Query result caching
│   ├── ratelimit.ts            # Rate limiting middleware
│   └── memory.ts               # Conversation memory
├── utils/
│   ├── tokens.ts               # Token counting utilities
│   ├── hash.ts                 # MD5/SHA hash for cache keys
│   └── cn.ts                   # Tailwind class merging
├── types/
│   └── index.ts                # Shared TypeScript types
├── hooks/
│   ├── useChat.ts              # Chat state + streaming hook
│   └── useUpload.ts            # File upload hook
├── public/
│   └── icons/
├── .env.local                  # Environment variables (gitignored)
├── .env.example                # Template for env vars
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Runtime | Edge for /api/chat, Node for /api/ingest | Streaming needs Edge; PDF parsing needs Node |
| Chunking | 750 tokens, 100 overlap | Balance between context and precision |
| Top-k | 5 chunks | Enough context, stays within GPT-4 context window |
| Embeddings | text-embedding-3-small | 3x cheaper than large, nearly same quality |
| Streaming | SSE via ReadableStream | Native browser support, no WS overhead |
| Caching | In-memory Map + MD5 hash | Zero-latency for identical queries |
| Memory | Last 6 messages | Avoids context overflow, keeps coherence |
