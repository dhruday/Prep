---

# Phase 3: AI APIs & SDKs (Days 20–27)

> **Goal:** Become fluent with all major AI APIs and SDKs used in production.
> Complete all 8 lessons. Build Project 1 (AI Chat App) and Project 5 (Meeting Notes Generator).

---

## DAY 20 — Lesson 3.1.1: OpenAI API Mastery

**Why it matters:** OpenAI is the industry standard. Mastery is expected at every AI engineering role.

**Study Agenda (90 min)**

- Chat Completions API: messages array, roles, system/user/assistant turns
- Models: GPT-4o, GPT-4o-mini, o1, o3 — capability and cost matrix
- Streaming responses: `stream: true` + SSE handling
- Function/tool calling (deep dive from API perspective)
- Vision API: sending images (base64 vs URL), token cost of images
- Audio API: Whisper (STT), TTS endpoints
- Assistants API: stateful threads, file attachments, code interpreter
- Batch API: async processing, 50% cheaper, 24h turnaround
- Rate limits: tiers, handling 429 errors, exponential backoff

**Mini Project — AI Document Processor**
```typescript
// Accept image of a document → Vision API → Extract structured data
// Input: PDF page screenshot
// Output: { title, date, amounts[], parties[], summary }
// Include: retry with exponential backoff on rate limit
```

---

**📝 Day 20 Interview Practice Questions**

1. **(Intermediate | All Companies)** How does the Assistants API differ from the Chat Completions API? When would you use each?
2. **(Intermediate | OpenAI, Google)** When would you use the Batch API? What are its limitations?
3. **(Advanced | All Companies)** How do you handle OpenAI rate limits in a high-traffic application serving 10K RPM?
4. **(Advanced | Stripe, Meta)** How does image input to the Vision API get tokenized? How do you minimize vision token costs?
5. **(Advanced | All Companies)** Implement exponential backoff with jitter for OpenAI API calls. What are the parameters?
6. **(Advanced | Netflix, Uber)** Design a multi-tier OpenAI integration: real-time for chat (Completions), async for analysis (Batch), stateful for workflows (Assistants).
7. **(Staff | OpenAI)** How would you load balance across multiple OpenAI API keys to maximize throughput?
8. **(Staff | All Companies)** Design an OpenAI API abstraction layer that supports: provider switching, cost tracking, rate limiting, and request deduplication.

---

## DAY 21 — Lesson 3.1.2: Anthropic Claude API Mastery

**Why it matters:** Claude is increasingly preferred for complex reasoning. Anthropic is a top target employer.

**Study Agenda (75 min)**

- Messages API: structure differences from OpenAI
- Models: Claude Haiku 3.5, Sonnet 3.5, Opus 3, Claude 4 series
- Tool use API: definition format, tool_result handling
- Prompt caching: `cache_control: { type: "ephemeral" }` — implementation
- Extended thinking: `thinking: { type: "enabled", budget_tokens: N }`
- Vision: image blocks in content array
- Constitutional AI: how it affects behavior vs OpenAI
- Token counting API: pre-flight token estimation

**Mini Project — Code Review Assistant with Claude**
```typescript
// Uses Claude to: review code, call a tool to look up docs, use extended thinking for complex logic
// Tools: lookupDocumentation(query), runLinter(code), searchStackOverflow(error)
// Extended thinking: enabled for architecture recommendations
```

---

**📝 Day 21 Interview Practice Questions**

1. **(Intermediate | Anthropic)** What is Constitutional AI and how does it affect Claude's behavior compared to RLHF-trained models?
2. **(Intermediate | All Companies)** How does Claude's prompt caching work? Show the exact API call with `cache_control`.
3. **(Advanced | Anthropic)** What happens during Claude's extended thinking? What does `budget_tokens` control?
4. **(Advanced | All Companies)** Compare Claude's tool use API with OpenAI's function calling. What are the structural differences?
5. **(Advanced | Stripe, Meta)** When would you choose Claude over GPT-4o for a production system? Give 3 specific scenarios.
6. **(Staff | Anthropic)** Design a system that uses Claude's token counting API to pre-validate every request before sending it, with budget enforcement.
7. **(Staff | All Companies)** How would you migrate a production system from OpenAI to Claude with zero downtime and eval-verified quality?
8. **(Staff | Anthropic)** How do Anthropic's safety constraints affect what you can build? What are the engineering implications?

---

## DAY 22 — Lesson 3.1.3: Google Gemini API Mastery

**Why it matters:** Google is the world's largest AI employer. Gemini is rapidly becoming an enterprise standard.

**Study Agenda (75 min)**

- Gemini API via Google AI Studio vs Vertex AI — when to use each
- Models: Gemini 1.5 Pro, Gemini 2.0 Flash, Gemini Ultra
- The 1M token context window: real use cases, cost implications
- Grounding with Google Search: how to enable, what it returns
- Native multimodal: video, audio, document understanding in one API call
- Gemini embeddings: `text-embedding-004` model
- Function calling in Gemini: syntax and differences
- Safety settings: how to configure per-request

**Mini Project — Meeting Intelligence Tool** *(Part of Project 5)*
```typescript
// Input: MP4 meeting recording (up to 1 hour)
// Uses Gemini's native audio/video understanding
// Output: { summary, actionItems[], keyDecisions[], speakerHighlights[] }
// No transcription needed — Gemini processes video directly
```

---

**📝 Day 22 Interview Practice Questions**

1. **(Intermediate | Google)** When would you choose Gemini over GPT-4o or Claude? Give 3 specific scenarios.
2. **(Intermediate | Google)** How does Google Search grounding work in Gemini? What does it add to the response?
3. **(Advanced | Google)** What can you do with a 1M token context window that fundamentally changes product design?
4. **(Advanced | Google, Meta)** How do you use Gemini for video understanding without transcription? What's the API call?
5. **(Advanced | All Companies)** Compare Google AI Studio vs Vertex AI. When does enterprise context require Vertex?
6. **(Staff | Google)** Design a multimodal AI pipeline that processes: meeting videos, presentation PDFs, and follow-up emails — all in one Gemini session.
7. **(Staff | All Companies)** How do you evaluate Gemini vs GPT-4o vs Claude on your specific use case? What's your benchmark methodology?
8. **(Staff | Google)** What are the data residency and compliance considerations when using Gemini vs Vertex AI?

---

## DAY 23 — Lesson 3.1.4 + 3.1.5: OpenRouter & Model Routing + Streaming APIs

**Why it matters:** Two closely related lessons — routing and streaming are both fundamental production skills, best learned together.

**Study Agenda (90 min — combined)**

**OpenRouter & Model Routing (40 min):**
- OpenRouter: unified API for 100+ models, one endpoint
- Intelligent routing: classify task complexity → select model tier
- Fallback chains: GPT-4o fails → Claude → Gemini
- Latency-based routing: use fastest available model under SLA
- Cost-based routing: cheapest model that meets quality bar
- Load balancing across multiple API keys

**Streaming APIs (40 min):**
- Server-Sent Events (SSE) — the transport protocol
- ReadableStream and async iteration in TypeScript
- Streaming in OpenAI, Claude, Gemini — syntax comparison
- Streaming with function calls: handling delta objects
- AbortController for "Stop generating" button
- Streaming in Next.js Route Handlers
- Edge Runtime vs Node.js: streaming trade-offs

**Mini Project — Smart Model Router + Streaming Chat UI**
```typescript
// Router: classify(query) → 'simple'|'medium'|'complex' → select model
// Streaming: real-time token rendering + stop button + scroll
```

---

**📝 Day 23 Interview Practice Questions**

1. **(Intermediate | All Companies)** How would you implement model routing in production? What signals determine which model to use?
2. **(Intermediate | All Companies)** How does SSE differ from WebSockets for AI streaming? Which is better for AI chat?
3. **(Advanced | Stripe, Netflix)** How do you handle streaming when function calls are involved? What do the delta objects look like?
4. **(Advanced | All Companies)** Implement a fallback chain: GPT-4o → Claude → Gemini, with different error conditions triggering each fallback.
5. **(Advanced | Google, Meta)** What are the Edge Runtime limitations for AI streaming endpoints? What can't you do at the edge?
6. **(Staff | All Companies)** Design a production AI gateway that routes between providers based on: cost, latency, quality — with automatic failover and real-time cost tracking.
7. **(Staff | Netflix, Uber)** A streaming endpoint has P99 latency of 8 seconds. Walk through your investigation and optimization strategy.
8. **(Staff | All Companies)** How do you handle the case where a user navigates away mid-stream? What cleanup is required server-side?

---

## DAY 24 — Lesson 3.1.6: Multimodal APIs

**Why it matters:** The future of AI is multimodal. Vision, audio, video, and document understanding are converging.

**Study Agenda (75 min)**

- Vision: sending images to GPT-4o, Claude, Gemini — syntax for each
- Base64 vs URL for image input: when to use which
- Image resolution and token cost: detail=low vs detail=high
- Audio: Whisper API for STT, OpenAI TTS for speech synthesis
- Document understanding: PDFs, spreadsheets as input
- Video: Gemini native video analysis
- Multimodal pipelines: image → structured data → action
- Cost of vision tokens vs text tokens

**Mini Project — AI Receipt Scanner** *(Portfolio Project)*
```typescript
// Photo of receipt → Vision API → Structured expense report
// Output: { vendor, date, items: [{name, amount}], total, category, tax }
// Handle: blurry images, partial receipts, foreign currencies
```

---

**📝 Day 24 Interview Practice Questions**

1. **(Intermediate | All Companies)** How do you minimize vision API costs when processing many images?
2. **(Intermediate | Google, OpenAI)** What is the difference between `detail: 'low'` and `detail: 'high'` in OpenAI vision? When do you use each?
3. **(Advanced | All Companies)** Build a PDF Q&A system that uses vision to understand scanned pages (not just text extraction).
4. **(Advanced | Google)** How does Gemini's native video understanding differ from transcription + analysis? What are the advantages?
5. **(Advanced | Stripe, Adobe)** Design a multimodal document intelligence pipeline: input is 100 PDFs, output is a structured database of extracted facts.
6. **(Staff | All Companies)** How do you handle multimodal inputs where the image quality varies dramatically? What fallback strategies do you use?
7. **(Staff | Google, Meta)** Design a real-time multimodal AI system that processes: user's screen capture + voice input + typed message simultaneously.
8. **(Staff | All Companies)** What are the privacy implications of sending user images to cloud AI APIs? How do you architect for privacy?

---

## DAY 25 — Lesson 3.2.1: Vercel AI SDK

**Why it matters:** The Vercel AI SDK is the de facto standard for AI in Next.js applications. Mastery is expected for any frontend-heavy AI role.

**Study Agenda (75 min)**

- `generateText`, `streamText`, `generateObject`, `streamObject` — when to use each
- Provider adapters: switching between OpenAI, Anthropic, Google with one line
- `useChat` and `useCompletion` React hooks — built-in state management
- Tool calls in the UI: streaming tool calls to the frontend
- Generative UI: AI returns React component names, frontend renders them
- `DataStreamResponse` for custom streaming data
- Middleware: logging, rate limiting, auth injection

**Mini Project — AI Chat App** *(Portfolio Project 1)*
```typescript
// Full-featured chat with Vercel AI SDK:
// ✅ Streaming with useChat
// ✅ Model selection (3 providers)
// ✅ Tool calls (web search + calculator)
// ✅ Generative UI (AI can render charts, tables, code blocks)
// ✅ Conversation persistence
// ✅ Stop generating button
```

---

**📝 Day 25 Interview Practice Questions**

1. **(Intermediate | All Companies)** How does the Vercel AI SDK handle provider differences? What does the abstraction give you?
2. **(Intermediate | All Companies)** What is the difference between `streamText` and `streamObject`? How does `streamObject` handle partial JSON?
3. **(Advanced | Meta, Airbnb)** What is generative UI? Design a dashboard where AI dynamically selects and renders chart components.
4. **(Advanced | All Companies)** How does `useChat` manage conversation state? What happens when a user refreshes the page?
5. **(Advanced | Stripe, Google)** How do you add authentication middleware to Vercel AI SDK route handlers?
6. **(Staff | All Companies)** Design a multi-tenant AI chat system using Vercel AI SDK with: per-user rate limiting, cost tracking, conversation isolation.
7. **(Staff | All Companies)** How would you extend the Vercel AI SDK to support a custom AI provider not in its official list?
8. **(Staff | Meta, Airbnb)** When would you NOT use the Vercel AI SDK? What would you build instead?

---

## DAY 26 — Lesson 3.2.2: LangChain (Where It Matters)

**Why it matters:** LangChain is widely used in enterprise. You need to know it, understand its trade-offs, and know when to avoid it.

**Study Agenda (75 min)**

- LangChain components: Models, Prompts, Chains, Memory, Agents
- LCEL (LangChain Expression Language): pipe syntax for chaining
- LangSmith: tracing, evaluation, and monitoring
- Document loaders and text splitters for RAG
- Build the same RAG pipeline: WITH LangChain and WITHOUT
- When LangChain adds value: team familiarity, ecosystem, observability
- When LangChain hurts: abstraction leaks, debugging difficulty, overhead
- LangGraph: separate from LangChain (covered in Phase 6)

**Mini Project — Side-by-Side RAG Comparison**
```
Build "Company Docs Q&A" twice:
1. With LangChain (use their loaders, splitters, retrievers, chains)
2. Without LangChain (pure TypeScript/Python)
Document: lines of code, debugging difficulty, performance
```

---

**📝 Day 26 Interview Practice Questions**

1. **(Intermediate | All Companies)** When would you use LangChain vs building your own AI pipeline?
2. **(Intermediate | All Companies)** What is LangSmith and why is observability critical in AI systems?
3. **(Advanced | All Companies)** What are the main criticisms of LangChain? Do you agree? What specific problems have you experienced?
4. **(Advanced | Google, Meta)** Compare LangChain, Vercel AI SDK, and bare API calls. When does each make sense?
5. **(Advanced | All Companies)** How does LangChain's LCEL differ from writing sequential function calls? What does the abstraction add?
6. **(Staff | All Companies)** You're inheriting a LangChain codebase that's hard to debug. How do you add observability and simplify it?
7. **(Staff | Databricks, Google)** When would you use LangGraph vs LangChain for agent systems? What's the architectural difference?
8. **(Staff | All Companies)** How do you evaluate whether a new LangChain release has changed behavior in your pipeline?

---

## DAY 27 — Phase 3 Project Day: AI Chat App + Meeting Notes Generator

**Study Agenda (90 min)**

**Project 1 — AI Chat App (Complete & Polish)**
- Add: markdown rendering, code syntax highlighting, copy button
- Add: conversation export as PDF
- Add: prompt library (10 pre-built prompts)
- Deploy to Vercel

**Project 5 — AI Meeting Notes Generator**
```typescript
// Upload audio/video → Whisper transcription → Gemini analysis
// Output: summary, action items, decisions, follow-up email draft
// UI: upload → processing indicator → formatted results → export
```

**GitHub Deliverable:** Both projects deployed and linked in README.

---

**📝 Day 27 Interview Practice Questions**

1. Walk me through your AI Chat App architecture. What were the key decisions?
2. **(Advanced | All Companies)** How did you handle the streaming UI — what happens if the connection drops mid-stream?
3. **(Advanced | Google)** For the Meeting Notes Generator, why did you choose Gemini's native video over Whisper + GPT-4o?
4. **(Staff | All Companies)** How would you scale the Meeting Notes Generator to handle 1000 simultaneous uploads?
5. **(Staff | Stripe)** How would you add per-user billing to the Meeting Notes Generator based on minutes of audio processed?

---

# Phase 4: RAG Systems (Days 28–37)

> **Goal:** Build production-grade RAG systems. Complete Lessons 4.1.1–4.1.8.
> Build Projects 2 (PDF Chat), 10 (FAQ Bot), 21 (Production RAG Platform).

---

## DAY 28 — Lesson 4.1.1: What is RAG and Why It Matters

**Why it matters:** RAG is the most commonly used AI architecture in production. Almost every enterprise AI product uses it.

**Study Agenda (75 min)**

- RAG architecture: Retrieve → Augment → Generate — each step in detail
- Why RAG beats fine-tuning for most use cases: no retraining, up-to-date, citable
- When to use RAG vs fine-tuning vs long context: decision framework
- Naive RAG vs Advanced RAG vs Modular RAG — evolution
- RAG evaluation metrics: faithfulness, relevance, groundedness, context precision
- RAGAS framework: automated RAG evaluation

**Mini Project — Company Docs Q&A (Naive RAG)** *(Portfolio Project 10)*
```typescript
// 20 Markdown documentation files → chunk → embed → store → retrieve → answer
// Baseline implementation: fixed chunk size, top-k retrieval, no reranking
// Measure accuracy on 20 test questions
```

---

**📝 Day 28 Interview Practice Questions**

1. **(Intermediate | All Companies)** What problem does RAG solve that fine-tuning doesn't?
2. **(Intermediate | All Companies)** Walk me through a RAG pipeline from document ingestion to answer generation.
3. **(Advanced | Google, Meta)** When would you choose a 1M token context window (like Gemini) over RAG? When does RAG still win?
4. **(Advanced | All Companies)** What is RAGAS? What metrics does it measure and how are they computed?
5. **(Advanced | Stripe, Airbnb)** Your RAG system returns accurate chunks but the generated answer is wrong. What's happening and how do you fix it?
6. **(Staff | All Companies)** Design the evaluation framework for a RAG system you're about to launch. What's your passing criteria?
7. **(Staff | Google, Databricks)** Compare Modular RAG vs Naive RAG. When does the added complexity of Modular RAG pay off?
8. **(Staff | All Companies)** How do you handle confidential documents in a RAG system? What access control layers do you add?

---

## DAY 29 — Lesson 4.1.2: Chunking Strategies

**Why it matters:** Chunking is the most underestimated factor in RAG quality. Wrong chunk size = wrong retrieval = wrong answers.

**Study Agenda (75 min)**

- Fixed-size chunking: character/token based with configurable overlap
- Recursive character text splitter: respects natural boundaries (paragraphs → sentences)
- Semantic chunking: split by meaning change, not by size
- Document-aware chunking: respect headings, sections, code blocks
- Small-to-big (parent-child): retrieve small chunks, return parent document
- Overlapping chunks: why 10–20% overlap helps retrieval
- Chunk size trade-offs: small (precise retrieval) vs large (more context)
- The metadata you attach to each chunk (source, page, section, date)

**Mini Project — Chunking Strategy Benchmarker**
```typescript
// Test 4 chunking strategies on same 50-page PDF
// Measure retrieval accuracy on 20 test questions for each
// Output: { strategy, avgAccuracy, avgRelevance, processingTime }[]
// Winner is used for Project 21
```

---

**📝 Day 29 Interview Practice Questions**

1. **(Intermediate | All Companies)** What is the optimal chunk size for a technical documentation RAG? How did you arrive at that?
2. **(Intermediate | All Companies)** What is semantic chunking? When is it better than fixed-size?
3. **(Advanced | Google, Anthropic)** What is parent-child (small-to-big) retrieval? How does it improve answer quality?
4. **(Advanced | All Companies)** How does chunk overlap affect retrieval quality? What's the overhead cost?
5. **(Advanced | Stripe, Meta)** A RAG system works well on prose but fails on tables and code. What chunking strategies help?
6. **(Staff | All Companies)** Design a chunking pipeline that handles: PDFs, Word docs, Markdown, HTML, CSV — all differently.
7. **(Staff | Google, Databricks)** How do you update chunks when a document is edited? Do you rechunk everything or only the changed sections?
8. **(Staff | All Companies)** What metadata do you attach to each chunk and how does that metadata get used in retrieval?

---

## DAY 30 — Lesson 4.1.3 + 4.1.4: Embeddings for RAG + Retrieval Strategies

**Why it matters:** Two interconnected lessons — the embedding quality sets the ceiling, retrieval strategy determines how close you get to it.

**Study Agenda (90 min — combined)**

**Embeddings for RAG (40 min):**
- Embedding model selection for RAG: accuracy vs speed vs cost
- OpenAI `text-embedding-3-large` vs `text-embedding-3-small` vs Cohere vs BGE
- Matryoshka embeddings: shrink dimensions for speed without full accuracy loss
- Domain-specific considerations: legal, medical, code — when general models fail
- Batch embedding: process 1000 docs efficiently

**Retrieval Strategies (40 min):**
- Similarity search: cosine, dot product — differences
- Top-K vs threshold-based retrieval
- Multi-query retrieval: rewrite query N ways, merge results
- HyDE (Hypothetical Document Embedding): generate a hypothetical answer, embed it
- Contextual compression: shrink retrieved chunks to only relevant parts
- Lost-in-the-middle mitigation: put most important chunks first AND last

**Mini Project — Multi-Strategy Retrieval Comparison**
```typescript
// Same questions, 3 retrieval strategies: naive top-k / multi-query / HyDE
// Compare accuracy scores
// Implement the winner in Project 21
```

---

**📝 Day 30 Interview Practice Questions**

1. **(Intermediate | All Companies)** How do you choose an embedding model for production RAG?
2. **(Intermediate | All Companies)** What is HyDE and when would you use it over standard retrieval?
3. **(Advanced | Google, Meta)** How does multi-query retrieval work? What's the overhead and is it worth it?
4. **(Advanced | All Companies)** What is contextual compression? Implement it in 20 lines of pseudocode.
5. **(Advanced | Stripe, Databricks)** Your RAG system retrieves the right documents but still gives wrong answers. What's happening?
6. **(Staff | All Companies)** Design a retrieval pipeline for a legal research system where precision matters more than recall.
7. **(Staff | Google)** How do you handle queries where no relevant documents exist in the database? What does your system return?
8. **(Staff | All Companies)** At what scale does switching from OpenAI embeddings to self-hosted BGE make financial sense?

---

## DAY 31 — Lesson 4.1.5: Re-ranking

**Why it matters:** Re-ranking is the single step that most dramatically improves RAG quality with minimal extra cost.

**Study Agenda (75 min)**

- Why initial retrieval is noisy: bi-encoder models optimize for speed, not accuracy
- Cross-encoder re-ranking: compare query + document together (much slower, much more accurate)
- Cohere Rerank API: the production standard, one API call
- Jina Reranker: open-source alternative
- MMR (Maximal Marginal Relevance): balance relevance + diversity
- Reciprocal Rank Fusion (RRF): merge rankings from multiple retrievers
- Cost-quality trade-off: when re-ranking adds enough value to justify cost

**Mini Project — RAG with Re-ranking** *(Project 10 upgrade)*
```typescript
// Add Cohere Rerank to the Company Docs Q&A from Day 28
// Measure: accuracy before reranking (baseline) vs after
// Target: 15%+ accuracy improvement on test set
```

---

**📝 Day 31 Interview Practice Questions**

1. **(Intermediate | All Companies)** Why is re-ranking necessary even with a good embedding search?
2. **(Intermediate | All Companies)** What is the difference between bi-encoder and cross-encoder re-ranking?
3. **(Advanced | All Companies)** How does Reciprocal Rank Fusion (RRF) work? When does it outperform individual rankers?
4. **(Advanced | Stripe, Google)** What is MMR (Maximal Marginal Relevance)? When do you want diversity in results vs pure relevance?
5. **(Advanced | All Companies)** At what query volume does Cohere Rerank become too expensive? What's your alternative?
6. **(Staff | All Companies)** Design a re-ranking system that uses: semantic similarity + BM25 score + recency + user feedback signals.
7. **(Staff | Google, Databricks)** How do you evaluate whether re-ranking is actually improving end-user outcomes vs just benchmark scores?
8. **(Staff | All Companies)** A re-ranking step adds 800ms latency. How do you decide whether to keep it?

---

## DAY 32 — Lesson 4.1.6: Hybrid Search

**Why it matters:** Semantic search alone fails on exact terms. Hybrid search is used in 90% of production RAG systems.

**Study Agenda (75 min)**

- BM25 keyword search: term frequency × inverse document frequency — how it works
- Semantic vector search: strengths and weaknesses recap
- Hybrid = BM25 + vector, fused with RRF
- Alpha parameter: how much weight to give keyword vs semantic
- When keyword beats semantic: product codes, names, IDs, exact phrases
- When semantic beats keyword: concepts, paraphrasing, synonyms
- Hybrid search in Weaviate, Pinecone, pgvector — implementation
- Tuning alpha on a benchmark dataset

**Mini Project — Hybrid Search Product Catalog**
```typescript
// 1000 product catalog with: SKU codes, names, descriptions
// Test cases: exact SKU lookup (keyword wins), "comfortable running shoes" (semantic wins)
// Implement hybrid with RRF, tune alpha parameter
```

---

**📝 Day 32 Interview Practice Questions**

1. **(Intermediate | All Companies)** When would pure semantic search fail? Give 3 concrete examples.
2. **(Intermediate | All Companies)** How does BM25 work? What does the term frequency × IDF formula compute?
3. **(Advanced | All Companies)** How do you tune the alpha parameter in hybrid search? What signals do you use?
4. **(Advanced | Google, Stripe)** Design a search system for a legal database with 10M documents. When does hybrid beat pure semantic?
5. **(Advanced | All Companies)** How does Reciprocal Rank Fusion merge BM25 and vector results? Walk through an example.
6. **(Staff | Databricks, Google)** Design a hybrid search evaluation system that measures when to increase keyword weight vs semantic weight based on query patterns.
7. **(Staff | All Companies)** How do you implement hybrid search in pgvector? Is it natively supported?
8. **(Staff | All Companies)** A user complains that searching for "Q3-2024-INVOICE-8821" doesn't return the right document. What's happening and how do you fix it?

---

## DAY 33 — Lesson 4.1.7: Metadata Filtering

**Why it matters:** Without metadata filtering, every query searches your entire database. Precision requires filtering.

**Study Agenda (75 min)**

- Attaching metadata to vectors at ingestion time: date, category, author, source, access_level
- Pre-filtering vs post-filtering: performance implications
- Dynamic metadata extraction from queries: "find last quarter's finance docs"
- LLM-based query parsing: extract filters from natural language
- Multi-tenant RAG: users only see their organization's documents
- Row-level security with metadata: user_id, org_id, clearance_level
- Metadata schema design for a large enterprise RAG

**Mini Project — Time-Aware Multi-Tenant RAG**
```typescript
// Query: "What were our Q3 2024 sales targets?" 
// → LLM extracts: { dateRange: 'Q3 2024', topic: 'sales targets', filters: { org_id: userOrgId } }
// → Pre-filter by org_id AND date range
// → Semantic search within filtered results
```

---

**📝 Day 33 Interview Practice Questions**

1. **(Intermediate | All Companies)** What is the difference between pre-filtering and post-filtering in metadata RAG?
2. **(Intermediate | All Companies)** How do you extract metadata filters from a natural language query?
3. **(Advanced | All Companies)** Design a multi-tenant RAG where 500 organizations share one vector database but cannot see each other's documents.
4. **(Advanced | Stripe, Google)** How do you design the metadata schema for a RAG system serving: sales, legal, engineering, and HR teams?
5. **(Advanced | All Companies)** A user asks "show me recent documents" — how does your system interpret "recent" and build the filter?
6. **(Staff | All Companies)** How do you handle metadata-based access control without adding significant query latency?
7. **(Staff | Google, Databricks)** Design the ingestion pipeline that auto-classifies, tags, and generates metadata for 1000 documents per day.
8. **(Staff | All Companies)** How do you audit which users accessed which documents in a RAG system?

---

## DAY 34 — Lesson 4.1.8: Production RAG Architecture

**Why it matters:** This is the capstone lesson — everything comes together into a production-grade system.

**Study Agenda (90 min)**

- Complete RAG pipeline architecture: ingestion + query + generation
- Ingestion pipeline: crawl → parse → chunk → embed → store → index
- Query pipeline: understand intent → extract filters → retrieve → re-rank → generate
- Document update strategies: full re-index vs incremental update
- RAG caching: cache identical queries, cache embedding computations
- Fallback strategies: what happens when retrieval fails
- RAG observability: trace every retrieval, log retrieved chunks, score relevance
- Running evals in CI/CD: test 50 golden Q&A pairs on every prompt change

**Mini Project — Production RAG Platform** *(Portfolio Project 21)*
```
Build the full system:
✅ Multi-format ingestion: PDF, DOCX, HTML, Markdown, CSV
✅ Hybrid search: semantic + BM25
✅ Cohere re-ranking
✅ Metadata filtering with multi-tenant isolation
✅ Source citations with page numbers
✅ Langfuse observability: trace every query
✅ Eval suite: 50 golden Q&A pairs in CI
✅ Admin dashboard: document management, analytics
```

---

**📝 Day 34 Interview Practice Questions**

1. **(Advanced | All Companies)** Design a RAG system for 10 million documents with <200ms P99 latency.
2. **(Advanced | All Companies)** How do you handle document updates without full re-indexing?
3. **(Advanced | Google, Databricks)** What does your RAG observability dashboard show? What metrics are on it?
4. **(Staff | All Companies)** How do you implement incremental RAG updates when 100 documents change every day?
5. **(Staff | All Companies)** Design a RAG caching layer. What do you cache and for how long?
6. **(Staff | Databricks)** How do you run RAG evals in CI/CD? What fails a build?
7. **(Staff | Google, Meta)** Design a RAG system for a legal firm that must: maintain document confidentiality, cite exact sources, and flag when it's uncertain.
8. **(Staff | All Companies)** How do you handle the case where a user's query has no relevant documents? What does the system return?

---

## DAY 35 — Phase 4 Project Day: PDF Chat (Project 2)

**Study Agenda (90 min)**

**Project 2 — AI PDF Chat (Complete Build)**
```
Build a production-quality PDF chat:
✅ PDF upload → parse text + extract page numbers
✅ Intelligent chunking (document-aware, preserve headings)
✅ text-embedding-3-small for embeddings
✅ Hybrid search: pgvector + BM25
✅ Cohere re-ranking
✅ Streaming answers with page-level citations
✅ Multi-PDF support (upload multiple, query across all)
✅ Suggested follow-up questions
✅ Conversation history
```

**GitHub Deliverable:** PDF Chat deployed, README with architecture diagram.

---

**📝 Day 35 Interview Practice Questions**

1. Walk me through your PDF Chat architecture. Why did you use each component?
2. **(Advanced)** How do you handle a 500-page PDF where the answer spans 3 different sections?
3. **(Staff)** How would you scale this to 10,000 simultaneous users?
4. **(Staff)** How do you handle PDFs with images and tables? What changes in your pipeline?

---

## DAYS 36–37 — Phase 4 Integration: Advanced RAG + Production Polish

### DAY 36 — Advanced RAG Techniques: Query Understanding + Self-RAG

**Study Agenda (75 min)**

- Query classification: is this a RAG question or a general knowledge question?
- Query decomposition: break complex questions into sub-questions
- Self-RAG: model generates, then retrieves to verify, then regenerates
- CRAG (Corrective RAG): detect irrelevant retrievals, trigger web search fallback
- Step-back prompting: generalize question before retrieving
- Conversational RAG: maintain chat history, reformulate queries based on context
- RAG fusion: multiple queries → multiple retrieval sets → combined answer

**Mini Project:** Add conversational RAG to Project 2 — the system remembers context and reformulates follow-up questions.

---

**📝 Day 36 Interview Practice Questions**

1. **(Advanced)** What is Self-RAG? How does it improve over standard RAG?
2. **(Advanced)** What is CRAG (Corrective RAG)? When does it trigger a web search fallback?
3. **(Advanced)** How do you handle multi-turn RAG where the user says "tell me more about point 3"?
4. **(Staff)** Design a RAG system that handles: simple factual queries, complex multi-part questions, and conversational follow-ups — all differently.
5. **(Staff)** How does RAG fusion work? Is the accuracy improvement worth the 3x retrieval cost?

---

### DAY 37 — RAG Evaluation Deep Dive + Phase 4 Checkpoint

**Study Agenda (75 min)**

- RAGAS metrics in depth: faithfulness, answer relevancy, context recall, context precision
- Building a golden dataset: what makes a good eval question
- Automated vs human evaluation: hybrid approach
- Tracking RAG quality over time: did a chunking change improve or hurt?
- Phase 4 complete review

**Phase 4 Completion Checklist:**
- [ ] Naive RAG pipeline implemented
- [ ] 5 chunking strategies tested and benchmarked
- [ ] Multi-strategy retrieval (naive, multi-query, HyDE) compared
- [ ] Re-ranking with Cohere implemented
- [ ] Hybrid search (semantic + BM25 + RRF) working
- [ ] Metadata filtering with multi-tenant isolation
- [ ] Production RAG architecture deployed (Project 21)
- [ ] PDF Chat deployed (Project 2)
- [ ] RAGAS eval suite running

---

**📝 Day 37 Interview Practice Questions**

1. **(Advanced)** What is the difference between faithfulness and relevance in RAGAS?
2. **(Advanced)** How do you build a golden eval dataset for RAG? What makes a question good for evaluation?
3. **(Staff)** How do you detect when your RAG system's quality has degraded in production?
4. **(Staff)** Walk me through every component of your Production RAG Platform. What would you change if you rebuilt it?
5. **(Staff)** A new team member says "let's just use a 1M context window instead of RAG." How do you respond?

---

# Phase 5: Vector Databases (Days 38–43)

> **Goal:** Master production vector storage. Complete Lessons 5.1.1–5.1.5.

---

## DAY 38 — Lesson 5.1.1: Vector Database Fundamentals

**Study Agenda (75 min)**

- What makes a vector DB different from a traditional DB
- HNSW (Hierarchical Navigable Small World): how ANN indexes work
- ANN vs exact nearest neighbor: recall-latency trade-off
- Index types: Flat (exact), IVF (partitioned), HNSW (graph), PQ (compressed)
- Recall@K: measuring index quality
- Persistence, backup, and ACID considerations
- The main players: pgvector, Pinecone, Weaviate, Chroma, Qdrant, Milvus

**Mini Project:** Benchmark HNSW vs Flat index on 100K vectors: measure recall@10 vs latency.

---

**📝 Day 38 Interview Practice Questions**

1. **(Intermediate)** What is HNSW? How does it enable sub-100ms ANN search?
2. **(Intermediate)** What is the recall-latency trade-off in vector databases?
3. **(Advanced)** Compare pgvector, Pinecone, Weaviate, and Chroma. When do you use each?
4. **(Advanced)** What is Product Quantization (PQ)? When do you use it?
5. **(Staff)** Design a vector database architecture for 500M vectors with strict data residency requirements.
6. **(Staff)** How do you back up and restore a vector database? What are the operational challenges?

---

## DAY 39 — Lesson 5.1.2: pgvector (PostgreSQL)

**Study Agenda (75 min)**

- pgvector extension: setup, `CREATE EXTENSION vector`
- Creating vector columns: `embedding vector(1536)`
- Similarity operators: `<->` (L2), `<#>` (negative inner product), `<=>` (cosine)
- IVFFlat index: `lists` parameter tuning
- HNSW index in pgvector: `m` and `ef_construction` parameters
- Hybrid search: vector search + `tsvector` full-text search in one query
- Supabase pgvector: managed PostgreSQL with vector support
- When pgvector beats Pinecone: existing Postgres stack, cost, simplicity

**Mini Project — Product Recommendation Engine**
```sql
-- Find products similar to what a user just viewed
-- Use pgvector cosine similarity + metadata filters (category, price range)
-- Target: <100ms P99 on 1M product embeddings
```

---

**📝 Day 39 Interview Practice Questions**

1. **(Intermediate)** How do you create a HNSW index in pgvector? What parameters matter?
2. **(Intermediate)** When would you choose pgvector over Pinecone?
3. **(Advanced)** How do you implement hybrid search combining pgvector and PostgreSQL full-text search in one query?
4. **(Advanced)** How does `ef_search` affect HNSW query performance?
5. **(Staff)** Design a pgvector schema for a multi-tenant RAG with 10M documents and row-level security.
6. **(Staff)** At what scale does pgvector start to struggle and what's your migration path?

---

## DAY 40 — Lesson 5.1.3: Pinecone

**Study Agenda (75 min)**

- Pinecone architecture: serverless vs pod-based — when each makes sense
- Indexes, namespaces, and records — data model
- Namespaces for multi-tenancy: one index, isolated namespaces per org
- Metadata filtering in Pinecone: filter syntax, limitations
- Hybrid search in Pinecone: sparse + dense vectors
- Pinecone Inference API: embed + store + query in one
- Cost modeling: serverless vs pod at different scales
- Migration: from pgvector to Pinecone

**Mini Project:** Migrate Production RAG Platform from pgvector to Pinecone. Compare: latency, cost, operational complexity.

---

**📝 Day 40 Interview Practice Questions**

1. **(Intermediate)** What is the difference between Pinecone serverless and pod-based?
2. **(Intermediate)** How do Pinecone namespaces work for multi-tenancy?
3. **(Advanced)** How does hybrid search (sparse + dense) work in Pinecone?
4. **(Advanced)** What are the limitations of Pinecone metadata filtering vs pgvector SQL?
5. **(Staff)** Cost model Pinecone serverless for 10M vectors with 100K daily queries. Is it cheaper than self-hosted pgvector?
6. **(Staff)** How do you migrate from Pinecone to a different vector DB with zero downtime?

---

## DAY 41 — Lesson 5.1.4: Weaviate & Chroma

**Study Agenda (75 min)**

- Chroma: local/in-memory, perfect for prototyping and testing
- Weaviate: schema-based, production-ready, built-in ML modules
- Weaviate generative search: built-in LLM integration per object
- Weaviate hybrid search: native BM25 + vector fusion
- When to use Chroma: local development, unit tests, small datasets
- When to use Weaviate: production with schema enforcement, built-in vectorization
- Self-hosting trade-offs: operational overhead vs cost savings

**Mini Project:** Build local RAG prototype with Chroma (fast to set up), then design the production migration path to Weaviate.

---

**📝 Day 41 Interview Practice Questions**

1. **(Intermediate)** When would you use Chroma vs Weaviate?
2. **(Intermediate)** What is Weaviate's generative search module? How does it differ from standard retrieval?
3. **(Advanced)** How does Weaviate's native hybrid search compare to building your own RRF fusion?
4. **(Staff)** Design the migration strategy from Chroma (prototype) to Weaviate (production) without downtime.
5. **(Staff)** Compare total cost of ownership: Weaviate self-hosted vs Pinecone managed vs pgvector on existing DB.

---

## DAY 42 — Lesson 5.1.5: Vector DB at Scale

**Study Agenda (75 min)**

- Scaling beyond 100M vectors: sharding strategies
- Quantization for memory reduction: Product Quantization (PQ), Scalar Quantization (SQ)
- How quantization affects recall: accuracy vs memory trade-off
- Multi-region vector DB deployment for low latency
- Cost modeling at 1B+ vectors: memory vs disk vs cloud
- Self-host vs managed: engineering overhead vs cost
- Qdrant and Milvus for large-scale deployments

**Mini Project:** Design a vector database architecture for a 10M-document legal research platform with: strict data residency (EU-only), sub-200ms P99, 99.9% availability.

---

**📝 Day 42 Interview Practice Questions**

1. **(Advanced)** How does Product Quantization reduce memory usage? What accuracy do you lose?
2. **(Advanced)** At what scale does a dedicated vector DB outperform pgvector?
3. **(Staff)** Design a globally distributed vector DB for a 1B-vector dataset with <100ms latency worldwide.
4. **(Staff)** How do you implement vector database sharding? What's the sharding key?
5. **(Staff)** Walk me through the cost model for a 500M vector deployment on Pinecone vs self-hosted Qdrant.

---

## DAY 43 — Phase 5 Project: Vector DB Portfolio Integration

**Study Agenda (90 min)**

- Add vector DB comparison documentation to GitHub portfolio
- Benchmark: pgvector vs Pinecone vs Chroma on same dataset
  - Measure: query latency P50/P95/P99, recall@10, monthly cost
- Write decision guide: "Which vector DB for your use case?" 
- Polish Production RAG Platform to use your benchmark winner

**Phase 5 Completion Checklist:**
- [ ] Understand HNSW, IVF, PQ indexing
- [ ] pgvector: can implement hybrid search with SQL
- [ ] Pinecone: namespace-based multi-tenancy implemented
- [ ] Weaviate: schema-based RAG prototype
- [ ] Can design vector DB architecture for 1B+ vectors
- [ ] Cost model all 4 options for a real use case

---

**📝 Day 43 Interview Practice Questions**

1. A startup asks: "Which vector database should we use?" Walk them through your decision process.
2. **(Staff)** You have 10M vectors, $500/month budget, and need 99.9% uptime. What do you build?
3. **(Staff)** How do you handle vector database schema migrations when embedding model changes (new dimensions)?
4. **(Staff)** Design a disaster recovery strategy for your production vector database.

---

# Phase 6: AI Agents & Agentic Systems (Days 44–55)

> **Goal:** Build reliable, production-ready AI agents. Complete all 8 lessons.
> Build Projects 11 (AI Interview Coach), 22 (SWE Agent), 23 (Multi-Agent Research), 24 (MCP Server).

---

## DAY 44 — Lesson 6.1.1: What is an AI Agent?

**Study Agenda (75 min)**

- Agents vs chatbots vs pipelines: the spectrum of autonomy
- The agent loop: Perceive → Think → Act → Observe → repeat
- ReAct framework: Reason + Act interleaved
- Agency spectrum: single tool call → multi-step → fully autonomous
- When agents are overkill: simple Q&A, single-step tasks
- When agents are necessary: multi-step tasks, dynamic tool selection, unknown task structure
- Agent reliability challenges: error accumulation, hallucinated tool calls, infinite loops

**Mini Project:** Build a ReAct agent from scratch in pure TypeScript (~100 lines). No framework. Implement: think → tool call → observe → decide to continue or stop.

---

**📝 Day 44 Interview Practice Questions**

1. **(Intermediate)** What is the difference between a chatbot, a pipeline, and an agent?
2. **(Intermediate)** What is the ReAct framework? How does it combine reasoning and acting?
3. **(Advanced)** What are the failure modes of autonomous agents? How do you design for reliability?
4. **(Advanced)** When should you NOT use an agent? What's the simpler alternative?
5. **(Staff)** How do you limit an agent's autonomy to prevent unintended actions?
6. **(Staff)** Design an agent system that automatically recovers from errors without human intervention.

---

## DAY 45 — Lesson 6.1.2: Agent Memory Systems

**Study Agenda (90 min)**

- 4 types of agent memory:
  - Sensory: current context window (what the agent currently sees)
  - Short-term: in-context working memory (scratch pad for reasoning)
  - Long-term: external storage (vector DB, SQL) — persistent across sessions
  - Procedural: skills, tools, and how to use them
- Memory retrieval: when and how to fetch relevant past context
- Memory compression: summarize old context when context window fills up
- Memory management in multi-turn conversations: what to keep, what to summarize
- Episodic memory: remember specific past interactions
- Semantic memory: general knowledge about user preferences

**Mini Project — Personal Research Assistant** *(Part of Project 14)*
```typescript
// Agent that remembers:
// - Past research topics and what you found
// - Your preferences and writing style
// - Previous questions and answers
// Answer: "What did I say about RAG last week?" with actual recall
```

---

**📝 Day 45 Interview Practice Questions**

1. **(Intermediate)** What are the 4 types of agent memory? Give a use case for each.
2. **(Advanced)** How does an agent know when to retrieve from long-term memory vs use its context?
3. **(Advanced)** How do you implement memory compression when an agent's conversation gets very long?
4. **(Staff)** Design a memory system for a personal AI assistant that persists across 6 months of daily use.
5. **(Staff)** How do you handle memory privacy? What if a user wants to delete specific memories?
6. **(Staff)** How do you evaluate whether an agent's memory system is working well?

---

## DAY 46 — Lesson 6.1.3: Agent Tool Design

**Study Agenda (75 min)**

- Tool design principles: single responsibility, clear descriptions, predictable behavior
- Why tool descriptions matter as much as tool code (the model reads them)
- Atomic vs composite tools: prefer atomic, compose at the agent level
- Error handling in tools: return structured errors, not exceptions
- Idempotent tools: why delete/write tools need idempotency keys
- Rate-limiting tools: prevent agent from hammering an API
- Human-in-the-loop tools: "Are you sure you want to send this email?"
- Tool versioning: what happens when a tool changes signature

**Mini Project — Sales Research Agent Tool Library** *(Part of Project 22)*
```typescript
// 10 atomic, well-documented tools:
const tools = {
  searchCompany, findContacts, enrichData,
  draftEmail, sendEmail, logToCRM,
  scheduleFollowUp, createTask, generateReport, fetchNewsAbout
}
// Each with: description, input schema (Zod), output schema, error handling
```

---

**📝 Day 46 Interview Practice Questions**

1. **(Intermediate)** Why does the tool description matter as much as the tool implementation?
2. **(Intermediate)** What is the difference between atomic and composite tools?
3. **(Advanced)** How do you implement a human-in-the-loop tool that pauses the agent for approval?
4. **(Advanced)** How do you make destructive tools (delete, send) safe for an autonomous agent?
5. **(Staff)** Design a tool library for an enterprise AI agent that interacts with: email, calendar, CRM, and internal databases.
6. **(Staff)** How do you test tool selection accuracy? How do you know the agent picks the right tool?

---

## DAY 47 — Lesson 6.1.4: Agent Planning & Reasoning

**Study Agenda (75 min)**

- Plan-and-execute pattern: generate full plan first, then execute steps
- Task decomposition: break complex goals into subtasks
- Dynamic re-planning: adapt plan when a step fails or returns unexpected results
- Reflection and self-critique: agent evaluates its own output
- Why agents hallucinate plans: training distribution mismatch
- Stopping conditions: how does the agent know it's done?
- Plan validation: check plan makes sense before executing

**Mini Project — Project Planner Agent**
```typescript
// Goal: "Build a RAG-powered customer support bot"
// Agent: creates multi-step plan → executes → reflects → adjusts
// Handle: failed steps, partial completion, user feedback mid-execution
```

---

**📝 Day 47 Interview Practice Questions**

1. **(Intermediate)** What is the plan-and-execute pattern? How is it different from ReAct?
2. **(Advanced)** How does an agent re-plan dynamically when a step fails?
3. **(Advanced)** What is reflection in an agent context? How does self-critique improve output quality?
4. **(Staff)** Design a planning system for an agent that must: book travel, arrange meetings, and prepare materials for a 5-day business trip.
5. **(Staff)** How do you set stopping conditions for an agent? What prevents infinite loops?
6. **(Staff)** How do you evaluate planning quality in an agent? What metrics do you track?

---

## DAY 48 — Lesson 6.1.5: Multi-Agent Systems

**Study Agenda (90 min)**

- Orchestrator → Sub-agent pattern: one agent coordinates, others specialize
- Peer-to-peer agent communication: agents directly message each other
- Specialization: why specialized agents outperform one generalist agent
- Shared vs isolated memory: when agents should share context
- Inter-agent messaging protocols: structured handoff format
- Failure handling: what happens when a sub-agent fails?
- Observability: tracing every message across agent boundaries
- The Planner + Executor + Reviewer triad

**Mini Project — Research → Write → Fact-Check Pipeline** *(Portfolio Project 23)*
```
3 specialized agents:
Agent 1 (Researcher): web search → extract key claims → return structured findings
Agent 2 (Writer): findings → draft article with citations
Agent 3 (Fact Checker): article → verify each claim → flag issues → approve/reject
Orchestrator: manage handoffs, handle rejections, final output
```

---

**📝 Day 48 Interview Practice Questions**

1. **(Intermediate)** When does a multi-agent system outperform a single powerful agent?
2. **(Advanced)** How do you implement a structured handoff between agents? What data is passed?
3. **(Advanced)** How do you handle a failure in one sub-agent without losing the work done by others?
4. **(Staff)** Design a multi-agent system for automated software deployment: plan → code → test → deploy → monitor.
5. **(Staff)** How do you add observability to trace every message in a 10-agent system?
6. **(Staff)** When does a multi-agent system become too complex? What are the signs to simplify?

---

## DAY 49 — Lesson 6.2.1: LangGraph

**Study Agenda (90 min)**

- Why LangGraph: state management + conditional routing = reliable agents
- Graph concepts: nodes (functions), edges (transitions), state (shared data)
- State definition: TypeScript/Python typed state object
- Conditional edges: dynamic routing based on agent decision
- Loops and cycles: how LangGraph handles iteration
- Human-in-the-loop checkpoints: pause for approval, then resume
- Persistence: save and restore agent state across sessions
- Streaming agent steps to the frontend

**Mini Project — Software Engineer Agent** *(Portfolio Project 22)*
```
LangGraph nodes:
ReadRequirements → WriteCode → RunTests → FixFailures (loop) → CreatePR
Conditional: if tests pass → CreatePR, else → FixFailures (up to 3 attempts)
Human checkpoint: approve PR content before submission
```

---

**📝 Day 49 Interview Practice Questions**

1. **(Intermediate)** Why is LangGraph better than a simple for-loop for agent control flow?
2. **(Advanced)** How do you implement a human-in-the-loop checkpoint in LangGraph?
3. **(Advanced)** How does LangGraph persistence work? How do you resume a paused agent?
4. **(Advanced)** How do you implement loops with a maximum iteration limit in LangGraph?
5. **(Staff)** Design a LangGraph workflow for a complete software release: code review → testing → staging deploy → production deploy with rollback.
6. **(Staff)** How do you stream LangGraph agent steps to a React frontend in real time?

---

## DAY 50 — Lesson 6.2.2 + 6.2.3: CrewAI + AutoGen

**Study Agenda (90 min — combined)**

**CrewAI (40 min):**
- Abstractions: Crew, Agent, Task, Process
- Sequential vs Hierarchical vs Parallel processes
- Agent role definitions and goal specifications
- Crew memory: shared and individual
- When CrewAI outperforms LangGraph: role-based, less graph complexity

**AutoGen / AG2 (40 min):**
- Conversation patterns: two-agent, group chat
- User proxy vs AI proxy agents
- Group chat: how agents take turns
- Code execution capabilities: AI writes code, sandbox runs it
- AutoGen vs LangGraph: different philosophy, overlapping use cases

**Mini Project — Content Marketing Crew** *(Part of Project 23)*
```
CrewAI: Market Researcher → Content Writer → SEO Editor → Quality Reviewer
AutoGen: Data Analysis Team debating approach before executing Python analysis
```

---

**📝 Day 50 Interview Practice Questions**

1. **(Intermediate)** What are the differences between CrewAI and LangGraph? When do you choose each?
2. **(Advanced)** How does AutoGen's group chat differ from a LangGraph multi-agent graph?
3. **(Advanced)** What is AutoGen's code execution capability? What sandbox does it use?
4. **(Staff)** You need to build a 5-agent research system. Compare LangGraph vs CrewAI for this use case.
5. **(Staff)** What are the observability challenges unique to multi-agent frameworks like CrewAI?

---

## DAY 51 — Lesson 6.2.4: Building Agents Without Frameworks

**Study Agenda (75 min)**

- The case for bare-metal agents: full control, easier debugging, no abstraction leaks
- Pure TypeScript agent loop: ~150 lines that do everything
- State machine for agent behavior: typed states, explicit transitions
- When frameworks add value vs add complexity
- Debugging agents without framework scaffolding
- Performance: framework overhead vs bare API calls

**Mini Project — Pure TypeScript ReAct Agent**
```typescript
// Under 200 lines, no LangChain/LangGraph/CrewAI
// Implements: think → tool call → observe → decide (continue/stop)
// Tools: webSearch, calculator, readFile, writeFile
// State: messages[], tool_calls[], iteration_count
// Then document: "Here's what LangGraph adds on top of this"
```

---

**📝 Day 51 Interview Practice Questions**

1. **(Advanced)** When would you build an agent from scratch instead of using LangGraph or CrewAI?
2. **(Advanced)** What does a framework like LangGraph add over a bare-metal agent loop?
3. **(Staff)** You're debugging an agent that's stuck in a loop. Walk through your debugging process.
4. **(Staff)** How do you write unit tests for a bare-metal agent?
5. **(Staff)** What are the performance differences between LangGraph and a hand-rolled agent loop?

---

## DAY 52 — Phase 6 Project: AI Interview Coach (Project 11)

**Study Agenda (90 min)**

**Project 11 — AI Interview Coach (Full Build)**
```
Architecture:
Voice Input (Web Speech API) → Whisper (transcription) → Interview Agent
                                                                ↓
                                              LangGraph: Question → FollowUp → Evaluate
                                                                ↓
                                              TTS (ElevenLabs/OpenAI) → Voice Response
                                                                ↓
                                              Evaluation Engine → STAR score → Feedback report

Features:
✅ Voice-based mock interviews (any job level, any company)
✅ Dynamic follow-up questions based on answer
✅ Real-time feedback display
✅ STAR method scoring rubric
✅ Session recording and replay
✅ Progress tracking across sessions
```

---

**📝 Day 52 Interview Practice Questions**

1. Walk me through the architecture of your AI Interview Coach.
2. **(Advanced)** How do you generate dynamic follow-up questions that feel natural?
3. **(Advanced)** How do you measure STAR method quality in an answer?
4. **(Staff)** How would you scale this to 10,000 simultaneous mock interviews?
5. **(Staff)** How do you handle latency — the gap between user speaking and AI responding must be <2s for natural conversation.

---

## DAYS 53–55 — Advanced Agent Topics + Phase 6 Checkpoint

### DAY 53 — Agent Reliability, Testing & Observability

**Study Agenda (75 min)**

- Agent reliability challenges: error accumulation, hallucinated tool calls
- Retry patterns for agents: transient vs permanent failures
- Agent testing strategies: unit test individual nodes, integration test full loops
- Observability: trace every agent step, log every tool call with latency
- LangSmith for agent tracing: visualize the full execution graph
- Evals for agents: success rate, task completion rate, step efficiency
- Circuit breakers for runaway agents

**Mini Project:** Add full LangSmith observability to the SWE Agent (Project 22). Trace every step, measure tool call accuracy.

---

**📝 Day 53 Interview Practice Questions**

1. **(Advanced)** How do you implement retry logic in a multi-step agent without re-executing successful steps?
2. **(Advanced)** How do you write a test for an agent that must complete a 10-step task?
3. **(Staff)** Design an agent monitoring system that detects when an agent is looping and kills it.
4. **(Staff)** How do you measure "task completion rate" for an autonomous agent?

---

### DAY 54 — Agent Security & Human-in-the-Loop Patterns

**Study Agenda (75 min)**

- Prompt injection risk in agents: indirect injection via tool outputs
- Minimal permission principle: agents should only have tools they need
- Human-in-the-loop: when to require approval before acting
- Reversibility: prefer reversible actions over irreversible
- Agent sandboxing: limit what code an agent can execute
- Audit logging: every action an agent takes must be logged

**Mini Project:** Add human-in-the-loop approval to the SWE Agent: pause before creating PR, display plan for approval.

---

**📝 Day 54 Interview Practice Questions**

1. **(Advanced)** Why is prompt injection especially dangerous in agent systems?
2. **(Advanced)** How do you implement the minimal permission principle for AI agents?
3. **(Staff)** Design a human-in-the-loop system for an agent that can spend company money.
4. **(Staff)** How do you audit all actions taken by an autonomous agent in production?

---

### DAY 55 — Phase 6 Checkpoint + Portfolio Review

**Study Agenda (90 min)**

- Review all Phase 6 concepts
- Push all agent projects to GitHub with documentation
- Write a comprehensive README for Project 22 (SWE Agent) — your flagship agent project
- Document: architecture diagram, design decisions, failure modes addressed

**Phase 6 Completion Checklist:**
- [ ] Can build a ReAct agent from scratch without frameworks
- [ ] Can implement 4 types of agent memory
- [ ] Can design a 10-tool library for a real use case
- [ ] Can implement plan-and-execute with dynamic re-planning
- [ ] Can build multi-agent orchestration (Planner + Executor + Reviewer)
- [ ] LangGraph SWE Agent (Project 22) deployed
- [ ] CrewAI Research Pipeline (Project 23) working
- [ ] Pure TypeScript agent implemented
- [ ] AI Interview Coach (Project 11) deployed

---

**📝 Day 55 Interview Practice Questions**

1. Walk me through your most complex agent project. What were the hardest problems?
2. **(Staff)** You need to build an agent that can browse the web, write code, and send emails. Design the complete system including safety controls.
3. **(Staff)** How do you make an agent reliable enough for production? What's your testing and monitoring strategy?
4. **(Staff)** Compare LangGraph vs CrewAI vs bare-metal for a new agent project. What do you choose?
5. **(Staff)** Design a multi-agent system for a completely autonomous software engineer that can take a ticket from backlog to merged PR.
