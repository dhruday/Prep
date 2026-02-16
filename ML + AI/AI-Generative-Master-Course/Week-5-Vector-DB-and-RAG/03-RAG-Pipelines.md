# 🔗 RAG Pipelines: Complete Guide

## 📚 Table of Contents
1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [RAG Architecture](#-rag-architecture)
3. [Document Processing](#-document-processing)
4. [Retrieval Strategies](#-retrieval-strategies)
5. [Generation & Prompting](#-generation--prompting)
6. [Advanced RAG Patterns](#-advanced-rag-patterns)
7. [Evaluation](#-evaluation)
8. [Production RAG](#-production-rag)
9. [Complete Implementation](#-complete-implementation)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🔰 Beginner Friendly Explanation

### What is RAG?

```
RAG = Retrieval-Augmented Generation

WITHOUT RAG (Pure LLM):
┌──────────────────────────────────────────────────────┐
│ User: "What's our refund policy?"                    │
│                                                       │
│ LLM: "I don't have information about your company's │
│       refund policy. Generally, refund policies..."  │
│                                                       │
│ Problem: LLM doesn't know YOUR specific data!        │
└──────────────────────────────────────────────────────┘

WITH RAG:
┌──────────────────────────────────────────────────────┐
│ User: "What's our refund policy?"                    │
│           │                                          │
│           ▼                                          │
│ RETRIEVE: Search company docs for "refund policy"   │
│           │                                          │
│           ▼                                          │
│ CONTEXT:  "Policy doc: Refunds within 30 days,      │
│            original packaging required..."           │
│           │                                          │
│           ▼                                          │
│ GENERATE: LLM uses context to answer                │
│           │                                          │
│           ▼                                          │
│ Answer:   "Our refund policy allows returns within  │
│            30 days with original packaging."         │
└──────────────────────────────────────────────────────┘
```

### Real-World Analogy

```
RAG is like an OPEN-BOOK EXAM:

CLOSED BOOK (Pure LLM):
├── Student only uses memory
├── Limited to what they studied
├── Can't answer about new topics
└── Might make up answers (hallucinate)

OPEN BOOK (RAG):
├── Student can look up answers in books
├── Finds relevant pages first
├── Then formulates accurate answer
└── Citations prove correctness
```

### Why RAG Instead of Fine-Tuning?

```
┌────────────────────────────────────────────────────────────┐
│              RAG vs FINE-TUNING                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  FINE-TUNING:                                              │
│  ├── Bakes knowledge INTO the model                        │
│  ├── Expensive (GPU, data, time)                           │
│  ├── Hard to update                                        │
│  ├── Good for: Style, format, domain expertise            │
│  └── Example: Make model write like a lawyer               │
│                                                             │
│  RAG:                                                       │
│  ├── Gives knowledge AT query time                         │
│  ├── Cheap (just add documents)                            │
│  ├── Easy to update (add/remove docs)                      │
│  ├── Good for: Facts, documents, real-time data           │
│  └── Example: Answer questions about company docs          │
│                                                             │
│  BEST: Combine both!                                        │
│  Fine-tune for style + RAG for facts                       │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 🏗️ RAG Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       RAG SYSTEM ARCHITECTURE                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ═══════════════════ INDEXING PIPELINE ═══════════════════       │
│  (Offline - Run once per document)                               │
│                                                                   │
│  ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐              │
│  │ Load   │ → │ Chunk  │ → │ Embed  │ → │ Store  │              │
│  │ Docs   │   │ Text   │   │ Chunks │   │ Vectors│              │
│  └────────┘   └────────┘   └────────┘   └────────┘              │
│      ↓            ↓            ↓            ↓                    │
│  PDF, TXT,   Split into   Convert to   Save to                  │
│  Web, DB     passages     vectors      ChromaDB                  │
│                                                                   │
│  ═══════════════════ QUERY PIPELINE ═══════════════════          │
│  (Online - Every user query)                                     │
│                                                                   │
│  ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐              │
│  │ Query  │ → │ Embed  │ → │Retrieve│ → │ Rank   │              │
│  │        │   │ Query  │   │ Docs   │   │ Results│              │
│  └────────┘   └────────┘   └────────┘   └────────┘              │
│      │                                       │                    │
│      │            ┌────────────────┐        │                    │
│      └───────────→│ Build Prompt   │←───────┘                    │
│                   │ Query + Context│                              │
│                   └───────┬────────┘                              │
│                           │                                       │
│                   ┌───────▼────────┐                              │
│                   │   Generate     │                              │
│                   │   Answer (LLM) │                              │
│                   └───────┬────────┘                              │
│                           │                                       │
│                   ┌───────▼────────┐                              │
│                   │  Return Answer │                              │
│                   │  + Sources     │                              │
│                   └────────────────┘                              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Purpose | Tools |
|-----------|---------|-------|
| **Document Loaders** | Read various file formats | LangChain loaders, Unstructured |
| **Text Splitters** | Chunk documents | RecursiveCharacterTextSplitter |
| **Embedding Models** | Convert text to vectors | OpenAI, HuggingFace |
| **Vector Stores** | Store and search vectors | ChromaDB, Pinecone |
| **Retrievers** | Fetch relevant documents | Vector search, BM25 |
| **Re-rankers** | Improve retrieval quality | Cohere, Cross-encoders |
| **LLMs** | Generate answers | GPT-4, Claude, Llama |
| **Prompt Templates** | Structure LLM input | LangChain prompts |

---

## 📄 Document Processing

### Loading Documents

```python
"""
Document Loading for RAG
"""

from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    DirectoryLoader,
    WebBaseLoader,
    CSVLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredMarkdownLoader
)

# ============================================
# LOAD SINGLE FILES
# ============================================

# PDF
pdf_loader = PyPDFLoader("document.pdf")
pdf_docs = pdf_loader.load()

# Text
text_loader = TextLoader("document.txt")
text_docs = text_loader.load()

# Word
word_loader = UnstructuredWordDocumentLoader("document.docx")
word_docs = word_loader.load()

# Markdown
md_loader = UnstructuredMarkdownLoader("document.md")
md_docs = md_loader.load()

# CSV
csv_loader = CSVLoader("data.csv")
csv_docs = csv_loader.load()

# Web page
web_loader = WebBaseLoader("https://example.com/article")
web_docs = web_loader.load()

# ============================================
# LOAD DIRECTORIES
# ============================================

# All PDFs in directory
dir_loader = DirectoryLoader(
    "./documents/",
    glob="**/*.pdf",
    loader_cls=PyPDFLoader
)
all_docs = dir_loader.load()

print(f"Loaded {len(all_docs)} documents")
```

### Chunking Strategies

```python
"""
Text Chunking Strategies
"""

from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter,
    TokenTextSplitter,
    MarkdownHeaderTextSplitter,
    SentenceTransformersTokenTextSplitter
)

# ============================================
# RECURSIVE CHARACTER SPLITTER (RECOMMENDED)
# ============================================

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,      # Max characters per chunk
    chunk_overlap=200,    # Overlap between chunks
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""]
)

chunks = splitter.split_documents(documents)

# ============================================
# UNDERSTANDING SEPARATORS
# ============================================

"""
Separators are tried in order:
1. "\n\n" - Paragraph breaks (best semantic breaks)
2. "\n"   - Line breaks
3. ". "   - Sentences
4. " "    - Words
5. ""     - Characters (last resort)

The splitter tries to keep chunks under chunk_size
while using the best semantic separator.
"""

# ============================================
# TOKEN-BASED SPLITTING
# ============================================

# For models with token limits
token_splitter = TokenTextSplitter(
    chunk_size=500,       # 500 tokens
    chunk_overlap=50      # 50 token overlap
)

# ============================================
# MARKDOWN-AWARE SPLITTING
# ============================================

headers_to_split_on = [
    ("#", "Header 1"),
    ("##", "Header 2"),
    ("###", "Header 3"),
]

md_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=headers_to_split_on
)

md_chunks = md_splitter.split_text(markdown_text)

# ============================================
# SEMANTIC CHUNKING
# ============================================

from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

semantic_splitter = SemanticChunker(
    embeddings=OpenAIEmbeddings(),
    breakpoint_threshold_type="percentile"
)

semantic_chunks = semantic_splitter.split_text(text)
```

### Chunk Size Guidelines

```
CHUNK SIZE SELECTION:

┌─────────────────────────────────────────────────────────────┐
│                  CHUNK SIZE TRADE-OFFS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SMALLER CHUNKS (200-500 chars):                            │
│  ├── ✅ More precise retrieval                              │
│  ├── ✅ Better for specific questions                       │
│  ├── ❌ May lose context                                    │
│  └── ❌ More chunks to search                               │
│                                                              │
│  LARGER CHUNKS (1000-2000 chars):                           │
│  ├── ✅ More context per chunk                              │
│  ├── ✅ Fewer chunks to manage                              │
│  ├── ❌ Less precise retrieval                              │
│  └── ❌ May include irrelevant text                         │
│                                                              │
│  RECOMMENDED BY USE CASE:                                    │
│  ├── FAQ/Short answers: 200-500 chars                       │
│  ├── General articles: 500-1000 chars                       │
│  ├── Technical docs: 1000-1500 chars                        │
│  ├── Legal/contracts: 1500-2000 chars                       │
│  └── Code: 500-1000 chars                                   │
│                                                              │
│  OVERLAP:                                                    │
│  └── Usually 10-20% of chunk size                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Metadata Enrichment

```python
"""
Adding Metadata to Chunks
"""

import hashlib
from datetime import datetime

def enrich_chunks(chunks, source_file: str):
    """Add useful metadata to chunks"""
    
    enriched = []
    
    for i, chunk in enumerate(chunks):
        # Add metadata
        chunk.metadata.update({
            # Source tracking
            "source": source_file,
            "chunk_index": i,
            "total_chunks": len(chunks),
            
            # Content info
            "word_count": len(chunk.page_content.split()),
            "char_count": len(chunk.page_content),
            
            # Unique ID
            "chunk_id": hashlib.md5(
                chunk.page_content.encode()
            ).hexdigest()[:12],
            
            # Timestamp
            "indexed_at": datetime.now().isoformat(),
            
            # Preview
            "preview": chunk.page_content[:100] + "..."
        })
        
        enriched.append(chunk)
    
    return enriched
```

---

## 🔍 Retrieval Strategies

### Basic Retrieval

```python
"""
Basic Vector Retrieval
"""

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

# ============================================
# CREATE VECTOR STORE
# ============================================

embeddings = OpenAIEmbeddings()

vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)

# ============================================
# BASIC RETRIEVER
# ============================================

retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 4}  # Return top 4
)

# Retrieve
docs = retriever.invoke("What is machine learning?")

# ============================================
# SIMILARITY SEARCH WITH SCORES
# ============================================

docs_with_scores = vectorstore.similarity_search_with_relevance_scores(
    query="What is machine learning?",
    k=4
)

for doc, score in docs_with_scores:
    print(f"Score: {score:.3f} | {doc.page_content[:50]}...")
```

### Advanced Retrieval

```python
"""
Advanced Retrieval Strategies
"""

# ============================================
# 1. MMR (Maximum Marginal Relevance)
# ============================================
# Balances relevance and diversity

retriever_mmr = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 4,
        "fetch_k": 20,    # Fetch 20, then pick 4 diverse
        "lambda_mult": 0.5  # 0=diversity, 1=relevance
    }
)

# ============================================
# 2. SIMILARITY THRESHOLD
# ============================================
# Only return results above threshold

retriever_threshold = vectorstore.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={
        "score_threshold": 0.7,  # Minimum similarity
        "k": 10
    }
)

# ============================================
# 3. HYBRID SEARCH (BM25 + Vector)
# ============================================

from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever

# BM25 (keyword) retriever
bm25_retriever = BM25Retriever.from_documents(chunks)
bm25_retriever.k = 4

# Vector retriever
vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

# Ensemble (hybrid)
hybrid_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.3, 0.7]  # 30% keyword, 70% semantic
)

# ============================================
# 4. MULTI-QUERY RETRIEVAL
# ============================================

from langchain.retrievers.multi_query import MultiQueryRetriever
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4", temperature=0)

multi_query_retriever = MultiQueryRetriever.from_llm(
    retriever=vector_retriever,
    llm=llm
)

# Generates multiple query variations, retrieves for each

# ============================================
# 5. CONTEXTUAL COMPRESSION
# ============================================

from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor

compressor = LLMChainExtractor.from_llm(llm)

compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=vector_retriever
)

# Returns only relevant parts of retrieved documents
```

### Re-Ranking

```python
"""
Re-Ranking Retrieved Documents
"""

# ============================================
# COHERE RERANK
# ============================================

from langchain.retrievers import ContextualCompressionRetriever
from langchain_cohere import CohereRerank

cohere_reranker = CohereRerank(
    model="rerank-english-v3.0",
    top_n=3
)

rerank_retriever = ContextualCompressionRetriever(
    base_compressor=cohere_reranker,
    base_retriever=vectorstore.as_retriever(search_kwargs={"k": 10})
)

# Retrieves 10, reranks to top 3

# ============================================
# CROSS-ENCODER RERANK
# ============================================

from sentence_transformers import CrossEncoder

class CrossEncoderReranker:
    def __init__(self, model_name="cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model = CrossEncoder(model_name)
    
    def rerank(self, query: str, documents: list, top_k: int = 3):
        # Create pairs
        pairs = [[query, doc.page_content] for doc in documents]
        
        # Score
        scores = self.model.predict(pairs)
        
        # Sort by score
        scored_docs = list(zip(documents, scores))
        scored_docs.sort(key=lambda x: x[1], reverse=True)
        
        return [doc for doc, score in scored_docs[:top_k]]
```

---

## 💬 Generation & Prompting

### RAG Prompt Templates

```python
"""
Effective RAG Prompts
"""

from langchain_core.prompts import ChatPromptTemplate

# ============================================
# BASIC RAG PROMPT
# ============================================

basic_prompt = ChatPromptTemplate.from_template("""
Answer the question based only on the following context:

Context:
{context}

Question: {question}

Answer:
""")

# ============================================
# STRUCTURED RAG PROMPT
# ============================================

structured_prompt = ChatPromptTemplate.from_template("""
You are a helpful assistant answering questions based on provided documents.

CONTEXT:
{context}

RULES:
1. Only use information from the context above
2. If the answer is not in the context, say "I don't have enough information"
3. Be concise but complete
4. Cite sources when possible using [Source: filename]

QUESTION: {question}

ANSWER:
""")

# ============================================
# CONVERSATIONAL RAG PROMPT
# ============================================

conversational_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful assistant with access to a knowledge base.
    
Rules:
- Answer based on the provided context
- Reference previous conversation when relevant
- If unsure, say so
- Be conversational but accurate"""),
    
    ("human", """Context:
{context}

Conversation History:
{chat_history}

Question: {question}""")
])

# ============================================
# CITATION-AWARE PROMPT
# ============================================

citation_prompt = ChatPromptTemplate.from_template("""
Answer the question using the numbered sources below.
Include citation numbers [1], [2], etc. in your answer.

SOURCES:
{numbered_sources}

QUESTION: {question}

INSTRUCTIONS:
- Use information from sources only
- Cite sources using [1], [2], etc.
- List cited sources at the end

ANSWER:
""")

def format_sources(docs):
    """Format documents with numbers for citations"""
    numbered = []
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", "Unknown")
        numbered.append(f"[{i}] ({source})\n{doc.page_content}")
    return "\n\n".join(numbered)
```

### Building the RAG Chain

```python
"""
Complete RAG Chain with LangChain
"""

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableParallel

# ============================================
# SIMPLE RAG CHAIN
# ============================================

llm = ChatOpenAI(model="gpt-4", temperature=0)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {
        "context": retriever | format_docs,
        "question": RunnablePassthrough()
    }
    | structured_prompt
    | llm
    | StrOutputParser()
)

# Use it
answer = rag_chain.invoke("What is machine learning?")

# ============================================
# RAG CHAIN WITH SOURCES
# ============================================

def create_rag_chain_with_sources(retriever, llm):
    """RAG chain that returns answer + sources"""
    
    def retrieve_and_format(question):
        docs = retriever.invoke(question)
        return {
            "context": format_docs(docs),
            "sources": docs
        }
    
    def generate_with_sources(inputs):
        # Generate answer
        answer = (
            structured_prompt
            | llm
            | StrOutputParser()
        ).invoke({
            "context": inputs["retrieval"]["context"],
            "question": inputs["question"]
        })
        
        return {
            "answer": answer,
            "sources": [
                {
                    "content": doc.page_content[:200],
                    "metadata": doc.metadata
                }
                for doc in inputs["retrieval"]["sources"]
            ]
        }
    
    chain = (
        RunnableParallel(
            retrieval=RunnablePassthrough() | retrieve_and_format,
            question=RunnablePassthrough()
        )
        | generate_with_sources
    )
    
    return chain
```

---

## 🚀 Advanced RAG Patterns

### Self-Query Retrieval

```python
"""
Self-Query: LLM generates structured queries
"""

from langchain.retrievers.self_query.base import SelfQueryRetriever
from langchain.chains.query_constructor.schema import AttributeInfo

# Define metadata schema
metadata_field_info = [
    AttributeInfo(
        name="category",
        description="The category of the document",
        type="string"
    ),
    AttributeInfo(
        name="year",
        description="The year the document was created",
        type="integer"
    ),
    AttributeInfo(
        name="author",
        description="The author of the document",
        type="string"
    ),
]

# Create self-query retriever
self_query_retriever = SelfQueryRetriever.from_llm(
    llm=llm,
    vectorstore=vectorstore,
    document_contents="Technical documentation",
    metadata_field_info=metadata_field_info
)

# Natural language query with automatic filtering
docs = self_query_retriever.invoke(
    "Show me documents about machine learning from 2023"
)
# Automatically filters: year=2023, query="machine learning"
```

### Parent-Document Retrieval

```python
"""
Parent Document: Retrieve small, return large
"""

from langchain.retrievers import ParentDocumentRetriever
from langchain.storage import InMemoryStore

# Small chunks for retrieval
child_splitter = RecursiveCharacterTextSplitter(chunk_size=200)

# Large chunks for context
parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000)

# Document store for parents
docstore = InMemoryStore()

parent_retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=docstore,
    child_splitter=child_splitter,
    parent_splitter=parent_splitter
)

# Add documents
parent_retriever.add_documents(documents)

# Retrieves using small chunks, returns large parent chunks
docs = parent_retriever.invoke("specific query")
```

### Query Transformation

```python
"""
Query Transformation Techniques
"""

# ============================================
# 1. QUERY DECOMPOSITION
# ============================================

decomposition_prompt = ChatPromptTemplate.from_template("""
Break down this complex question into simpler sub-questions:

Question: {question}

Return as numbered list:
""")

def decompose_query(question: str) -> list[str]:
    response = (decomposition_prompt | llm | StrOutputParser()).invoke(
        {"question": question}
    )
    # Parse numbered list
    return [line.split(". ", 1)[1] for line in response.strip().split("\n") if ". " in line]

# ============================================
# 2. HYPOTHETICAL DOCUMENT EMBEDDING (HyDE)
# ============================================

hyde_prompt = ChatPromptTemplate.from_template("""
Write a detailed passage that would answer this question:

Question: {question}

Passage:
""")

def hyde_retrieval(question: str, retriever):
    # Generate hypothetical answer
    hypothetical = (hyde_prompt | llm | StrOutputParser()).invoke(
        {"question": question}
    )
    
    # Search using hypothetical answer
    return retriever.invoke(hypothetical)

# ============================================
# 3. STEP-BACK PROMPTING
# ============================================

stepback_prompt = ChatPromptTemplate.from_template("""
Given this specific question, what is a more general question that 
would help answer it?

Specific: {question}

General question:
""")

def stepback_retrieval(question: str, retriever):
    # Generate broader question
    general = (stepback_prompt | llm | StrOutputParser()).invoke(
        {"question": question}
    )
    
    # Retrieve for both
    specific_docs = retriever.invoke(question)
    general_docs = retriever.invoke(general)
    
    return specific_docs + general_docs
```

### Corrective RAG (CRAG)

```python
"""
Corrective RAG: Verify and correct retrieval
"""

from langchain_core.prompts import ChatPromptTemplate

# ============================================
# RELEVANCE CHECKER
# ============================================

relevance_prompt = ChatPromptTemplate.from_template("""
Evaluate if this document is relevant to answer the question.

Document: {document}

Question: {question}

Answer with ONLY 'relevant' or 'not relevant':
""")

def check_relevance(doc, question):
    result = (relevance_prompt | llm | StrOutputParser()).invoke({
        "document": doc.page_content,
        "question": question
    })
    return "relevant" in result.lower()

# ============================================
# CRAG PIPELINE
# ============================================

def corrective_rag(question: str, retriever, fallback_search=None):
    # Step 1: Retrieve
    docs = retriever.invoke(question)
    
    # Step 2: Grade relevance
    relevant_docs = [doc for doc in docs if check_relevance(doc, question)]
    
    # Step 3: Decide action
    if len(relevant_docs) >= 2:
        # Enough relevant docs - proceed
        return relevant_docs
    elif len(relevant_docs) == 1:
        # Supplement with more search
        more_docs = retriever.invoke(question, k=10)
        relevant_docs.extend([
            doc for doc in more_docs 
            if check_relevance(doc, question) and doc not in relevant_docs
        ][:2])
        return relevant_docs
    else:
        # No relevant docs - fallback
        if fallback_search:
            return fallback_search(question)
        return []
```

---

## 📊 Evaluation

### Evaluation Metrics

```python
"""
RAG Evaluation Metrics
"""

# ============================================
# RETRIEVAL METRICS
# ============================================

def precision_at_k(retrieved: list, relevant: set, k: int) -> float:
    """Precision@K: What fraction of retrieved are relevant?"""
    retrieved_k = retrieved[:k]
    relevant_retrieved = sum(1 for doc in retrieved_k if doc in relevant)
    return relevant_retrieved / k

def recall_at_k(retrieved: list, relevant: set, k: int) -> float:
    """Recall@K: What fraction of relevant are retrieved?"""
    retrieved_k = set(retrieved[:k])
    relevant_retrieved = len(retrieved_k.intersection(relevant))
    return relevant_retrieved / len(relevant) if relevant else 0

def mrr(retrieved: list, relevant: set) -> float:
    """Mean Reciprocal Rank: Position of first relevant result"""
    for i, doc in enumerate(retrieved, 1):
        if doc in relevant:
            return 1 / i
    return 0

# ============================================
# GENERATION METRICS
# ============================================

def evaluate_answer(question, answer, context, ground_truth, llm):
    """Evaluate answer quality with LLM"""
    
    eval_prompt = ChatPromptTemplate.from_template("""
Evaluate this answer on a scale of 0-1 for each criterion:

Question: {question}
Context Used: {context}
Generated Answer: {answer}
Ground Truth: {ground_truth}

Evaluate:
1. Faithfulness (0-1): Is the answer grounded in the context?
2. Relevance (0-1): Does the answer address the question?
3. Correctness (0-1): Is the answer factually correct vs ground truth?

Return as JSON: {{"faithfulness": X, "relevance": X, "correctness": X}}
""")
    
    result = (eval_prompt | llm | StrOutputParser()).invoke({
        "question": question,
        "context": context,
        "answer": answer,
        "ground_truth": ground_truth
    })
    
    import json
    return json.loads(result)
```

### RAGAS Evaluation

```python
"""
RAGAS: RAG Assessment Framework
pip install ragas
"""

from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
    answer_correctness
)
from datasets import Dataset

# Prepare evaluation data
eval_data = {
    "question": ["What is ML?", "How do transformers work?"],
    "answer": ["ML is...", "Transformers use..."],
    "contexts": [["Context for Q1"], ["Context for Q2"]],
    "ground_truth": ["ML definition...", "Transformer explanation..."]
}

dataset = Dataset.from_dict(eval_data)

# Evaluate
results = evaluate(
    dataset,
    metrics=[
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall
    ]
)

print(results)
# {'faithfulness': 0.85, 'answer_relevancy': 0.92, ...}
```

---

## 🏭 Production RAG

### Complete Production RAG System

```python
"""
Production-Ready RAG System
"""

import os
from typing import Optional, List, Dict
from dataclasses import dataclass
import logging

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.text_splitter import RecursiveCharacterTextSplitter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================
# CONFIGURATION
# ============================================

@dataclass
class RAGConfig:
    # Embedding
    embedding_model: str = "text-embedding-3-small"
    
    # Chunking
    chunk_size: int = 1000
    chunk_overlap: int = 200
    
    # Retrieval
    retrieval_k: int = 4
    similarity_threshold: float = 0.7
    
    # Generation
    llm_model: str = "gpt-4"
    temperature: float = 0
    max_tokens: int = 1000
    
    # Storage
    persist_directory: str = "./production_db"

# ============================================
# RAG SERVICE
# ============================================

class RAGService:
    """Production RAG Service"""
    
    def __init__(self, config: RAGConfig = None):
        self.config = config or RAGConfig()
        self._init_components()
    
    def _init_components(self):
        """Initialize all components"""
        
        # Embeddings
        self.embeddings = OpenAIEmbeddings(
            model=self.config.embedding_model
        )
        
        # LLM
        self.llm = ChatOpenAI(
            model=self.config.llm_model,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens
        )
        
        # Text splitter
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.config.chunk_size,
            chunk_overlap=self.config.chunk_overlap
        )
        
        # Vector store (lazy loading)
        self._vectorstore = None
        
        # Prompt
        self.prompt = ChatPromptTemplate.from_template("""
You are a helpful assistant. Answer based on the context below.

Context:
{context}

Rules:
1. Only use information from the context
2. If unsure, say "I don't have enough information"
3. Be concise but complete

Question: {question}

Answer:
""")
    
    @property
    def vectorstore(self):
        """Lazy load vector store"""
        if self._vectorstore is None:
            if os.path.exists(self.config.persist_directory):
                self._vectorstore = Chroma(
                    persist_directory=self.config.persist_directory,
                    embedding_function=self.embeddings
                )
            else:
                raise ValueError("Vector store not initialized. Call index_documents first.")
        return self._vectorstore
    
    def index_documents(self, documents: List, metadata: Dict = None):
        """Index documents into vector store"""
        
        logger.info(f"Indexing {len(documents)} documents")
        
        # Split
        chunks = self.splitter.split_documents(documents)
        logger.info(f"Created {len(chunks)} chunks")
        
        # Add metadata
        if metadata:
            for chunk in chunks:
                chunk.metadata.update(metadata)
        
        # Create/update vector store
        self._vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            persist_directory=self.config.persist_directory
        )
        
        logger.info("Indexing complete")
        return len(chunks)
    
    def query(
        self, 
        question: str, 
        filter: Dict = None,
        return_sources: bool = True
    ) -> Dict:
        """Query the RAG system"""
        
        logger.info(f"Query: {question[:50]}...")
        
        # Retrieve
        retriever = self.vectorstore.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={
                "k": self.config.retrieval_k,
                "score_threshold": self.config.similarity_threshold,
                "filter": filter
            }
        )
        
        docs = retriever.invoke(question)
        logger.info(f"Retrieved {len(docs)} documents")
        
        if not docs:
            return {
                "answer": "I don't have enough information to answer this question.",
                "sources": []
            }
        
        # Format context
        context = "\n\n".join(doc.page_content for doc in docs)
        
        # Generate
        answer = (
            self.prompt
            | self.llm
            | StrOutputParser()
        ).invoke({
            "context": context,
            "question": question
        })
        
        result = {"answer": answer}
        
        if return_sources:
            result["sources"] = [
                {
                    "content": doc.page_content[:200] + "...",
                    "metadata": doc.metadata
                }
                for doc in docs
            ]
        
        return result
    
    def health_check(self) -> Dict:
        """Check system health"""
        return {
            "status": "healthy",
            "vectorstore_initialized": self._vectorstore is not None,
            "document_count": self._vectorstore._collection.count() if self._vectorstore else 0
        }

# ============================================
# USAGE
# ============================================

if __name__ == "__main__":
    from langchain_community.document_loaders import DirectoryLoader
    
    # Initialize
    rag = RAGService()
    
    # Index documents
    loader = DirectoryLoader("./documents/", glob="**/*.txt")
    documents = loader.load()
    rag.index_documents(documents)
    
    # Query
    result = rag.query("What is machine learning?")
    print(f"Answer: {result['answer']}")
    print(f"Sources: {len(result['sources'])}")
```

---

## 💻 Complete Implementation

```python
"""
End-to-End RAG Application
FastAPI Backend + All Components
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import tempfile
import os

# Imports from previous sections
# (RAGService, document loaders, etc.)

# ============================================
# API MODELS
# ============================================

class QueryRequest(BaseModel):
    question: str
    filter: Optional[dict] = None

class QueryResponse(BaseModel):
    answer: str
    sources: List[dict]

class IndexResponse(BaseModel):
    message: str
    chunks_created: int

# ============================================
# API SETUP
# ============================================

app = FastAPI(title="RAG API", version="1.0.0")
rag_service = RAGService()

# ============================================
# ENDPOINTS
# ============================================

@app.get("/health")
async def health():
    return rag_service.health_check()

@app.post("/index", response_model=IndexResponse)
async def index_documents(files: List[UploadFile] = File(...)):
    """Upload and index documents"""
    
    all_chunks = 0
    
    for file in files:
        # Save to temp
        ext = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # Load based on type
            if ext == ".pdf":
                loader = PyPDFLoader(tmp_path)
            elif ext == ".txt":
                loader = TextLoader(tmp_path)
            else:
                raise HTTPException(400, f"Unsupported: {ext}")
            
            docs = loader.load()
            chunks = rag_service.index_documents(
                docs, 
                metadata={"source": file.filename}
            )
            all_chunks += chunks
        
        finally:
            os.unlink(tmp_path)
    
    return IndexResponse(
        message=f"Indexed {len(files)} files",
        chunks_created=all_chunks
    )

@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """Query the RAG system"""
    
    result = rag_service.query(
        question=request.question,
        filter=request.filter
    )
    
    return QueryResponse(**result)

@app.delete("/reset")
async def reset():
    """Reset the vector store"""
    import shutil
    if os.path.exists(rag_service.config.persist_directory):
        shutil.rmtree(rag_service.config.persist_directory)
    rag_service._vectorstore = None
    return {"message": "Reset complete"}

# ============================================
# RUN
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## ❓ Interview Questions

### Beginner Level

**Q1: What is RAG and why is it useful?**

> **A:** RAG (Retrieval-Augmented Generation) combines retrieval and generation. It retrieves relevant documents for a query, then uses them as context for an LLM to generate answers. Benefits:
> - Answers grounded in actual data
> - Reduces hallucination
> - Easy to update (just update documents)
> - Works with private/proprietary data

**Q2: What is chunking and why is it needed?**

> **A:** Chunking splits documents into smaller pieces because:
> 1. Embedding models have token limits
> 2. LLM context windows are limited
> 3. Smaller chunks enable more precise retrieval
> 4. Better semantic matching on focused content

**Q3: Explain the difference between retrieval and generation in RAG.**

> **A:** 
> - **Retrieval:** Finding relevant documents from a vector database based on query similarity
> - **Generation:** Using an LLM to synthesize an answer from retrieved documents
>
> Retrieval finds the right information; generation crafts the answer.

### Intermediate Level

**Q4: How would you handle questions that can't be answered from the documents?**

> **A:** Multiple strategies:
> 1. Set similarity thresholds - reject low-confidence retrievals
> 2. Explicit prompting - tell LLM to say "I don't know"
> 3. Relevance grading - use LLM to grade document relevance
> 4. Fallback mechanisms - web search, escalate to human

**Q5: Compare hybrid search with pure vector search.**

> **A:**
> - **Pure vector:** Semantic only, may miss keyword matches
> - **Hybrid (BM25 + vector):** Combines keyword and semantic
>
> Hybrid is better when:
> - Specific terms matter (product codes, names)
> - Users expect keyword matching
> - Domain has specific vocabulary

**Q6: How do you evaluate RAG system quality?**

> **A:** Metrics:
> - **Retrieval:** Precision@K, Recall@K, MRR
> - **Generation:** Faithfulness, Relevance, Correctness
> - **End-to-end:** Answer accuracy, user satisfaction
>
> Tools: RAGAS, custom LLM evaluation

### Advanced Level

**Q7: Design a RAG system for 100 million documents.**

> **A:** Architecture:
> - **Chunking:** Efficient pipeline with parallel processing
> - **Vector DB:** Distributed (Milvus cluster, Pinecone)
> - **Indexing:** HNSW + PQ for speed and memory
> - **Retrieval:** Two-phase (coarse then fine)
> - **Caching:** Cache frequent queries and embeddings
> - **Monitoring:** Track latency, recall, costs

**Q8: How would you implement multi-hop reasoning in RAG?**

> **A:** Approaches:
> 1. **Query decomposition:** Break into sub-questions
> 2. **Iterative retrieval:** Retrieve, reason, retrieve again
> 3. **Chain-of-thought:** Step-by-step reasoning
> 4. **Graph RAG:** Use knowledge graphs for relationships
>
> Implementation: LangGraph for multi-step workflows

---

## 📝 Homework

### Easy
1. Build a simple RAG system with 10 documents
2. Experiment with different chunk sizes
3. Compare similarity search with MMR

### Medium
4. Implement hybrid search (BM25 + vector)
5. Add re-ranking to improve retrieval
6. Create evaluation pipeline with 50 Q&A pairs

### Hard
7. Build a multi-document RAG with citations
8. Implement Corrective RAG (CRAG)
9. Add conversation memory to RAG

---

## 🎯 Key Takeaways

```
RAG Pipeline:
├── Document Processing: Load, chunk, embed
├── Retrieval: Find relevant context
├── Generation: Answer with context
└── Evaluation: Measure quality

Best Practices:
├── Chunk appropriately (500-1500 chars)
├── Use overlap (10-20%)
├── Consider hybrid search
├── Re-rank for quality
├── Evaluate continuously
└── Handle "I don't know"

Advanced Patterns:
├── Multi-query retrieval
├── Parent-document retrieval
├── Query transformation (HyDE, decomposition)
├── Corrective RAG
└── Self-query
```

---

**Next:** [04-Streamlit-Frontend.md](./04-Streamlit-Frontend.md) - Build beautiful RAG interfaces! 🎨
