# Embeddings — How Text Becomes Vectors, Why Cosine Similarity
> Part 21 — Generative AI for Full Stack Engineers · RAG
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Embeddings convert meaning to geometry**: an embedding model transforms a sentence into a high-dimensional float array where semantically similar sentences produce vectors that point in similar directions — "dog" and "puppy" will be much closer in embedding space than "dog" and "invoice"
- **Why cosine similarity, not Euclidean distance**: we care about the angle between vectors (directional similarity = semantic similarity), not their length; short and long texts about the same topic have similar direction but very different magnitudes; cosine similarity normalises away length, making it the correct measure for semantic search
- **Embeddings are not interpretable**: you cannot read what each of the 1,536 dimensions "means" — these are distributed representations learned by the model, not human-readable features; what matters is the relative distance between points, not the individual values
- **Embedding model choice matters for retrieval quality**: OpenAI `text-embedding-3-small` is a strong baseline; domain-specific embeddings (trained on medical or legal text) outperform general-purpose embeddings on their specific domain; there is no universally best embedding model — test on your actual data
- **The consistency rule is absolute**: the embedding model used during document ingestion MUST be the same one used to embed queries at search time; different models produce incompatible vector spaces; mixing them produces random meaningless similarity scores
- **Embeddings are cheap to generate and expensive to redo**: generating embeddings for 1 million documents costs ~$0.02 (at current OpenAI pricing); re-embedding the entire corpus if you change models costs the same but requires re-ingesting everything — plan your embedding model choice carefully before large-scale ingestion

---

## 1. One-Line Definition
An embedding is a fixed-length dense vector of floating-point numbers that represents the semantic meaning of a piece of text, where texts with similar meaning produce geometrically close vectors in the N-dimensional embedding space.

---

## 2. The Intuition

```
WORD2VEC INTUITION (simplified):
  Words with similar contexts get similar vectors.
  "King" and "Queen" appear around similar words (royal, throne, crown).
  → Their vectors are close.
  
  Famous property: king - man + woman ≈ queen
  (vector arithmetic on meaning — semantics encoded as geometry)

SENTENCE EMBEDDINGS (modern):
  "The refund was processed in 3 days."
  "Money was returned within 3 business days."
  → Very similar vectors (same meaning, different words)
  
  "The refund was processed in 3 days."
  "The Eiffel Tower is in Paris."
  → Very different vectors (unrelated meaning)

WHY GEOMETRY?
  Similarity search is a geometry problem.
  Find the k points in high-dimensional space closest to the query point.
  This is what vector databases do efficiently.
```

---

## 3. What Happens Inside an Embedding Model

```
INPUT: "How do I get a refund?"

STEP 1: TOKENISE
  ["How", " do", " I", " get", " a", " ref", "und", "?"]
  (same BPE tokenization as the LLM)

STEP 2: TOKEN EMBEDDINGS
  Each token → initial low-level vector (vocabulary lookup table)

STEP 3: TRANSFORMER ENCODER
  Multi-head self-attention processes the token sequence.
  Each token's vector is updated based on all other tokens in context.
  "refund" in "How do I get a refund?" has a different vector than 
  "refund" in "The refund was declined" — context modifies meaning.

STEP 4: POOLING
  The per-token vectors are combined (typically mean pooling or CLS token)
  to produce a single vector for the whole sentence.

OUTPUT: [0.12, -0.34, 0.09, ..., 0.22]  → 1536 float32 values
        (1536 bytes × 4 = 6,144 bytes per embedding)
```

---

## 4. Why Cosine Similarity (Not Euclidean)

```
EXAMPLE:
  Two texts about refund policies:
  Short text: "Refunds available within 7 days."
  Long text: "Section 4.1: Refund Policy. Customers are eligible for 
              full refunds on all purchases made within a 7-day window 
              of the original transaction date..."
  
  Both texts: same semantic topic — refund policy.
  
  In embedding space:
  - Their vectors point in SIMILAR DIRECTIONS (same topic)
  - But their MAGNITUDES are different (long text has a larger vector 
    simply because there's more content to integrate)

EUCLIDEAN DISTANCE (L2):
  Distance = √(Σ(a_i - b_i)²)
  Sensitive to magnitude.
  The long text and short text would appear far apart even though 
  they mean the same thing — just because one is longer.
  ❌ Poor measure for semantic similarity.

COSINE SIMILARITY:
  similarity = (A · B) / (|A| × |B|)
  
  Divides by both magnitudes → only measures the ANGLE.
  Short "Refund 7 days" and long "4.1 Refund Policy 7-day window":
  → High cosine similarity (same angular direction = same meaning)
  ✅ Correct measure for semantic similarity.

─────────────────────────────────────────────────────────────────────────

L2 DISTANCE IS STILL USEFUL:
  When text lengths are similar (eg. all chunks are 500 tokens)
  AND you want to distinguish between closely similar vectors
  with more precision.
  
  pgvector supports both:
  <=>  cosine distance (default for RAG)
  <->  L2 distance (Euclidean)
  <#>  inner product
```

---

## 5. Embedding Models in Practice

```
MODEL                     DIMS    COST PER 1K TOKENS   NOTES
────────────────────────────────────────────────────────────────────────
text-embedding-3-small    1536    $0.00002              Best cost/performance
                                                         balance; use as default

text-embedding-3-large    3072    $0.00013              Higher accuracy for 
                                                         complex domains; use if 
                                                         3-small is insufficient

text-embedding-ada-002    1536    $0.0001               Previous generation; 
                                                         still widely used in 
                                                         existing systems

Sentence-BERT (SBERT)     768     Free (self-hosted)   Strong open-source;
                                                         use when no data leaves 
                                                         infrastructure

all-MiniLM-L6-v2         384     Free (self-hosted)   Smallest; fast inference;
                                                         good for low-resource 
                                                         self-hosted deployments

Jina Embeddings v3        1024    Competitive           Strong for code + 
                                                         multilingual tasks
```

---

## 6. The Pattern in Practice

### Wrong Way — Switching embedding models mid-project

```
❌ Scenario:
  Week 1: Ingest 500K documents with text-embedding-ada-002
  Week 6: Switch to text-embedding-3-small for cost savings
           and start embedding new documents
  
  Result: The vector space is now split.
  Old documents: ada-002 space
  New documents: 3-small space
  
  Query with 3-small: similar to 3-small documents → near
                      similar to ada-002 documents → random distances
  
  Retrieval quality collapses silently.
  This is one of the hardest bugs to diagnose in RAG systems.
```

```
✅ Model version in metadata + migration strategy:

  1. Store embedding_model in document metadata:
     {"source": "policy.pdf", "embedding_model": "text-embedding-ada-002"}
  
  2. If you need to switch models:
     - Create a new table / namespace for the new model
     - Re-embed ALL documents into the new table
     - Run both in parallel (old serving, new indexing)
     - Validate recall on test queries
     - Cut over atomically; decommission old table
  
  3. In Spring AI config: externalise the embedding model name
     spring.ai.openai.embedding.options.model = ${EMBEDDING_MODEL}
     So you can control it without code changes.
```

---

## 7. Embedding in Spring AI

```java
@Service  
public class EmbeddingService {

    private final EmbeddingModel embeddingModel;
    
    // Generate embedding for a query (at search time)
    public float[] embed(String text) {
        return embeddingModel.embed(text);
    }
    
    // Batch embed documents (at ingestion time)
    public List<float[]> batchEmbed(List<String> texts) {
        return embeddingModel.embed(texts);
    }
}

// Spring AI's VectorStore handles embed+store atomically:
// vectorStore.add(documents) → calls embeddingModel internally

// Cosine similarity query with threshold:
List<Document> results = vectorStore.similaritySearch(
    SearchRequest.query("refund policy")
        .withTopK(3)
        .withSimilarityThreshold(0.70)  // cosine similarity >= 0.70
);
```

---

## 8. Interview Questions & Model Answers

### Q1 — Core concept
**Interviewer:** "Why is cosine similarity the right metric for semantic search and not Euclidean distance?"

**Hruday:**
> "We care about semantic similarity, which is about directional alignment in the vector space — not magnitude. A short paragraph and a long document about the same topic will produce vectors pointing in similar directions but with very different magnitudes, because the longer text integrates more content. Euclidean distance would make them seem far apart even though they're semantically close. Cosine similarity computes the angle between vectors and normalises away magnitude — so two texts about the same topic are close regardless of their length. That's why it's the standard metric for semantic search and RAG retrieval."

---

## 9. Scale Evolution

**Small dataset (< 10K docs) →** Compute and store embeddings on insert; any embedding model works; verify consistency rule.

**Medium dataset →** Batch embed (cheaper per token); store embedding_model version in metadata; HNSW index for performance.

**Large scale →** Embedding pipeline as a separate async job (ingest → queue → embed worker → vector DB); model pinned by version in config management; migration plan documented before changing models.

---

## 10. Company Relevance

| Company | Embedding concern | Interview signal |
|---------|------------------|-----------------|
| Razorpay / PhonePe | Transaction description embeddings for fraud clustering; support query semantic search | Domain specificity of general embeddings for financial text; may need fine-tuned embeddings for best recall |
| Swiggy / Meesho | Product catalogue semantic search from natural language ("cheap north indian food near me") | Multilingual embeddings for Hindi/regional language product searches |
| Adobe / Microsoft | Long-document embeddings for legal/enterprise content; cross-modal (text + image) | text-embedding-3-large for complex document types; Azure AI content embedding service |
| SAP Labs | ERP concept embeddings — SAP-specific vocabulary (BAPI, ABAP, t-code) is not well-represented in general-purpose embeddings | Consider SAP-domain fine-tuned embeddings; or use large general models which have broader vocabulary coverage |

---

## 11. Related Topics — What to Study Next

- **Topic 344 — Vector Databases** — where embeddings are stored and searched
- **Topic 346 — Chunking Strategies** — chunking determines the input to the embedding model
- **Topic 343 — RAG Architecture** — embeddings are the core mechanism enabling retrieval in the RAG pipeline

---

*Part 21 · Embeddings — How Text Becomes Vectors, Why Cosine Similarity · Full Stack Interview Guide · Hruday D · 2026*
