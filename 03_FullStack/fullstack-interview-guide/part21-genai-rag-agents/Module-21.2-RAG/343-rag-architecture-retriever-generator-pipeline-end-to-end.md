# RAG Architecture — Retriever + Generator Pipeline End to End
> Part 21 — Generative AI for Full Stack Engineers · RAG
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Two-phase pipeline**: Retrieval phase (embed the query → search vector DB → return top k chunks) followed by Generation phase (insert retrieved chunks into prompt → call LLM → return answer); these are two separate operations, each with its own failure mode
- **Ingestion pipeline is offline work**: documents are chunked → embedded → stored in vector DB; this happens before any user query; the quality of ingestion (chunking strategy, embedding model choice) determines retrieval quality
- **Query pipeline is online work**: at query time, embed the user's question, do vector similarity search, retrieve top k chunks, augment the prompt, call LLM; all of this must happen within your latency SLA (often 2-5 seconds end to end)
- **The embedding model must be consistent**: the model used to embed documents during ingestion MUST be the same model used to embed queries at query time; mixing embedding models breaks semantic similarity entirely
- **Top-k is a tuning parameter**: k=3 is a common default; too few chunks and you miss relevant content; too many chunks and you fill the context window with noise; tune based on evaluation of retrieval recall on your test set
- **The simplest production RAG stack in Java**: Spring Boot + Spring AI + pgvector = all RAG components in one service with Postgres as the only infrastructure addition; no new database to operate until you genuinely need dedicated vector DB scale

---

## 1. One-Line Definition
The RAG pipeline has two phases: an offline ingestion phase that chunks, embeds, and stores documents in a vector database, and an online retrieval phase that embeds the user query, finds the k most relevant chunks, and passes those chunks plus the query to the LLM.

---

## 2. Full Pipeline Diagram

```
─────────────────────────────────────────────────────────────────────────
OFFLINE INGESTION PIPELINE (runs once + on document update)
─────────────────────────────────────────────────────────────────────────

  Raw Documents (PDF, HTML, Markdown, DB records)
       │
       ▼
  [1] LOAD & PARSE
  Extract clean text; strip HTML/PDF formatting artifacts
       │
       ▼
  [2] CHUNK
  Split into overlapping segments (eg. 500 tokens, 50-token overlap)
  Each chunk should be self-contained / meaningful in isolation
       │
       ▼
  [3] EMBED
  Send each chunk to embedding model (eg. text-embedding-3-small)
  → Dense vector [0.12, -0.34, ..., 0.08] (1536 dimensions for Ada)
       │
       ▼
  [4] STORE
  Vector DB stores: {vector, text, metadata{source, date, chunkId}}
  pgvector: INSERT INTO documents (content, embedding, metadata)
       │
       ▼
  ✅ Knowledge base ready for retrieval

─────────────────────────────────────────────────────────────────────────
ONLINE RETRIEVAL + GENERATION PIPELINE (runs per user query)
─────────────────────────────────────────────────────────────────────────

  User Query: "What is the refund window?"
       │
       ▼
  [1] EMBED QUERY
  Same embedding model → [0.11, -0.31, ..., 0.09]
       │
       ▼
  [2] VECTOR SEARCH
  pgvector / Pinecone: cosine similarity search → top k=3 chunks
  "Chunk 4: Refunds are processed within 7 days..."
  "Chunk 11: Subscription refund window is 14 days..."
  "Chunk 2: No refunds after 30 days of service..."
       │
       ▼
  [3] (OPTIONAL) RERANK
  Second pass: reranker model or cross-encoder re-scores chunks 
  by relevance to the specific query; improves precision
  (covered in depth in Topic 347)
       │
       ▼
  [4] AUGMENT PROMPT
  System: "Answer using ONLY the CONTEXT."
  Context: [Chunk1] [Chunk11] [Chunk2]
  Question: "What is the refund window?"
       │
       ▼
  [5] GENERATE
  LLM → "Refunds are available within 7 days for standard orders..."
       │
       ▼
  [6] RETURN
  Response + cited source chunks to user
```

---

## 3. Spring AI + pgvector Implementation

### Ingestion Service

```java
// Ingestion: load, split, embed, store
@Service
public class DocumentIngestionService {

    private final VectorStore vectorStore;    // pgvector backed
    private final DocumentReader pdfReader;

    public void ingestDocument(Resource pdfFile) {
        // Step 1: Load and parse
        List<Document> rawDocs = new PagePdfDocumentReader(pdfFile)
            .get();

        // Step 2: Chunk with overlap
        TokenTextSplitter splitter = TokenTextSplitter.builder()
            .withChunkSize(500)
            .withMinChunkSizeChars(200)
            .withMinChunkLengthToEmbed(50)
            .withMaxNumChunks(1000)
            .withKeepSeparator(true)
            .build();
        List<Document> chunks = splitter.apply(rawDocs);

        // Step 3 + 4: Embed and store (Spring AI does this atomically)
        // VectorStore calls the embedding model internally
        // then writes vector + text + metadata to pgvector
        vectorStore.add(chunks);
        
        log.info("Ingested {} chunks from {}", chunks.size(), pdfFile.getFilename());
    }
}

// application.yaml
// spring:
//   ai:
//     openai:
//       embedding:
//         options:
//           model: text-embedding-3-small   ← must match query-time model
//     vectorstore:
//       pgvector:
//         schema-name: public
//         table-name: vector_store
//         dimensions: 1536
```

### Query (Retrieval + Generation) Service

```java
@Service
public class RagQueryService {

    private final VectorStore vectorStore;
    private final ChatClient chatClient;

    private static final String SYSTEM_PROMPT = """
        You are a support assistant. Answer using ONLY the CONTEXT provided.
        If the answer is not in the CONTEXT, say exactly:
        "I don't have enough information to answer this accurately."
        Always reference the source in your answer.
        """;

    public String query(String userQuestion) {
        // Step 1: retrieve top 3 relevant chunks
        List<Document> relevantDocs = vectorStore.similaritySearch(
            SearchRequest.query(userQuestion)
                .withTopK(3)
                .withSimilarityThreshold(0.65)   // filter out low-relevance results
        );

        if (relevantDocs.isEmpty()) {
            return "I don't have enough information to answer this accurately.";
        }

        // Step 2: build context from retrieved chunks
        String context = relevantDocs.stream()
            .map(Document::getContent)
            .collect(Collectors.joining("\n\n---\n\n"));

        // Step 3: augment prompt and call LLM
        return chatClient.prompt()
            .system(SYSTEM_PROMPT)
            .user(u -> u.text("""
                CONTEXT:
                {context}
                
                QUESTION: {question}
                """)
                .param("context", context)
                .param("question", userQuestion)
            )
            .call()
            .content();
    }
}
```

### pgvector Schema

```sql
-- Spring AI creates this automatically with schema-initialization=true
-- but useful to understand:

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE vector_store (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content     TEXT NOT NULL,
    metadata    JSONB,
    embedding   VECTOR(1536)   -- dimensions must match embedding model
);

-- HNSW index for fast approximate nearest neighbour search
CREATE INDEX ON vector_store 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## 4. The Pattern in Practice

### Wrong Way — Poor chunk boundaries

```
❌ Chunking naively by character count:

Source text:
"Section 4: Refund Policy
 4.1 Standard Returns
 Customers may return items within 7 days of delivery.
 The item must be in original condition.
 ---NEW CHUNK---
 Exceptions apply for perishable goods and digital downloads.
 See section 4.2 for subscription-specific terms.
 4.2 Subscription Refunds
 Subscriptions are refundable within 14 days of renewal."

Problem: The chunk boundary cuts through the return policy.
If a user asks about subscription refunds, chunk 1 contains
irrelevant standard returns context; chunk 2 is missing the 
7-day standard return context needed for comparison.

Neither chunk is self-contained.
```

```
✅ Semantic / section-aware chunking:

Chunk correctly at natural boundaries:
  Chunk A: "Section 4.1 Standard Returns: Customers may return 
            items within 7 days of delivery..."
            [Source: policy-v3.pdf, section 4.1]

  Chunk B: "Section 4.2 Subscription Refunds: Subscriptions are 
            refundable within 14 days of renewal..."
            [Source: policy-v3.pdf, section 4.2]

Each chunk is coherent and self-contained.
Metadata includes source + section for citation.
```

---

## 5. Key Architectural Decisions

```
DECISION 1: CHUNKING STRATEGY
  Fixed token size (500 tokens, 50-overlap): simplest; good baseline
  Semantic chunking: split at natural paragraph/section boundaries
  Hierarchical: large parent chunks for context + small child chunks 
                for precise retrieval (advanced; see Topic 346)

DECISION 2: TOP-K
  k=3: low context fill, high precision, may miss relevant chunks
  k=5-10: more context, more noise, higher LLM cost
  With reranking: k=20 retrieve, rerank, pass top 3 to LLM 
  → best quality, higher retrieval cost

DECISION 3: SIMILARITY THRESHOLD
  withSimilarityThreshold(0.65-0.75)
  Filters out low-relevance retrievals
  If threshold too high: may return empty results
  If too low: noisy chunks degrade answer quality

DECISION 4: EMBEDDING MODEL
  Consistency rule: SAME model for ingestion and query
  text-embedding-3-small: cost-effective, 1536 dims
  text-embedding-ada-002: older OpenAI default, still widely used
  Sentence-BERT: open-source; good for self-hosted RAG
```

---

## 6. Interview Questions & Model Answers

### Q1 — Full pipeline description
**Interviewer:** "Walk me through the end-to-end architecture of a RAG system."

**Hruday:**
> "Two pipelines. The offline ingestion pipeline runs when documents are added or updated: load and parse the document, split into overlapping chunks of ~500 tokens each, embed each chunk with a consistent embedding model, and store the vector in a vector database alongside the text and metadata. The online query pipeline runs per user request: embed the user's question with the same embedding model, do a vector similarity search to retrieve the top 3-5 most relevant chunks, optionally rerank them for precision, insert those chunks into the LLM prompt with a grounding instruction, call the LLM, and return the grounded answer. The key design invariants are: same embedding model for both pipelines, a similarity threshold to filter low-relevance chunks, and an explicit 'use only the retrieved content' instruction in the system prompt."

---

## 7. Hruday's Real Experience Hook
> "When I built a RAG system over our SAP product documentation, the first version used fixed 500-character chunk sizes. Retrieval looked reasonable in isolation, but the LLM answers were often incomplete or contradictory. The root cause: chunks were splitting in the middle of numbered procedure steps — step 3 of a 5-step process was in one chunk, steps 4-5 in the next. The model was answering from incomplete procedures. Switching to semantic chunking at paragraph and section heading boundaries immediately improved answer coherence on procedural questions. The lesson: chunk quality determines answer quality far more than model quality."

---

## 8. Scale Evolution

**100 documents →** pgvector with cosine similarity; fixed-size chunking; no reranking needed; simple Spring AI VectorStore.

**10,000 documents →** HNSW index on pgvector; semantic chunking; similarity threshold added; metadata filters for document categories.

**1M+ documents →** Dedicated vector DB (Pinecone or Weaviate); multi-tenant retrieval with namespace isolation; hybrid search (vector + keyword BM25); reranking layer; async ingestion pipeline via Kafka.

---

## 9. Company Relevance

| Company | RAG pipeline concern | Interview signal |
|---------|---------------------|-----------------|
| Razorpay / PhonePe | API documentation + merchant support; multi-domain knowledge (payments, settlements, compliance) | Metadata filtering to retrieve from correct domain; grounding instruction prevents cross-domain contamination |
| Swiggy / Meesho | Real-time catalogue + order data; freshness is critical | Async ingestion pipeline (new products indexed within minutes); similarity threshold tuning for catalogue specificity |
| Adobe / Microsoft | Enterprise knowledge base scale; SharePoint integration | Azure AI Search as retrieval layer; Microsoft vector search APIs |
| SAP Labs | SAP Help documentation (millions of pages); customer-specific configuration data | Multi-tenant namespace isolation; SAP AI Core vector search integration; pgvector for internal prototypes |

---

## 10. Related Topics — What to Study Next

- **Topic 344 — Vector Databases** — storage layer deep dive (CosineSimilarity, HNSW internals)
- **Topic 345 — Embeddings** — how text becomes the vectors that drive retrieval
- **Topic 346 — Chunking Strategies** — the fixed vs semantic vs hierarchical decision covered in depth
- **Topic 347 — Reranking** — the post-retrieval step that dramatically improves answer quality
- **Topic 349 — Implementing RAG with Spring Boot + pgvector** — full code walkthrough

---

*Part 21 · RAG Architecture — Retriever + Generator Pipeline End to End · Full Stack Interview Guide · Hruday D · 2026*
