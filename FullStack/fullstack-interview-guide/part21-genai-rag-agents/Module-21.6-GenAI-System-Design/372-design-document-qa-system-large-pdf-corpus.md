# Design a Document Q&A System Over a Large PDF Corpus
> Part 21 — Generative AI for Full Stack Engineers · GenAI System Design
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The challenge of large PDF corpus**: a single PDF can be 500 pages; a corpus can be 10,000 PDFs; you cannot fit all of this in a context window; RAG solves this by retrieving only the relevant 3-5 chunks for each query
- **Hierarchical chunking is the right strategy for PDFs**: parent chunk (full page or section, ~2000 tokens) for LLM context quality; child chunk (paragraph, ~200 tokens) for precise retrieval; small child chunks retrieve precisely, then replace with parent chunk in the LLM prompt for full context
- **Metadata is essential for filtering and citation**: every chunk stores document title, page number, section heading, document date, document type (policy/manual/report); citations back to the source page are non-negotiable for enterprise Q&A — users must be able to verify answers
- **Multi-modal PDFs (charts, tables, images)**: pdfplumber or Apache PDFBox for text extraction; for charts/images that carry critical info, use GPT-4o's vision API to generate text descriptions during ingestion — stored as separate chunks with `type=image_description`
- **Access control at the chunk level**: not all users should see all documents; store `allowed_roles` or `owner_dept` as metadata on each chunk; filter vector search by user's role (`metadata['dept'] == user.dept`) — never retrieve restricted chunks for unauthorised users
- **Answer with citations**: the LLM response format should include `[Source: Document Name, Page 42]` inline; front-end renders these as clickable links to the PDF at the specific page; builds user trust in AI answers

---

## 1. System Overview

**Use case**: Enterprise Q&A over internal policy documents, legal contracts, research papers, compliance manuals.

**Functional requirements:**
- Upload PDFs and make them queryable within minutes
- Answer questions with page-level citations
- Support access control (user sees only authorised docs)
- Multi-turn conversation within a document session

---

## 2. Architecture

```
INGESTION PIPELINE (offline, on upload or scheduled)

PDF Upload
  → Async upload handler (returns jobId immediately)
  → Kafka: "doc-ingestion-jobs"
  → Consumer:
       1. Extract text: pdfplumber / Apache PDFBox
       2. Extract images: convert to text via GPT-4o vision
       3. Parse sections: heading hierarchy, page breaks
       4. Hierarchical chunking:
            Parent: full section (~2000 tokens)
            Child:  each paragraph (~200 tokens)
            Relation: child.parent_id = parent.id
       5. Embed children only (text-embedding-3-small)
       6. Store parent + children in pgvector
            Metadata: {doc_id, title, page, section, chunk_type, allowed_roles}
       7. Update ingestion_jobs table: status=COMPLETE
  → Webhook / polling: notify frontend when queryable

QUERY PATH (online)

User question (with session_id, user_role)
  → Embed question
  → Filter by user_role (security: metadata filter)
  → Vector search: top-10 child chunks (HNSW)
  → Expand to parent chunks (fetch full section for LLM context)
  → Rerank top-5 parents by relevance
  → LLM prompt with context + citation instruction
  → Stream response with [Source: Title, Page N] citations
  → SSE to React frontend
```

---

## 3. Hierarchical Chunking Implementation

```java
@Service
public class PdfChunkingService {

    public List<DocumentChunk> chunkDocument(String docId, String extractedText, 
                                              String docTitle, Map<String, Object> docMeta) {
        List<DocumentChunk> chunks = new ArrayList<>();
        List<Section> sections = sectionParser.parse(extractedText);
        
        for (Section section : sections) {
            // Parent chunk: full section (for LLM context quality)
            String parentId = UUID.randomUUID().toString();
            chunks.add(new DocumentChunk(
                parentId, 
                null,               // No parent (this IS the parent)
                section.text(),
                ChunkType.PARENT,
                buildMetadata(docId, docTitle, section.pageNumber(), 
                             section.heading(), docMeta)
            ));
            
            // Child chunks: each paragraph (for precise retrieval)
            List<String> paragraphs = paragraphSplitter.split(section.text(), 200, 20);
            paragraphs.forEach(para -> chunks.add(new DocumentChunk(
                UUID.randomUUID().toString(),
                parentId,           // Link to parent for expansion
                para,
                ChunkType.CHILD,
                buildMetadata(docId, docTitle, section.pageNumber(), 
                             section.heading(), docMeta)
            )));
        }
        
        return chunks;
    }
    
    // Only CHILD chunks get embedded (they're what we retrieve)
    // PARENT chunks are fetched by ID after retrieval
}
```

---

## 4. Query with Parent Expansion + Access Control

```java
@Service
public class DocumentQaService {

    private final VectorStore vectorStore;
    private final DocumentChunkRepository chunkRepo;
    private final ChatClient chatClient;
    
    public Flux<String> answer(String query, String userId, String userRole, List<Message> history) {
        // Step 1: Retrieve child chunks (filtered by user role for access control)
        List<Document> childChunks = vectorStore.similaritySearch(
            SearchRequest.query(query)
                .withTopK(10)
                .withSimilarityThreshold(0.55)
                .withFilterExpression(
                    "metadata['chunk_type'] == 'CHILD' AND " +
                    "metadata['allowed_roles'] contains '" + userRole + "'"
                )
        );
        
        if (childChunks.isEmpty()) {
            return Flux.just("I couldn't find relevant information for your question in the available documents.");
        }
        
        // Step 2: Expand to parent chunks for full-section context
        List<String> parentIds = childChunks.stream()
            .map(d -> (String) d.getMetadata().get("parent_id"))
            .distinct().limit(5).toList();
        
        List<DocumentChunk> parents = chunkRepo.findAllById(parentIds);
        
        // Step 3: Build context with citations
        String context = parents.stream()
            .map(p -> """
                [Source: %s, Page %d, Section: %s]
                %s
                """.formatted(
                    p.getMetadata().get("title"),
                    p.getMetadata().get("page"),
                    p.getMetadata().get("section"),
                    p.content()
                ))
            .collect(Collectors.joining("\n\n---\n\n"));
        
        // Step 4: Stream response with citation instruction
        return chatClient.prompt()
            .system("""
                You are a document Q&A assistant.
                Answer ONLY from the provided context.
                Include citations like [Source: Document Name, Page N] for every claim.
                If the context does not answer the question, say so explicitly.
                """)
            .messages(history)
            .user("""
                Context:
                %s
                
                Question: %s
                """.formatted(context, query))
            .stream()
            .content();
    }
}
```

---

## 5. Citation Rendering in React

```typescript
// Parse [Source: Title, Page N] markers and render as clickable links
function CitedResponse({ text, onCitationClick }: Props) {
  const parts = text.split(/(\[Source:[^\]]+\])/);
  
  return (
    <div className="response">
      {parts.map((part, i) => {
        const match = part.match(/\[Source: (.+), Page (\d+)\]/);
        if (match) {
          const [, title, page] = match;
          return (
            <button key={i} className="citation"
              onClick={() => onCitationClick(title, parseInt(page))}>
              {part}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
// onCitationClick → open PDF viewer at specific page
```

---

## 6. Wrong Way vs Right Way

```java
// ❌ No access control on vector search
// A junior employee can query chunks from executive compensation documents
List<Document> results = vectorStore.similaritySearch(
    SearchRequest.query(query).withTopK(5)
    // No role filter → all documents accessible to all users
);
```

```java
// ✅ Role-based filtering on every vector search
List<Document> results = vectorStore.similaritySearch(
    SearchRequest.query(query)
        .withTopK(10)
        .withFilterExpression("metadata['allowed_roles'] contains '" + userRole + "'")
        // Enforced at the vector DB level — unauthorised chunks never returned
);
```

---

## 7. Scale Evolution

**Prototype →** Synchronous PDF upload + chunking; pgvector; basic flat chunking; no access control.

**Production →** Kafka async ingestion; hierarchical chunking; role-based metadata filter; citation-formatted response; parent expansion; 100K documents.

**High scale →** Separate ingestion service (scaled independently); pgvector partitioned by `doc_type`; full-text search on titles alongside vector search (hybrid); scheduled re-embedding when embedding model updates; 1M+ documents with multi-region query.

---

## 8. Company Relevance

| Company | Document Q&A context | Interview signal |
|---------|--------------------|-----------------|
| Razorpay / PhonePe | RBI compliance documents, API documentation, merchant agreements | Access control critical; citations for legal accuracy |
| Swiggy / Meesho | Operational manuals, vendor agreements, HR policies | Scale: large document count; async ingestion pipeline |
| Adobe / Microsoft | Legal contracts, research papers, product documentation corpora | Multi-modal (charts in PDFs) via vision API; parent expansion for long-form docs |
| SAP Labs | SAP Notes, implementation guides, ABAP technical docs | Hierarchical chunking for technical manuals; section metadata for filtering |

---

## 9. Interview Questions & Model Answers

### Q1 — How do you handle a Q&A system over thousands of PDFs?
**Hruday:**
> "The key insight is hierarchical chunking: I split each PDF into parent chunks (full sections, ~2000 tokens) and child chunks (paragraphs, ~200 tokens). Only the children get embedded — they're small enough for precise retrieval. When a query comes in, I retrieve the top 10 child chunks, then expand each to its parent chunk in the database — getting the full surrounding context for the LLM while keeping retrieval precision high. Metadata is attached to every chunk: document title, page number, section heading, and allowed roles for access control. The role filter runs inside the vector search filter expression, so unauthorised chunks are never retrieved — not filtered after the fact. Every answer includes [Source: Document Name, Page N] citations because enterprise users need to verify AI answers, and the React frontend renders these as clickable links to the PDF at that exact page. Ingestion runs asynchronously via Kafka so large PDFs don't block the upload response."

---

*Part 21 · Design a Document Q&A System Over Large PDF Corpus · Full Stack Interview Guide · Hruday D · 2026*
