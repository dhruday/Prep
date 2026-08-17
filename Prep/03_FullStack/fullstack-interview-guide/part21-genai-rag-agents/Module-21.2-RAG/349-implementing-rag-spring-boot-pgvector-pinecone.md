# Implementing RAG with Spring Boot + pgvector or Pinecone
> Part 21 — Generative AI for Full Stack Engineers · RAG
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Start with pgvector**: it's a Postgres extension — no new database to operate; Spring AI has a native `PgVectorStore`; if you already run Postgres (you almost certainly do), add the extension and you're done; migrate to Pinecone only when pgvector becomes a bottleneck
- **Spring AI abstracts vectorstore + LLM calls**: `ChatClient` for generation, `VectorStore` for retrieval, `EmbeddingModel` for embedding — these are interfaces; swap implementations by changing configuration, not code
- **The ingestion endpoint is idempotent**: re-ingesting the same document should update (not duplicate) chunks; implement upsert by document ID or delete-then-insert; duplicate chunks corrupt retrieval by making the same content appear more important than it is
- **Always set a similarity threshold**: `withSimilarityThreshold(0.65)` in `SearchRequest` filters out low-relevance chunks before they reach the LLM; without a threshold, a query with no good answer still returns the "least irrelevant" chunks and the LLM hallucinates from them
- **Log the retrieval context**: for every LLM call, log the chunks retrieved, their similarity scores, and the final prompt; this makes debugging wrong answers fast — you know whether the retrieval failed or the generation failed
- **Pinecone integration is minimal code change**: Spring AI's `PineconeVectorStore` implements the same `VectorStore` interface as `PgVectorStore`; switching is a dependency change + config change; no application logic changes

---

## 1. One-Line Definition
A production Spring Boot RAG implementation consists of an ingestion pipeline (parse, chunk, embed, store) and a query pipeline (embed, retrieve, augment, generate), both managed through Spring AI's `VectorStore` and `ChatClient` abstractions backed by pgvector or Pinecone.

---

## 2. Dependencies Setup

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Spring AI BOM -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-bom</artifactId>
        <version>1.0.0</version>
        <type>pom</type>
        <scope>import</scope>
    </dependency>

    <!-- OpenAI (LLM + Embedding) -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
    </dependency>

    <!-- pgvector VectorStore -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-pgvector-store-spring-boot-starter</artifactId>
    </dependency>

    <!-- OR Pinecone (swap this in instead of pgvector) -->
    <!-- 
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-pinecone-store-spring-boot-starter</artifactId>
    </dependency>
    -->

    <!-- Spring Data JPA + PostgreSQL driver (pgvector requires Postgres) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
    </dependency>
</dependencies>
```

---

## 3. Configuration

```yaml
# application.yaml

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/ragdb
    username: postgres
    password: ${DB_PASSWORD}

  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-4o-mini      # use mini for cost-efficiency
          temperature: 0.0
      embedding:
        options:
          model: text-embedding-3-small   # MUST match ingestion + query

    vectorstore:
      pgvector:
        schema-name: public
        table-name: vector_store
        dimensions: 1536             # must match embedding model output
        distance-type: COSINE_DISTANCE
        index-type: HNSW
        initialize-schema: true      # creates table + HNSW index on startup
```

---

## 4. Ingestion Pipeline

```java
@Service
@Slf4j
public class DocumentIngestionService {

    private final VectorStore vectorStore;

    // IDEMPOTENT INGESTION: delete by source before re-inserting
    // This ensures updates don't duplicate chunks
    public void ingestDocument(String documentId, Resource resource, 
                                String documentTitle) {
        
        // Step 1: Delete existing chunks for this document (idempotent)
        vectorStore.delete(
            List.of(Filter.expression("metadata['doc_id'] == '" + documentId + "'"))
        );
        
        // Step 2: Load and parse
        List<Document> rawDocs = new PagePdfDocumentReader(resource).get();
        
        // Step 3: Chunk with overlap
        TokenTextSplitter splitter = TokenTextSplitter.builder()
            .withChunkSize(500)
            .withMinChunkSizeChars(200)
            .withKeepSeparator(true)
            .build();
        List<Document> chunks = splitter.apply(rawDocs);
        
        // Step 4: Add metadata to each chunk
        chunks.forEach(chunk -> {
            chunk.getMetadata().put("doc_id", documentId);
            chunk.getMetadata().put("title", documentTitle);
            chunk.getMetadata().put("ingested_at", Instant.now().toString());
        });
        
        // Step 5: Embed + store (Spring AI handles this atomically)
        vectorStore.add(chunks);
        
        log.info("Ingested doc={} chunks={}", documentId, chunks.size());
    }
}
```

---

## 5. Query Pipeline (RAG Service)

```java
@Service
@Slf4j
public class RagService {

    private final VectorStore vectorStore;
    private final ChatClient chatClient;

    private static final String SYSTEM_PROMPT = """
        You are a knowledgeable assistant.
        Answer the question using ONLY the CONTEXT provided.
        If the answer is not in the CONTEXT, say exactly:
        "I don't have enough information to answer this accurately."
        Reference the document title when summarising information.
        """;

    public RagResponse query(String userQuestion) {
        
        // Step 1: Retrieve relevant chunks
        List<Document> relevantDocs = vectorStore.similaritySearch(
            SearchRequest.query(userQuestion)
                .withTopK(4)
                .withSimilarityThreshold(0.65)
        );
        
        if (relevantDocs.isEmpty()) {
            log.warn("No relevant docs found for query: {}", userQuestion);
            return new RagResponse(
                "I don't have enough information to answer this accurately.",
                List.of()
            );
        }
        
        // Step 2: Log retrieved chunks (critical for debugging)
        relevantDocs.forEach(doc ->
            log.debug("Retrieved chunk: source={} similarity={}",
                doc.getMetadata().get("title"),
                doc.getMetadata().get("distance"))
        );
        
        // Step 3: Build context
        String context = relevantDocs.stream()
            .map(d -> "[" + d.getMetadata().get("title") + "]\n" + d.getContent())
            .collect(Collectors.joining("\n\n---\n\n"));
        
        // Step 4: Generate
        String answer = chatClient.prompt()
            .system(SYSTEM_PROMPT)
            .user(u -> u.text("CONTEXT:\n{ctx}\n\nQUESTION: {q}")
                .param("ctx", context)
                .param("q", userQuestion))
            .call()
            .content();
        
        // Step 5: Return answer + sources (for citation)
        List<String> sources = relevantDocs.stream()
            .map(d -> (String) d.getMetadata().get("title"))
            .distinct()
            .toList();
        
        return new RagResponse(answer, sources);
    }
}

// Response DTO
public record RagResponse(String answer, List<String> sources) {}
```

---

## 6. REST Controller

```java
@RestController
@RequestMapping("/api/rag")
public class RagController {

    private final RagService ragService;
    private final DocumentIngestionService ingestionService;

    @PostMapping("/ingest")
    public ResponseEntity<Void> ingest(
            @RequestParam String documentId,
            @RequestParam String title,
            @RequestParam MultipartFile file) throws IOException {
        
        ingestionService.ingestDocument(
            documentId,
            new InputStreamResource(file.getInputStream()),
            title
        );
        return ResponseEntity.ok().build();
    }

    @PostMapping("/query")
    public ResponseEntity<RagResponse> query(@RequestBody QueryRequest request) {
        RagResponse response = ragService.query(request.question());
        return ResponseEntity.ok(response);
    }
}

public record QueryRequest(String question) {}
```

---

## 7. The Pattern in Practice

### Wrong Way — No similarity threshold

```
❌ SearchRequest.query(userQuestion).withTopK(3)  // no threshold

When the user asks an out-of-scope question:
  "What is the capital of Australia?"
  
  The vector DB still returns 3 "least distant" chunks from your 
  knowledge base (eg. about office locations, geography mentions).
  
  These chunks are irrelevant but they reach the LLM.
  The LLM may hallucinate an answer from them.
  Or it generates a confused response that mixes irrelevance.
```

```
✅ Threshold filters meaningless retrievals:

  SearchRequest.query(userQuestion)
      .withTopK(3)
      .withSimilarityThreshold(0.65)  // only return if similarity >= 65%

  Out-of-scope question: 0 chunks returned above threshold.
  Your code: returns the "I don't have enough information" message.
  User gets: an honest "not in scope" rather than hallucination.
```

---

## 8. Switching from pgvector to Pinecone

```java
// NO application code changes needed.
// Only change: dependency + configuration.

// application.yaml (Pinecone config)
// spring:
//   ai:
//     pinecone:
//       api-key: ${PINECONE_API_KEY}
//       index-name: my-rag-index
//       namespace: production

// pom.xml: swap pgvector starter for pinecone starter

// RagService stays IDENTICAL — VectorStore interface is the same.
// This is the value of Spring AI's abstraction.
```

---

## 9. Interview Questions & Model Answers

### Q1 — Implementation choice
**Interviewer:** "Why pgvector over a dedicated vector database like Pinecone in the first version?"

**Hruday:**
> "Three reasons. First, zero new infrastructure — we already run Postgres; adding the vector extension takes one command. Second, operational simplicity — the team already knows how to monitor, backup, and tune Postgres; we'd be adding a new operational surface with Pinecone. Third, Spring AI's VectorStore abstraction means the migration is a config change when we outgrow pgvector; no application code changes. I'd choose Pinecone when we hit scale that needs automatic horizontal sharding, when we need managed SLAs with zero operations overhead, or when the document count goes above 10-20 million. At prototype scale, pgvector covers everything at lower complexity."

---

## 10. Scale Evolution

**Prototype →** pgvector; `initialize-schema=true`; top-k=3; basic similarity threshold; flat table.

**Production →** pgvector + HNSW index manually optimised; metadata columns indexed; similarity threshold tuned on evaluation set; logging per RAG call; idempotent ingestion.

**High scale →** Pinecone or Weaviate; async ingestion pipeline via Kafka; reranking layer; semantic caching to reduce LLM calls; per-tenant namespacing.

---

## 11. Company Relevance

| Company | RAG implementation detail | Interview signal |
|---------|--------------------------|-----------------|
| Razorpay / PhonePe | Postgres is almost certainly in stack; pgvector requires zero infrastructure addition | Spring Boot + pgvector minimal stack; HNSW index; idempotent ingestion for doc updates |
| Swiggy / Meesho | High-volume catalogue means vector scale matters; async ingestion pipeline | Kafka-based ingestion; Pinecone for scale; namespace per product domain |
| Adobe / Microsoft | Azure AI Search has vector search; Azure OpenAI Service with Spring AI | Azure AI Search as VectorStore alternative; Spring AI Azure integration |
| SAP Labs | SAP AI Core has managed vector capabilities; Spring AI integration with SAP BTP | Spring AI as Java-native integration layer; SAP AI Core vector store for enterprise |

---

## 12. Related Topics — What to Study Next

- **Topic 350 — Streaming RAG Responses to React via SSE** — the frontend complement to this backend implementation
- **Topic 343 — RAG Architecture** — conceptual foundation for this implementation
- **Topic 365 — pgvector Deep Dive** — full pgvector HNSW configuration and tuning

---

*Part 21 · Implementing RAG with Spring Boot + pgvector or Pinecone · Full Stack Interview Guide · Hruday D · 2026*
