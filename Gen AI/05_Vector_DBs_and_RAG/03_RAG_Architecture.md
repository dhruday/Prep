# 📘 RAG (Retrieval-Augmented Generation) - The Future of AI Applications


## 📑 Table of Contents

- [**Purpose (Why this exists):**](#purpose-why-this-exists)
- [**What it is:**](#what-it-is)
- [**How it works (Intuition):**](#how-it-works-intuition)
- [**How it works (Math – simplified):**](#how-it-works-math-simplified)
- [**Visual Explanation (described):**](#visual-explanation-described)
- [**Simple Example:**](#simple-example)

---

---

## **Purpose (Why this exists):**

### **The Hallucination Problem:**

```javascript
const llm_limitation = {
  scenario: {
    user_question: 'What is our company\'s return policy?',
    
    traditional_llm_answer: `
      "Your company's return policy allows returns within 30 days 
      with a receipt. Refunds are processed within 5-7 business days."
    `,
    
    problem: '🚨 THIS IS COMPLETELY MADE UP! (Hallucination)',
    
    why_hallucination: {
      training_data: 'Model trained on generic internet data',
      no_company_data: 'Never saw your specific policy',
      fills_gaps: 'LLM guesses plausible-sounding answer',
      
      danger: 'Confidently wrong! User believes it.'
    }
  },
  
  real_world_disasters: {
    legal: 'AI gives wrong legal advice → lawsuit',
    medical: 'AI suggests wrong treatment → harm',
    financial: 'AI provides incorrect account info → loss',
    customer_service: 'AI makes up policies → angry customers',
    
    core_issue: 'LLMs don\'t have access to YOUR data!'
  },
  
  attempted_solutions: {
    fine_tuning: {
      approach: 'Train model on company data',
      problems: [
        'Expensive ($1000s per training)',
        'Time-consuming (hours to days)',
        'Static (outdated when data changes)',
        'Still hallucinates',
        'Can\'t handle large knowledge bases'
      ]
    },
    
    prompt_stuffing: {
      approach: 'Put all data in prompt',
      problems: [
        'Token limits (max 128K, soon 1M)',
        'Expensive (pay per token)',
        'Slow (more tokens = slower)',
        'Information overload (LLM gets confused)'
      ]
    }
  }
};

const rag_solution = {
  breakthrough: 'Combine retrieval + generation',
  
  how_it_works: {
    step1: 'User asks question',
    step2: '🔍 Retrieve ONLY relevant documents from database',
    step3: '📝 Provide relevant docs as context to LLM',
    step4: '💬 LLM generates answer BASED ON provided context',
    
    result: 'Accurate, grounded, up-to-date answers!'
  },
  
  advantages: {
    accurate: '✅ Answers based on real data, not guesses',
    current: '✅ Update database anytime, no retraining',
    cost_effective: '✅ No expensive fine-tuning',
    fast: '✅ Only retrieve what\'s needed',
    transparent: '✅ Can cite sources',
    scalable: '✅ Handle unlimited knowledge',
    
    game_changer: 'This is how ChatGPT plugins, GitHub Copilot, and enterprise AI work!'
  },
  
  use_cases: {
    customer_support: 'Answer questions from documentation',
    legal: 'Analyze contracts and regulations',
    research: 'Synthesize academic papers',
    coding: 'Generate code from documentation',
    medical: 'Reference medical literature',
    
    anywhere: 'Any domain with specific knowledge!'
  }
};
```

---

## **What it is:**

### **RAG Architecture Explained:**

```javascript
const rag_architecture = {
  definition: 'Retrieval-Augmented Generation: Enhance LLM responses with retrieved context',
  
  components: {
    knowledge_base: {
      what: 'Your documents stored as vectors',
      examples: ['PDFs', 'Docs', 'Web pages', 'Databases', 'APIs'],
      stored_in: 'Vector database (ChromaDB, Pinecone, etc.)'
    },
    
    retriever: {
      what: 'Finds relevant documents',
      method: 'Semantic search (vector similarity)',
      output: 'Top-k most relevant documents'
    },
    
    augmentation: {
      what: 'Inject retrieved docs into prompt',
      format: 'Context: [docs]\n\nQuestion: [query]\n\nAnswer:',
      purpose: 'Ground LLM response in facts'
    },
    
    generator: {
      what: 'LLM that generates final answer',
      models: ['GPT-4', 'Claude', 'Llama', 'Mistral'],
      instruction: 'Answer ONLY using provided context'
    }
  },
  
  flow: {
    indexing: 'Documents → Chunks → Embeddings → Vector DB',
    querying: 'Question → Retrieve → Augment → Generate'
  }
};

const naive_vs_rag = {
  naive_llm: {
    input: 'User question',
    processing: 'LLM generates from training data',
    output: 'Answer (may hallucinate)',
    
    example: {
      question: 'What is our Q3 revenue?',
      answer: 'I don\'t have access to real-time data...',
      problem: 'Useless for specific information'
    }
  },
  
  rag_llm: {
    input: 'User question',
    processing: {
      step1: 'Retrieve: Search Q3 financial reports',
      step2: 'Augment: Add reports to prompt',
      step3: 'Generate: LLM answers from reports'
    },
    output: 'Accurate answer with citations',
    
    example: {
      question: 'What is our Q3 revenue?',
      retrieved: 'Q3 2023 Report: Revenue was $42.5M',
      answer: 'According to Q3 2023 report, revenue was $42.5M [Source: Q3_Report.pdf]',
      win: '✅ Accurate and cited!'
    }
  }
};
```

### **RAG Pipeline Stages:**

```javascript
const rag_pipeline = {
  stage1_indexing: {
    name: 'Offline: Build knowledge base',
    
    steps: {
      step1: {
        name: 'Document loading',
        input: 'Raw documents (PDF, HTML, etc.)',
        loaders: ['PyPDFLoader', 'WebBaseLoader', 'APILoader'],
        output: 'Document objects'
      },
      
      step2: {
        name: 'Text splitting',
        why: 'Documents too large for embeddings',
        method: 'Split into chunks (500-1000 tokens)',
        strategies: ['Fixed size', 'Semantic', 'Recursive'],
        output: 'Chunks with metadata'
      },
      
      step3: {
        name: 'Embedding',
        input: 'Text chunks',
        model: 'Embedding model (OpenAI, SBERT, etc.)',
        output: 'Vectors (384-1536 dimensions)'
      },
      
      step4: {
        name: 'Storage',
        input: 'Vectors + metadata',
        database: 'Vector DB (ChromaDB, Pinecone, etc.)',
        output: 'Searchable knowledge base'
      }
    },
    
    frequency: 'Run once, then update as documents change'
  },
  
  stage2_querying: {
    name: 'Online: Answer user questions',
    
    steps: {
      step1: {
        name: 'Query understanding',
        input: 'User question',
        optional: 'Query expansion, rewriting',
        output: 'Optimized query'
      },
      
      step2: {
        name: 'Retrieval',
        input: 'Query',
        process: 'Embed query → Search vector DB',
        output: 'Top-k relevant chunks (k=3-10)'
      },
      
      step3: {
        name: 'Reranking (optional)',
        why: 'Improve relevance',
        method: 'Cross-encoder model',
        output: 'Better sorted results'
      },
      
      step4: {
        name: 'Context creation',
        input: 'Retrieved chunks',
        process: 'Format into prompt template',
        output: 'Augmented prompt'
      },
      
      step5: {
        name: 'Generation',
        input: 'Augmented prompt',
        model: 'LLM (GPT-4, Claude, etc.)',
        instruction: 'Answer using ONLY provided context',
        output: 'Final answer + citations'
      }
    },
    
    latency: '1-3 seconds total'
  }
};
```

---

## **How it works (Intuition):**

### **RAG as a Research Assistant:**

```javascript
const research_assistant_analogy = {
  traditional_llm: {
    scenario: 'Ask professor a question',
    process: 'Professor answers from memory',
    limitation: 'Memory is incomplete/outdated',
    
    example: {
      question: 'What did the CEO say in last week\'s meeting?',
      answer: 'I don\'t recall...',
      problem: 'Professor wasn\'t there!'
    }
  },
  
  rag_system: {
    scenario: 'Ask research assistant',
    process: {
      step1: '📚 Assistant searches library for relevant documents',
      step2: '📖 Reads meeting notes, transcripts',
      step3: '✍️ Summarizes findings',
      step4: '🗣️ Presents answer with citations'
    },
    
    example: {
      question: 'What did the CEO say in last week\'s meeting?',
      retrieved: ['Meeting_transcript.pdf', 'CEO_notes.docx'],
      answer: 'The CEO announced Q3 targets: 20% growth [Source: Meeting_transcript.pdf, page 3]',
      win: '✅ Accurate and traceable!'
    }
  },
  
  key_insight: 'RAG = Give LLM ability to "look things up" before answering'
};

const rag_intuition = {
  mental_model: {
    llm_alone: 'Smart person with general knowledge',
    rag: 'Smart person WITH access to specialized library',
    
    analogy: {
      doctor_without_books: 'Relies on medical school memory',
      doctor_with_references: 'Looks up latest treatments, drug interactions',
      
      which_is_better: 'Obviously the one with references!'
    }
  },
  
  why_it_works: {
    llm_strengths: [
      'Language understanding',
      'Reasoning',
      'Synthesis',
      'Clear communication'
    ],
    
    retrieval_strengths: [
      'Perfect recall',
      'Up-to-date information',
      'Specific facts',
      'Large knowledge bases'
    ],
    
    together: 'Best of both worlds!'
  }
};
```

### **Chunking Intuition:**

```javascript
const chunking_explained = {
  why_chunk: {
    problem: {
      full_document: '100-page PDF (100,000 tokens)',
      embedding_limit: 'Models handle ~512 tokens',
      solution: 'Split into chunks'
    },
    
    benefits: [
      'Each chunk focused on one topic',
      'Retrieve only what\'s relevant',
      'Better matching',
      'Manageable context size'
    ]
  },
  
  strategies: {
    fixed_size: {
      method: 'Every N tokens (e.g., 500)',
      pros: 'Simple, consistent',
      cons: 'May split mid-sentence/mid-paragraph',
      
      analogy: 'Cutting paper with ruler (ignores content)'
    },
    
    semantic: {
      method: 'Split by meaning (paragraphs, sections)',
      pros: 'Preserves context',
      cons: 'Variable sizes',
      
      analogy: 'Cutting paper at natural breaks'
    },
    
    recursive: {
      method: 'Try multiple split characters (\\n\\n, \\n, .)',
      pros: 'Balance size and meaning',
      cons: 'More complex',
      
      analogy: 'Smart cutting with fallback rules'
    }
  },
  
  visualization: `
    Original Document (too large):
    ┌─────────────────────────────────┐
    │ Introduction                    │
    │ ....                           │
    │ Chapter 1                       │
    │ ....                           │
    │ Chapter 2                       │
    │ ....                           │
    └─────────────────────────────────┘
    
    After Chunking (right-sized):
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Intro    │ │ Chapter1 │ │ Chapter2 │
    │ (500tok) │ │ (500tok) │ │ (500tok) │
    └──────────┘ └──────────┘ └──────────┘
    
    Each chunk:
    - Embeds well
    - Focused topic
    - Retrievable
  `
};
```

---

## **How it works (Math – simplified):**

### **RAG Mathematical Framework:**

```python
# RAG Pipeline Mathematics

import numpy as np
from typing import List, Tuple

# ============================================
# 1. Embedding
# ============================================

def embed(text: str, model) -> np.ndarray:
    """
    Convert text to vector
    
    f: Text → ℝ^d
    
    text ∈ Text space
    embedding ∈ ℝ^d where d = 384, 768, 1536, etc.
    
    Example:
      "machine learning" → [0.23, -0.15, ..., 0.67]
    """
    return model.encode(text)


# ============================================
# 2. Similarity Calculation
# ============================================

def similarity(query_vec: np.ndarray, doc_vec: np.ndarray) -> float:
    """
    Cosine similarity (most common)
    
    sim(q, d) = (q · d) / (||q|| × ||d||)
    
    Where:
      q · d = Σ q_i × d_i  (dot product)
      ||q|| = √(Σ q_i²)   (magnitude)
    
    Range: [-1, 1]
      1 = identical
      0 = orthogonal (unrelated)
     -1 = opposite
    """
    dot_product = np.dot(query_vec, doc_vec)
    norm_q = np.linalg.norm(query_vec)
    norm_d = np.linalg.norm(doc_vec)
    
    return dot_product / (norm_q * norm_d)


# ============================================
# 3. Retrieval (Top-K)
# ============================================

def retrieve(query: str, documents: List[str], k: int = 3) -> List[Tuple[str, float]]:
    """
    Find k most similar documents
    
    Given:
      - Query q
      - Document set D = {d1, d2, ..., dn}
    
    Find:
      top_k = argmax_{d ∈ D} sim(q, d)
    
    Returns:
      [(doc1, score1), (doc2, score2), ..., (dock, scorek)]
    """
    query_vec = embed(query)
    
    scores = []
    for doc in documents:
        doc_vec = embed(doc)
        score = similarity(query_vec, doc_vec)
        scores.append((doc, score))
    
    # Sort by score descending
    scores.sort(key=lambda x: x[1], reverse=True)
    
    return scores[:k]


# ============================================
# 4. Context Window
# ============================================

def create_context(retrieved_docs: List[str], max_tokens: int = 2000) -> str:
    """
    Combine retrieved docs into context
    
    Constraint:
      len(context) + len(question) + len(answer) ≤ model_max_tokens
    
    Typical allocation:
      - Context: 2000-4000 tokens
      - Question: 50-100 tokens
      - Answer: 500-1000 tokens
      - Buffer: 500 tokens
      Total: ~4000 tokens (well within GPT-3.5's 4K limit)
    """
    context = "\n\n".join(retrieved_docs)
    
    # Truncate if too long
    # (In practice, use tokenizer to count tokens)
    if len(context) > max_tokens * 4:  # Rough: 1 token ≈ 4 chars
        context = context[:max_tokens * 4]
    
    return context


# ============================================
# 5. Prompt Engineering
# ============================================

def create_prompt(context: str, question: str) -> str:
    """
    Augmented prompt template
    
    Structure:
      [System instruction]
      [Context]
      [Question]
      [Output format instruction]
    """
    prompt = f"""You are a helpful assistant. Answer the question based ONLY on the provided context.

Context:
{context}

Question: {question}

Instructions:
- Answer using ONLY the information in the context
- If the answer is not in the context, say "I don't have enough information"
- Cite sources when possible

Answer:"""
    
    return prompt


# ============================================
# 6. Complete RAG Pipeline
# ============================================

def rag(question: str, documents: List[str], llm, k: int = 3) -> str:
    """
    Complete RAG pipeline
    
    Pipeline:
      question → retrieve → augment → generate → answer
    
    Mathematically:
      1. q_vec = embed(question)
      2. D_relevant = retrieve(q_vec, D, k)
      3. context = concat(D_relevant)
      4. prompt = template(context, question)
      5. answer = LLM(prompt)
    """
    # Step 1: Retrieve
    retrieved = retrieve(question, documents, k=k)
    retrieved_docs = [doc for doc, score in retrieved]
    
    # Step 2: Create context
    context = create_context(retrieved_docs)
    
    # Step 3: Create prompt
    prompt = create_prompt(context, question)
    
    # Step 4: Generate
    answer = llm.generate(prompt)
    
    return answer


# ============================================
# 7. Evaluation Metrics
# ============================================

class RAGMetrics:
    """
    Measuring RAG performance
    """
    
    @staticmethod
    def retrieval_metrics(retrieved: List[str], relevant: List[str]) -> dict:
        """
        Retrieval quality
        
        Precision = |retrieved ∩ relevant| / |retrieved|
          How many retrieved docs are relevant?
        
        Recall = |retrieved ∩ relevant| / |relevant|
          How many relevant docs were retrieved?
        
        F1 = 2 × (Precision × Recall) / (Precision + Recall)
          Harmonic mean
        """
        retrieved_set = set(retrieved)
        relevant_set = set(relevant)
        
        intersection = retrieved_set & relevant_set
        
        precision = len(intersection) / len(retrieved_set) if retrieved_set else 0
        recall = len(intersection) / len(relevant_set) if relevant_set else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        return {
            'precision': precision,
            'recall': recall,
            'f1': f1
        }
    
    @staticmethod
    def generation_metrics(answer: str, reference: str) -> dict:
        """
        Generation quality
        
        Common metrics:
        - BLEU: Precision of n-grams
        - ROUGE: Recall of n-grams
        - BERTScore: Semantic similarity
        """
        # Placeholder (use actual libraries in practice)
        return {
            'bleu': 0.75,
            'rouge-l': 0.82,
            'bertscore': 0.88
        }


# ============================================
# 8. Advanced: Reranking
# ============================================

def rerank(query: str, candidates: List[str], reranker) -> List[str]:
    """
    Rerank candidates using cross-encoder
    
    Initial retrieval: Fast but approximate (bi-encoder)
      embed(query) vs embed(doc)
      Separate embeddings
    
    Reranking: Slow but accurate (cross-encoder)
      score(query, doc) together
      Joint encoding
    
    Strategy:
      1. Retrieve 100 candidates (fast)
      2. Rerank top 100 (slow but manageable)
      3. Return top 10 (best quality)
    """
    scores = []
    for doc in candidates:
        # Cross-encoder scores query-doc pair
        score = reranker.predict([(query, doc)])[0]
        scores.append((doc, score))
    
    scores.sort(key=lambda x: x[1], reverse=True)
    return [doc for doc, _ in scores]
```

---

## **Visual Explanation (described):**

### **RAG Architecture Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│                       RAG SYSTEM                            │
└─────────────────────────────────────────────────────────────┘

INDEXING PHASE (Offline):
┌──────────────┐
│  Documents   │
│ • PDF        │
│ • Web        │
│ • DB         │
└──────┬───────┘
       ↓
┌──────────────┐
│ Text Split   │  Split into chunks (500-1000 tokens)
│ Chunker      │
└──────┬───────┘
       ↓
┌──────────────┐
│  Embedding   │  text → [0.2, -0.5, ..., 0.8]
│   Model      │
└──────┬───────┘
       ↓
┌──────────────┐
│  Vector DB   │  Store vectors + metadata
│  (ChromaDB)  │
└──────────────┘

QUERYING PHASE (Online):
┌──────────────┐
│User Question │  "What is the return policy?"
└──────┬───────┘
       ↓
┌──────────────┐
│   Embed      │  question → [0.3, -0.2, ..., 0.7]
│   Query      │
└──────┬───────┘
       ↓
┌──────────────┐
│  Retrieve    │  Search vector DB
│  Top-K Docs  │  Find 3-5 most similar chunks
└──────┬───────┘
       ↓
┌─────────────────────────────────┐
│     Context Creation            │
│                                 │
│ Context: [Doc1] [Doc2] [Doc3]   │
│ Question: What is return policy?│
│ Answer:                         │
└────────────┬────────────────────┘
             ↓
┌──────────────┐
│     LLM      │  GPT-4, Claude, etc.
│  Generator   │  Generate answer from context
└──────┬───────┘
       ↓
┌──────────────┐
│Final Answer  │  "According to our policy,
│+ Citations   │  returns are accepted within
└──────────────┘  30 days [Source: Policy.pdf]"
```

### **RAG vs Fine-Tuning:**

```
FINE-TUNING:
┌────────────┐      ┌──────────────┐      ┌────────────┐
│ Pre-trained│  +   │ Your Data    │  →   │ Fine-tuned │
│    Model   │      │ (static)     │      │   Model    │
└────────────┘      └──────────────┘      └────────────┘
                                                 ↓
                                          ┌─────────────┐
                                          │  Generate   │
                                          │   Answer    │
                                          └─────────────┘

Pros: Fast inference
Cons: Expensive, static, still hallucinates, limited capacity

---

RAG:
┌────────────┐      ┌──────────────┐
│ Pre-trained│      │   Vector DB  │
│    Model   │      │  (dynamic)   │
│  (frozen)  │      │  • Add docs  │
└─────┬──────┘      │  • Update    │
      │             │  • Delete    │
      │             └──────┬───────┘
      │                    │
      │   ┌────────────────┘
      ↓   ↓
┌──────────────┐      ┌─────────────┐
│ Retrieve +   │  →   │  Generate   │
│   Augment    │      │   Answer    │
└──────────────┘      └─────────────┘

Pros: Dynamic, cheap, accurate, scalable, transparent
Cons: Slightly slower (retrieval latency)

Winner: RAG for most use cases!
```

---

## **Simple Example:**

### **JavaScript Conceptual Implementation:**

```javascript
// RAG System Concept

class SimpleRAG {
  constructor() {
    this.documents = [];
    this.embeddings = [];
  }
  
  // Index documents
  async index(documents) {
    console.log(`📚 Indexing ${documents.length} documents...`);
    
    for (const doc of documents) {
      // Split into chunks
      const chunks = this.chunk(doc, 500);
      
      for (const chunk of chunks) {
        // Embed chunk
        const embedding = await this.embed(chunk);
        
        this.documents.push(chunk);
        this.embeddings.push(embedding);
      }
    }
    
    console.log(`✅ Indexed ${this.documents.length} chunks`);
  }
  
  // Chunk document
  chunk(text, size) {
    // Simplified: split by sentences
    const sentences = text.split('. ');
    const chunks = [];
    let current = '';
    
    for (const sentence of sentences) {
      if ((current + sentence).length > size) {
        if (current) chunks.push(current);
        current = sentence;
      } else {
        current += (current ? '. ' : '') + sentence;
      }
    }
    
    if (current) chunks.push(current);
    return chunks;
  }
  
  // Mock embedding
  async embed(text) {
    // In reality: call OpenAI/Cohere API
    const vector = [];
    for (let i = 0; i < 384; i++) {
      const hash = (text.charCodeAt(i % text.length) * (i + 1)) % 100;
      vector.push(hash / 100);
    }
    return vector;
  }
  
  // Retrieve similar documents
  async retrieve(query, k = 3) {
    const queryEmbedding = await this.embed(query);
    
    const scores = this.documents.map((doc, i) => ({
      document: doc,
      score: this.cosineSimilarity(queryEmbedding, this.embeddings[i])
    }));
    
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, k);
  }
  
  cosineSimilarity(vecA, vecB) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] ** 2;
      normB += vecB[i] ** 2;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  // RAG: Retrieve + Generate
  async ask(question) {
    console.log(`\n❓ Question: ${question}`);
    
    // Step 1: Retrieve
    const retrieved = await this.retrieve(question, 3);
    console.log(`\n🔍 Retrieved ${retrieved.length} relevant chunks`);
    
    // Step 2: Create context
    const context = retrieved
      .map((r, i) => `[${i + 1}] ${r.document}`)
      .join('\n\n');
    
    // Step 3: Create prompt
    const prompt = `Answer the question based on the context below.

Context:
${context}

Question: ${question}

Answer:`;
    
    // Step 4: Generate (mock)
    console.log('\n💭 Generating answer...');
    const answer = await this.generate(prompt);
    
    return {
      answer,
      sources: retrieved.map(r => r.document.substring(0, 100) + '...')
    };
  }
  
  // Mock LLM generation
  async generate(prompt) {
    // In reality: call OpenAI API
    return "Based on the provided context, here's the answer... [Mock response]";
  }
}

// Usage
const rag = new SimpleRAG();

// Index knowledge base
await rag.index([
  `Our return policy allows returns within 30 days of purchase. 
   Items must be unused and in original packaging. 
   Refunds are processed within 5-7 business days.`,
  
  `Shipping is free for orders over $50. 
   Standard shipping takes 3-5 business days. 
   Express shipping is available for $15.`,
  
  `We accept Visa, Mastercard, American Express, and PayPal. 
   All payments are processed securely through Stripe.`
]);

// Ask questions
const result = await rag.ask('What is your return policy?');
console.log(`\n✅ Answer: ${result.answer}`);
console.log(`\n📚 Sources:`);
result.sources.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
```

### **Python Production Implementation:**

```python
# ============================================
# Complete RAG System
# ============================================

import chromadb
from openai import OpenAI
from typing import List, Dict
import os

class ProductionRAG:
    """
    Production-ready RAG system
    """
    
    def __init__(
        self,
        collection_name="rag_knowledge",
        chunk_size=1000,
        chunk_overlap=200
    ):
        # Vector database
        self.client = chromadb.PersistentClient(path="./rag_db")
        self.collection = self.client.get_or_create_collection(collection_name)
        
        # LLM
        self.llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Config
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def index_documents(self, documents: List[str], metadatas: List[Dict] = None):
        """
        Index documents into vector database
        """
        all_chunks = []
        all_metadatas = []
        all_ids = []
        
        for idx, doc in enumerate(documents):
            # Split into chunks
            chunks = self._chunk_text(doc)
            
            for chunk_idx, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                
                # Metadata
                meta = metadatas[idx] if metadatas else {}
                meta.update({
                    'doc_index': idx,
                    'chunk_index': chunk_idx,
                    'chunk_count': len(chunks)
                })
                all_metadatas.append(meta)
                
                # ID
                all_ids.append(f"doc{idx}_chunk{chunk_idx}")
        
        # Add to database
        self.collection.add(
            documents=all_chunks,
            metadatas=all_metadatas,
            ids=all_ids
        )
        
        print(f"✅ Indexed {len(documents)} documents ({len(all_chunks)} chunks)")
    
    def _chunk_text(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks
        """
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), self.chunk_size - self.chunk_overlap):
            chunk = ' '.join(words[i:i + self.chunk_size])
            if chunk:
                chunks.append(chunk)
        
        return chunks
    
    def retrieve(
        self,
        query: str,
        n_results: int = 3,
        filters: Dict = None
    ) -> List[Dict]:
        """
        Retrieve relevant documents
        """
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where=filters
        )
        
        retrieved = []
        for doc, meta, dist in zip(
            results['documents'][0],
            results['metadatas'][0],
            results['distances'][0]
        ):
            retrieved.append({
                'document': doc,
                'metadata': meta,
                'distance': dist,
                'relevance': 1 - dist  # Convert distance to relevance
            })
        
        return retrieved
    
    def ask(
        self,
        question: str,
        n_context: int = 3,
        filters: Dict = None
    ) -> Dict:
        """
        RAG: Retrieve + Generate answer
        """
        # Step 1: Retrieve
        retrieved = self.retrieve(question, n_results=n_context, filters=filters)
        
        if not retrieved:
            return {
                'answer': "I don't have enough information to answer that question.",
                'sources': [],
                'confidence': 0.0
            }
        
        # Step 2: Create context
        context = self._format_context(retrieved)
        
        # Step 3: Create prompt
        prompt = self._create_prompt(context, question)
        
        # Step 4: Generate
        response = self.llm.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant. Answer questions based ONLY on the provided context."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1  # Lower = more factual
        )
        
        answer = response.choices[0].message.content
        
        return {
            'answer': answer,
            'sources': retrieved,
            'confidence': self._calculate_confidence(retrieved)
        }
    
    def _format_context(self, retrieved: List[Dict]) -> str:
        """Format retrieved documents into context"""
        context_parts = []
        
        for i, item in enumerate(retrieved):
            source_info = f"Source {i+1}"
            if 'source' in item['metadata']:
                source_info += f" ({item['metadata']['source']})"
            
            context_parts.append(f"{source_info}:\n{item['document']}")
        
        return "\n\n".join(context_parts)
    
    def _create_prompt(self, context: str, question: str) -> str:
        """Create augmented prompt"""
        return f"""Answer the question based on the context below. If you cannot answer the question based on the context, say "I don't have enough information."

Context:
{context}

Question: {question}

Instructions:
- Use ONLY information from the context
- Cite sources (e.g., "According to Source 1...")
- Be concise and accurate

Answer:"""
    
    def _calculate_confidence(self, retrieved: List[Dict]) -> float:
        """Calculate confidence based on relevance scores"""
        if not retrieved:
            return 0.0
        
        avg_relevance = sum(r['relevance'] for r in retrieved) / len(retrieved)
        return round(avg_relevance, 2)


# ============================================
# Example Usage
# ============================================

# Initialize
rag = ProductionRAG()

# Index knowledge base
documents = [
    """Return Policy:
    All items can be returned within 30 days of purchase for a full refund.
    Items must be in original condition with tags attached.
    Refunds are processed within 5-7 business days to the original payment method.
    Sale items are final sale and cannot be returned.
    """,
    
    """Shipping Information:
    Standard shipping is FREE on orders over $50 and takes 3-5 business days.
    Express shipping costs $15 and takes 1-2 business days.
    International shipping is available and costs vary by location.
    All orders are shipped from our warehouse in California.
    """,
    
    """Payment Methods:
    We accept Visa, Mastercard, American Express, Discover, and PayPal.
    All transactions are encrypted and processed securely through Stripe.
    We do not store your credit card information.
    Buy now, pay later options are available through Klarna.
    """
]

metadatas = [
    {'source': 'return_policy.pdf', 'category': 'policy'},
    {'source': 'shipping_info.pdf', 'category': 'shipping'},
    {'source': 'payment_faq.pdf', 'category': 'payment'}
]

rag.index_documents(documents, metadatas)

# Ask questions
questions = [
    "What is your return policy?",
    "How much does shipping cost?",
    "What payment methods do you accept?",
    "Can I return sale items?"
]

for question in questions:
    print("\n" + "="*60)
    print(f"Q: {question}")
    
    result = rag.ask(question)
    
    print(f"\nA: {result['answer']}")
    print(f"\nConfidence: {result['confidence']*100:.0f}%")
    print(f"\nSources:")
    for source in result['sources']:
        print(f"  - {source['metadata'].get('source', 'Unknown')} "
              f"(relevance: {source['relevance']*100:.0f}%)")


# ============================================
# Advanced: Document Loading
# ============================================

from langchain.document_loaders import (
    PyPDFLoader,
    TextLoader,
    WebBaseLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter

class AdvancedRAG(ProductionRAG):
    """
    RAG with advanced document loading
    """
    
    def load_pdf(self, pdf_path: str):
        """Load and index PDF"""
        loader = PyPDFLoader(pdf_path)
        pages = loader.load()
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap
        )
        
        chunks = splitter.split_documents(pages)
        
        documents = [chunk.page_content for chunk in chunks]
        metadatas = [{
            'source': pdf_path,
            'page': chunk.metadata.get('page', 0)
        } for chunk in chunks]
        
        self.index_documents(documents, metadatas)
    
    def load_website(self, url: str):
        """Load and index website"""
        loader = WebBaseLoader(url)
        data = loader.load()
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap
        )
        
        chunks = splitter.split_documents(data)
        
        documents = [chunk.page_content for chunk in chunks]
        metadatas = [{
            'source': url,
            'type': 'web'
        } for chunk in chunks]
        
        self.index_documents(documents, metadatas)


# ============================================
# Advanced: Conversational RAG
# ============================================

class ConversationalRAG(ProductionRAG):
    """
    RAG with conversation history
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.conversation_history = []
    
    def chat(self, message: str) -> str:
        """
        Chat with history
        """
        # Rewrite question with history context
        contextualized_question = self._rewrite_question(message)
        
        # RAG
        result = self.ask(contextualized_question)
        
        # Update history
        self.conversation_history.append({
            'user': message,
            'assistant': result['answer']
        })
        
        return result['answer']
    
    def _rewrite_question(self, question: str) -> str:
        """
        Rewrite question with conversation context
        """
        if not self.conversation_history:
            return question
        
        # Use LLM to rewrite question
        history_text = "\n".join([
            f"User: {turn['user']}\nAssistant: {turn['assistant']}"
            for turn in self.conversation_history[-3:]  # Last 3 turns
        ])
        
        prompt = f"""Given the conversation history, rewrite the user's follow-up question to be standalone.

Conversation history:
{history_text}

Follow-up question: {question}

Standalone question:"""
        
        response = self.llm.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        
        return response.choices[0].message.content
```

---

*(Continuing in next message due to length...)*