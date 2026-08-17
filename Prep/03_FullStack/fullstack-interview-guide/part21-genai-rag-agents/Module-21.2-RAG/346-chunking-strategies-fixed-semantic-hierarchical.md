# Chunking Strategies — Fixed, Semantic, Hierarchical
> Part 21 — Generative AI for Full Stack Engineers · RAG
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Chunking is the single highest-impact decision in RAG quality**: bad chunking means the retrieved chunks are incomplete or incoherent; the LLM generates wrong or partial answers regardless of model quality; fixing chunking is almost always more impactful than switching to a better LLM
- **Fixed chunking (500 tokens, 50-token overlap)**: cut after every N tokens; overlap prevents losing context at boundaries; simple, works well as a baseline; fails when chunks break mid-sentence, mid-procedure, or mid-table
- **Semantic chunking**: split at natural language boundaries — paragraph breaks, section headings, double newlines; each chunk is self-contained and coherent; better for structured documents (policy docs, manuals, product specs); requires a parser that understands document structure
- **Hierarchical (parent-child) chunking**: store large parent chunks (context) and small child chunks (precision); at retrieval time, retrieve by small child vectors (precise match), then expand to return the parent chunk text to the LLM (context); best of both: precision in retrieval, context in generation
- **Overlap prevents boundary losses**: without overlap, a fixed chunk that ends mid-sentence loses the continuation; 50-100 token overlap means the boundary content appears in both the ending chunk and the starting chunk — ensures no information is lost at splits
- **The test for a good chunk**: read a chunk in isolation — does it make sense without the surrounding document? If yes, it's well-chunked. If it starts mid-sentence or references context from the previous page, it will produce incomplete LLM answers when retrieved alone

---

## 1. One-Line Definition
Chunking is the process of splitting source documents into segments small enough for the LLM context window but large enough to be semantically coherent and complete, so each chunk can stand alone as an answer to a retrieval query.

---

## 2. Why Bad Chunking Breaks RAG

```
SOURCE DOCUMENT (Procedure):
  "Step 1: Navigate to Settings > Security.
   Step 2: Click 'Enable Two-Factor Authentication'.
   Step 3: Scan the QR code with your authenticator app.
   Step 4: Enter the 6-digit code from your app to confirm.
   Step 5: Click Save. 2FA is now active on your account."

FIXED CHUNKING (200 characters, no thought for boundaries):

  Chunk A: "Step 1: Navigate to Settings > Security. Step 2: 
            Click 'Enable Two-Factor Authentication'. Step 3: 
            Scan the QR code with"
  
  Chunk B: "your authenticator app. Step 4: Enter the 6-digit 
            code from your app to confirm. Step 5: Click Save. 
            2FA is now active"

USER QUERY: "How do I enable 2FA?"

RETRIEVED: Chunk A (highest similarity to "enable 2FA")

LLM ANSWER: "Navigate to Settings > Security, click Enable 
             Two-Factor Authentication, then scan the QR code with..."
             
PROBLEM: Answer stops at "scan the QR code with" — the procedure 
is incomplete. User is confused. Steps 4-5 are missing.

The retrieved chunk was incomplete because the boundary was wrong.
```

---

## 3. Strategy Comparison

### Strategy 1 — Fixed-Size Chunking

```
ALGORITHM:
  1. Count tokens
  2. Every N tokens → new chunk
  3. Keep overlap of O tokens between consecutive chunks

PARAMETERS:
  Chunk size: typically 256-1000 tokens
  Overlap: typically 10-20% of chunk size
  Common default: 500 tokens, 50-overlap

PROS:
  - Simple to implement
  - No dependency on document structure
  - Works for uniform-format documents (database records, logs)
  - Good baseline for prototypes

CONS:
  - Breaks at arbitrary token counts regardless of meaning
  - Splits mid-sentence, mid-list, mid-code-block
  - Overlap helps but doesn't fully compensate for broken boundaries

BEST FOR:
  - Homogeneous text without sections (email bodies, chat messages)
  - Prototypes where speed to implementation matters
  - Documents where no better structure parser is available

SPRING AI IMPLEMENTATION:
  TokenTextSplitter.builder()
      .withChunkSize(500)
      .withMinChunkSizeChars(200)
      .withKeepSeparator(true)
      .build();
```

### Strategy 2 — Semantic / Structure-Based Chunking

```
ALGORITHM:
  1. Parse document structure (heading, paragraph, bullet list, table)
  2. Split at semantic boundaries, NOT at token counts
  3. Merge small adjacent sections if under min size
  4. Split large sections if over max size

BOUNDARY SIGNALS:
  - Markdown: ## headings, --- separators, blank lines
  - PDF: detected paragraph breaks, column boundaries
  - HTML: <h2>, <h3>, <p>, <article> tags
  - Plain text: double newlines, indent changes

PROS:
  - Each chunk is self-contained (starts/ends at a meaningful boundary)
  - Cross-references within a section stay together
  - Much higher retrieval precision for structured documents

CONS:
  - Requires document structure awareness
  - More complex to implement (especially for PDFs — formatting is messy)
  - Irregular chunk sizes need size normalisation

BEST FOR:
  - Policy documents, manuals, legal text
  - Product documentation (Markdown / HTML)
  - Any document with clear section structure

SPRING AI: use RecursiveCharacterTextSplitter with natural separators:
  new RecursiveCharacterTextSplitter(
      List.of("\n\n", "\n", ".", " "),  // try these separators in order
      1000, 100                          // max chars, overlap chars
  );
```

### Strategy 3 — Hierarchical (Parent-Child) Chunking

```
INSIGHT:
  For retrieval: small precise chunks → high similarity to specific queries
  For generation: large context chunks → LLM needs surrounding context
  
  These are competing goals with a single chunk size.
  Hierarchical chunking solves this by storing both.

STRUCTURE:
  Parent chunk: 2,000 tokens — full section or subsection
  Child chunks: 100-200 tokens each — sentences or short paragraphs
  
  Each child has a reference to its parent ID.
  
  Ingestion:
  - Embed and store BOTH parent and child chunks
  - Child chunks have a parent_id foreign key

  Retrieval:
  - Embed query → vector search against CHILD chunks (precise match)
  - For each retrieved child, fetch the PARENT chunk by parent_id
  - Pass PARENT content to the LLM (full context)
  
RESULT:
  Vector search has high precision (small child chunks match queries closely)
  LLM answer has full context (large parent chunks include surrounding content)

PROS:
  - Best retrieval precision AND best answer context
  - Reduces lost-in-the-middle problem (answer is in parent context)
  
CONS:
  - More complex to implement and maintain
  - Stores more data (parent + child chunks for same content)
  - Parent fetch adds a second DB lookup per retrieved chunk

BEST FOR:
  - Large complex documents (technical manuals, legal contracts)
  - When simple chunking consistently misses relevant context
  - High-quality production RAG systems
```

---

## 4. The Pattern in Practice

### Wrong Way — No overlap in fixed chunking

```
❌ Chunks with zero overlap:

  Chunk N:   "... The user must confirm their email address."
  Chunk N+1: "Once confirmed, the account is activated immediately."

  A query about "account activation after email confirmation" retrieves 
  Chunk N+1. But it starts with "Once confirmed" — confirmed what? 
  The user must piece together a dangling sentence.
  
  The LLM will generate an answer that assumes context the chunk doesn't have.
```

```
✅ 50-token overlap:

  Chunk N:   "... The user must confirm their email address."
  Chunk N+1: "[...must confirm their email address.] Once confirmed, 
              the account is activated immediately."

  Chunk N+1 now contains the bridge sentence.
  Either chunk retrieved in isolation gives enough context for the LLM.
  The overlap tokens appear in both chunks — redundancy for completeness.
```

---

## 5. Metadata: The Hidden Multiplier

```
Every chunk should carry metadata — minimum:
  {
    "source": "onboarding-guide-v4.pdf",
    "section": "4.2 Account Activation",
    "chunk_index": 7,
    "chunk_total": 12,
    "page": 22,
    "last_updated": "2025-01-10"
  }

Why metadata matters:
  1. Metadata filters reduce search space: 
     search only within the "returns policy" section if the 
     user's question has been classified as returns-related
  
  2. Citations: show users WHERE the answer came from —
     "Source: onboarding-guide-v4.pdf, Section 4.2"
  
  3. Staleness: "last_updated" lets you flag old content before 
     the LLM presents it as current fact
  
  4. Debug: when the answer is wrong, chunk_index + source tells 
     you exactly which chunk was retrieved and why
```

---

## 6. Choosing a Strategy

```
DECISION TREE:

Does your document have clear structure (sections, headings)?
  YES → Use semantic chunking (split at structural boundaries)
  NO  → Use fixed-size chunking with overlap as baseline

Are retrieval answers consistently missing context?
  YES → Consider hierarchical (parent-child) chunking
  NO  → Current strategy is likely fine

Is your document database large (> 100K chunks)?
  YES → Invest in careful chunking quality; bad chunking at scale 
        is very expensive to fix (re-embed everything)
  NO  → Fix as you learn; re-embedding is cheap at small scale
```

---

## 7. Interview Questions & Model Answers

### Q1 — Trade-offs
**Interviewer:** "What chunk size would you use for a RAG system over a 200-page legal contract?"

**Hruday:**
> "I wouldn't use fixed chunking for a legal document at all. Legal text has semantically critical boundaries — a condition in clause 4.2 may modify the meaning of clause 3.1, and splitting mid-clause destroys the legal meaning. I'd use semantic chunking: split at clause and sub-clause boundaries, keep each clause as a chunk. For long clauses, I'd use hierarchical chunking — small child chunks per sentence for precise retrieval, return the full clause (parent) to the LLM. I'd also store clause number and section in metadata for citations, so the user can refer to the original document."

---

## 8. Scale Evolution

**Prototype →** Fixed-size chunking; 500 tokens; 50-token overlap; test on 20-30 real queries.

**Production →** Evaluate semantic chunking for structured documents; metadata on every chunk; measure retrieval recall before deploying.

**High-scale →** Hierarchical chunking for complex documents; automated chunk quality evaluation (does each chunk make sense in isolation?); separate ingestion pipeline per document type.

---

## 9. Company Relevance

| Company | Document type | Chunking approach |
|---------|--------------|------------------|
| Razorpay / PhonePe | API reference docs, compliance policies | Semantic chunking at section level; clause boundaries for compliance docs; parent-child for long API references |
| Swiggy / Meesho | Product catalogues, restaurant menus, order FAQs | Fixed-size chunks work for short catalogue descriptions; menu item = natural chunk boundary |
| Adobe / Microsoft | Help documentation, release notes, legal terms | Semantic chunking on Markdown headings; hierarchical for long feature docs |
| SAP Labs | SAP Help documentation, ABAP function reference, customer configuration guides | Semantic chunking critical for SAP's structured documentation; parent-child for long ABAP function reference pages |

---

## 10. Related Topics — What to Study Next

- **Topic 343 — RAG Architecture** — chunking sits in the ingestion phase of the end-to-end pipeline
- **Topic 345 — Embeddings** — chunk content is what gets embedded; chunk quality determines embedding quality
- **Topic 347 — Reranking** — when chunking still produces some irrelevant results, reranking filters them before LLM generation

---

*Part 21 · Chunking Strategies — Fixed, Semantic, Hierarchical · Full Stack Interview Guide · Hruday D · 2026*
