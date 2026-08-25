# 📕 Advanced Projects (20 Projects)

## Complex Systems with Scale and Optimization

These projects involve **distributed systems**, **model optimization**, **multi-model architectures**, and **production considerations**. You'll tackle real engineering challenges.

---

## Project Index

| # | Project | Domain | Key Skills |
|---|---------|--------|------------|
| 1 | RAG-based Document QA System | LLM | RAG, Vector DB, Chunking |
| 2 | Multi-Agent AI System | Agents | LangGraph, Tool Use |
| 3 | Real-time Video Analytics | CV | Streaming, Edge AI |
| 4 | LLM Fine-tuning Pipeline | LLM | LoRA, QLoRA, PEFT |
| 5 | Multimodal Search Engine | Multimodal | CLIP, Cross-modal |
| 6 | Fraud Detection at Scale | ML | Streaming ML, Feature Store |
| 7 | Autonomous Trading Bot | RL + ML | Reinforcement Learning |
| 8 | Speech-to-Text Pipeline | Audio | Whisper, Streaming |
| 9 | Image Generation Service | GenAI | Stable Diffusion, ControlNet |
| 10 | Knowledge Graph Builder | NLP + Graph | Entity Extraction, Neo4j |
| 11 | Personalized News Feed | RecSys | Real-time, Multi-objective |
| 12 | Code Review Assistant | LLM | Static Analysis + LLM |
| 13 | Medical Diagnosis Assistant | Multimodal | Vision + Text, Explainable |
| 14 | Video Understanding System | CV + NLP | Scene Detection, Captioning |
| 15 | Conversational AI with Memory | LLM | Long-term Memory, RAG |
| 16 | Anomaly Detection Platform | ML | Time Series, Unsupervised |
| 17 | Document Intelligence System | CV + NLP | Layout, Tables, Forms |
| 18 | Voice Cloning System | Audio | TTS, Voice Conversion |
| 19 | Autonomous Drone Navigation | CV + RL | SLAM, Path Planning |
| 20 | Multi-tenant ML Platform | MLOps | Serving, Isolation |

---

# Project 1: RAG-based Document QA System

## 🎯 Problem Statement

**Business Context:** Legal firms have millions of documents. Lawyers spend 60% of time searching for relevant information. A QA system over documents saves thousands of hours.

**Goal:** Build a production-grade RAG system that answers questions from uploaded documents with source citations.

## 📊 Dataset

| Source | Type | Use Case |
|--------|------|----------|
| Custom Uploads | PDFs, Word docs | Primary |
| [Legal Case Database](https://case.law/) | Legal documents | Testing |
| Wikipedia Dumps | General knowledge | Evaluation |

## 🔄 Input → Output

```
INPUT:                                        OUTPUT:
┌────────────────────────────────────────┐   ┌────────────────────────────────────────┐
│ Documents:                             │   │ Answer:                                │
│ • contract_v2.pdf                      │   │ "The termination clause states that   │
│ • legal_appendix.docx                  │   │  either party may terminate with 30   │
│ • meeting_notes.txt                    │   │  days written notice."                │
│                                        │──►│                                        │
│ Question:                              │   │ Sources:                               │
│ "What are the termination conditions   │   │ • contract_v2.pdf, page 12, para 3   │
│  in our contract?"                     │   │ • legal_appendix.docx, section 4.2   │
│                                        │   │                                        │
└────────────────────────────────────────┘   │ Confidence: 0.92                       │
                                             └────────────────────────────────────────┘
```

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        RAG DOCUMENT QA SYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  INGESTION PIPELINE                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐      │
│  │ Document │──►│ Parse &  │──►│ Chunk    │──►│ Embed    │──►│ Store in │      │
│  │ Upload   │   │ Extract  │   │ (hybrid) │   │ (OpenAI) │   │ Vector DB│      │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘      │
│       │               │               │                            │            │
│       │               ▼               ▼                            │            │
│       │        ┌──────────┐   ┌──────────────────┐                │            │
│       │        │ Metadata │   │ • Semantic chunks │                │            │
│       │        │ Extract  │   │ • Sentence-based  │                │            │
│       │        └──────────┘   │ • Parent-child    │                │            │
│       │                       └──────────────────┘                │            │
│       │                                                           │            │
│  ─────┴───────────────────────────────────────────────────────────┘            │
│                                                                                  │
│  QUERY PIPELINE                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐      │
│  │ User     │──►│ Query    │──►│ Hybrid   │──►│ Rerank   │──►│ Generate │      │
│  │ Question │   │ Expand   │   │ Search   │   │ (Cohere) │   │ Answer   │      │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘      │
│                      │               │               │               │          │
│                      ▼               ▼               ▼               ▼          │
│               ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐        │
│               │ HyDE     │   │ Vector + │   │ Cross-   │   │ GPT-4 +  │        │
│               │ Multi-Q  │   │ BM25     │   │ encoder  │   │ Citations│        │
│               └──────────┘   └──────────┘   └──────────┘   └──────────┘        │
│                                                                                  │
│  Vector DB: ChromaDB / Pinecone / Qdrant                                        │
│  Embeddings: text-embedding-3-large / Cohere                                    │
│  LLM: GPT-4 / Claude / Llama-3                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🤖 Model & Component Choices

### Chunking Strategies

| Strategy | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **Fixed Size** | Simple | Breaks context | Never in production |
| **Sentence** | Natural breaks | Too small | Short docs |
| **Semantic** | Meaning-based | Compute heavy | Best general |
| **Parent-Child** | Full context | Complex | Long docs |
| **Sliding Window** | Overlap | Redundancy | Search-heavy |

### Embedding Models

| Model | Dim | Quality | Cost |
|-------|-----|---------|------|
| **text-embedding-3-small** | 1536 | Good | Low |
| **text-embedding-3-large** | 3072 | Best | Medium |
| **Cohere embed-v3** | 1024 | Very Good | Medium |
| **BGE-M3** | 1024 | Very Good | Free |

### Retrieval Strategies

| Strategy | Description |
|----------|-------------|
| **Dense** | Vector similarity only |
| **Sparse** | BM25/TF-IDF keyword |
| **Hybrid** | Dense + Sparse fusion |
| **HyDE** | Generate hypothetical doc |
| **Multi-query** | Multiple query variations |

## 💻 Complete Implementation

```python
"""
Production RAG System
"""
import os
from typing import List, Dict, Any
from dataclasses import dataclass
import chromadb
from chromadb.utils import embedding_functions
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
import openai
from rank_bm25 import BM25Okapi
import cohere
import numpy as np

# ============================================
# DATA MODELS
# ============================================

@dataclass
class Document:
    content: str
    metadata: Dict[str, Any]
    doc_id: str

@dataclass
class Chunk:
    content: str
    metadata: Dict[str, Any]
    chunk_id: str
    embedding: List[float] = None

@dataclass
class SearchResult:
    chunk: Chunk
    score: float
    source: str


# ============================================
# DOCUMENT PROCESSOR
# ============================================

class DocumentProcessor:
    """Handle document parsing and chunking"""
    
    def __init__(self, chunk_size=512, chunk_overlap=50):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
    
    def load_document(self, file_path: str) -> Document:
        """Load document from file"""
        if file_path.endswith('.pdf'):
            loader = PyPDFLoader(file_path)
        elif file_path.endswith('.docx'):
            loader = Docx2txtLoader(file_path)
        else:
            with open(file_path, 'r') as f:
                content = f.read()
            return Document(
                content=content,
                metadata={'source': file_path},
                doc_id=os.path.basename(file_path)
            )
        
        pages = loader.load()
        content = "\n\n".join([p.page_content for p in pages])
        
        return Document(
            content=content,
            metadata={'source': file_path, 'num_pages': len(pages)},
            doc_id=os.path.basename(file_path)
        )
    
    def chunk_document(self, doc: Document) -> List[Chunk]:
        """Split document into chunks"""
        texts = self.text_splitter.split_text(doc.content)
        
        chunks = []
        for i, text in enumerate(texts):
            chunk = Chunk(
                content=text,
                metadata={
                    **doc.metadata,
                    'chunk_index': i,
                    'doc_id': doc.doc_id
                },
                chunk_id=f"{doc.doc_id}_chunk_{i}"
            )
            chunks.append(chunk)
        
        return chunks


# ============================================
# VECTOR STORE
# ============================================

class VectorStore:
    """ChromaDB-based vector store with hybrid search"""
    
    def __init__(self, collection_name="documents"):
        self.client = chromadb.PersistentClient(path="./chroma_db")
        
        self.embedding_fn = embedding_functions.OpenAIEmbeddingFunction(
            api_key=os.getenv("OPENAI_API_KEY"),
            model_name="text-embedding-3-small"
        )
        
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )
        
        # BM25 for sparse retrieval
        self.bm25 = None
        self.chunk_contents = []
        self.chunk_ids = []
    
    def add_chunks(self, chunks: List[Chunk]):
        """Add chunks to vector store"""
        ids = [c.chunk_id for c in chunks]
        contents = [c.content for c in chunks]
        metadatas = [c.metadata for c in chunks]
        
        self.collection.add(
            ids=ids,
            documents=contents,
            metadatas=metadatas
        )
        
        # Update BM25 index
        self.chunk_contents.extend(contents)
        self.chunk_ids.extend(ids)
        tokenized = [doc.lower().split() for doc in self.chunk_contents]
        self.bm25 = BM25Okapi(tokenized)
    
    def hybrid_search(
        self, 
        query: str, 
        top_k: int = 10,
        dense_weight: float = 0.7
    ) -> List[SearchResult]:
        """Hybrid dense + sparse search"""
        
        # Dense search
        dense_results = self.collection.query(
            query_texts=[query],
            n_results=top_k * 2
        )
        
        # Sparse search (BM25)
        tokenized_query = query.lower().split()
        bm25_scores = self.bm25.get_scores(tokenized_query)
        
        # Normalize scores
        dense_scores = {}
        for i, id_ in enumerate(dense_results['ids'][0]):
            dense_scores[id_] = 1 - dense_results['distances'][0][i]
        
        sparse_scores = {}
        for i, id_ in enumerate(self.chunk_ids):
            sparse_scores[id_] = bm25_scores[i] / (max(bm25_scores) + 1e-10)
        
        # Combine scores
        all_ids = set(dense_scores.keys()) | set(sparse_scores.keys())
        combined = []
        
        for id_ in all_ids:
            dense = dense_scores.get(id_, 0)
            sparse = sparse_scores.get(id_, 0)
            final_score = dense_weight * dense + (1 - dense_weight) * sparse
            combined.append((id_, final_score))
        
        combined.sort(key=lambda x: x[1], reverse=True)
        
        # Get chunk details
        results = []
        for id_, score in combined[:top_k]:
            idx = self.chunk_ids.index(id_)
            chunk = Chunk(
                content=self.chunk_contents[idx],
                metadata={},
                chunk_id=id_
            )
            results.append(SearchResult(chunk=chunk, score=score, source=id_))
        
        return results


# ============================================
# RERANKER
# ============================================

class Reranker:
    """Cross-encoder reranking"""
    
    def __init__(self):
        self.cohere = cohere.Client(os.getenv("COHERE_API_KEY"))
    
    def rerank(
        self, 
        query: str, 
        results: List[SearchResult], 
        top_k: int = 5
    ) -> List[SearchResult]:
        """Rerank using Cohere"""
        
        documents = [r.chunk.content for r in results]
        
        response = self.cohere.rerank(
            query=query,
            documents=documents,
            top_n=top_k,
            model="rerank-english-v3.0"
        )
        
        reranked = []
        for r in response.results:
            original = results[r.index]
            reranked.append(SearchResult(
                chunk=original.chunk,
                score=r.relevance_score,
                source=original.source
            ))
        
        return reranked


# ============================================
# RAG CHAIN
# ============================================

class RAGChain:
    """Complete RAG pipeline"""
    
    def __init__(self):
        self.processor = DocumentProcessor()
        self.vector_store = VectorStore()
        self.reranker = Reranker()
        self.client = openai.OpenAI()
    
    def ingest(self, file_paths: List[str]):
        """Ingest documents"""
        for path in file_paths:
            doc = self.processor.load_document(path)
            chunks = self.processor.chunk_document(doc)
            self.vector_store.add_chunks(chunks)
            print(f"Ingested {path}: {len(chunks)} chunks")
    
    def query(self, question: str, top_k: int = 5) -> Dict[str, Any]:
        """Answer question using RAG"""
        
        # 1. Retrieve
        results = self.vector_store.hybrid_search(question, top_k=top_k*2)
        
        # 2. Rerank
        reranked = self.reranker.rerank(question, results, top_k=top_k)
        
        # 3. Build context
        context = "\n\n---\n\n".join([
            f"[Source: {r.source}]\n{r.chunk.content}" 
            for r in reranked
        ])
        
        # 4. Generate answer
        system_prompt = """You are a helpful assistant that answers questions based on 
        the provided context. Always cite your sources using [Source: ...] format.
        If the context doesn't contain enough information, say so."""
        
        response = self.client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
            ],
            temperature=0
        )
        
        return {
            "answer": response.choices[0].message.content,
            "sources": [r.source for r in reranked],
            "confidence": sum(r.score for r in reranked) / len(reranked)
        }


# ============================================
# API
# ============================================

from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel

app = FastAPI(title="RAG Document QA")
rag = RAGChain()

class QuestionRequest(BaseModel):
    question: str

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    # Save and ingest
    path = f"./uploads/{file.filename}"
    with open(path, "wb") as f:
        f.write(await file.read())
    rag.ingest([path])
    return {"status": "ingested", "filename": file.filename}

@app.post("/ask")
async def ask_question(request: QuestionRequest):
    result = rag.query(request.question)
    return result
```

## 📏 Evaluation Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Context Relevance** | Retrieved chunks contain answer | >0.85 |
| **Answer Faithfulness** | Answer is grounded in context | >0.90 |
| **Answer Relevance** | Answer addresses question | >0.90 |
| **Latency** | End-to-end response time | <3s |

Use **RAGAS** framework for evaluation:
```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_relevancy

# Evaluate
results = evaluate(dataset, metrics=[faithfulness, answer_relevancy, context_relevancy])
```

## ⚠️ Real-World Challenges

1. **Chunk Quality:** Bad chunking = bad retrieval
2. **Multi-hop Questions:** Need query decomposition
3. **Hallucination:** Model makes up answers not in context
4. **Scale:** Millions of documents need distributed vector DB
5. **Freshness:** Documents update frequently

---

# Project 2: Multi-Agent AI System

## 🎯 Problem Statement

**Business Context:** Complex business workflows require multiple specialized AI capabilities working together - research, analysis, writing, and execution.

**Goal:** Build a multi-agent system where specialized agents collaborate to complete complex tasks.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MULTI-AGENT ORCHESTRATION                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                         ┌─────────────────┐                             │
│                         │   SUPERVISOR    │                             │
│                         │     AGENT       │                             │
│                         │  (Orchestrator) │                             │
│                         └────────┬────────┘                             │
│                                  │                                       │
│            ┌─────────────────────┼─────────────────────┐                │
│            │                     │                     │                │
│            ▼                     ▼                     ▼                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │   RESEARCHER    │  │    ANALYST      │  │     WRITER      │         │
│  │     AGENT       │  │     AGENT       │  │     AGENT       │         │
│  │                 │  │                 │  │                 │         │
│  │ Tools:          │  │ Tools:          │  │ Tools:          │         │
│  │ • Web Search    │  │ • Calculator    │  │ • Draft Doc     │         │
│  │ • Read URL      │  │ • Data Analysis │  │ • Format        │         │
│  │ • Wikipedia     │  │ • Visualize     │  │ • Edit          │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│            │                     │                     │                │
│            └─────────────────────┼─────────────────────┘                │
│                                  │                                       │
│                         ┌────────▼────────┐                             │
│                         │  SHARED STATE   │                             │
│                         │  (Memory/DB)    │                             │
│                         └─────────────────┘                             │
│                                                                          │
│  Framework: LangGraph                                                    │
│  Communication: Tool calls + Structured messages                        │
│  State: Checkpointed for recovery                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## 💻 Implementation

```python
"""
Multi-Agent System with LangGraph
"""
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import Graph, StateGraph, END
from langgraph.prebuilt import ToolExecutor, ToolInvocation
import operator

# ============================================
# STATE
# ============================================

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next_agent: str
    research_data: dict
    analysis_results: dict
    final_output: str


# ============================================
# TOOLS
# ============================================

@tool
def search_web(query: str) -> str:
    """Search the web for information"""
    # In production, use Serper/Tavily API
    return f"Search results for: {query}"

@tool 
def analyze_data(data: str) -> str:
    """Analyze data and provide insights"""
    return f"Analysis of: {data}"

@tool
def write_document(content: str, style: str = "professional") -> str:
    """Write a formatted document"""
    return f"Document in {style} style:\n{content}"


# ============================================
# AGENTS
# ============================================

class AgentSystem:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4-turbo-preview", temperature=0)
        self.tools = [search_web, analyze_data, write_document]
        
    def create_agent(self, name: str, system_prompt: str, tools: list):
        """Create specialized agent"""
        def agent_fn(state: AgentState) -> AgentState:
            messages = state["messages"]
            
            response = self.llm.invoke(
                [{"role": "system", "content": system_prompt}] + messages
            )
            
            return {
                "messages": [response],
                "next_agent": self._determine_next(response)
            }
        
        return agent_fn
    
    def build_graph(self) -> StateGraph:
        """Build agent workflow graph"""
        
        # Create agents
        supervisor = self.create_agent(
            "supervisor",
            "You orchestrate other agents. Decide who should act next.",
            []
        )
        
        researcher = self.create_agent(
            "researcher", 
            "You research topics thoroughly using web search.",
            [search_web]
        )
        
        analyst = self.create_agent(
            "analyst",
            "You analyze data and provide insights.",
            [analyze_data]
        )
        
        writer = self.create_agent(
            "writer",
            "You write professional documents based on research and analysis.",
            [write_document]
        )
        
        # Build graph
        workflow = StateGraph(AgentState)
        
        workflow.add_node("supervisor", supervisor)
        workflow.add_node("researcher", researcher)
        workflow.add_node("analyst", analyst)
        workflow.add_node("writer", writer)
        
        # Add edges
        workflow.add_conditional_edges(
            "supervisor",
            self._route_supervisor,
            {
                "researcher": "researcher",
                "analyst": "analyst",
                "writer": "writer",
                "end": END
            }
        )
        
        workflow.add_edge("researcher", "supervisor")
        workflow.add_edge("analyst", "supervisor")
        workflow.add_edge("writer", "supervisor")
        
        workflow.set_entry_point("supervisor")
        
        return workflow.compile()
    
    def _route_supervisor(self, state: AgentState) -> str:
        """Route to next agent"""
        last_message = state["messages"][-1].content
        
        if "RESEARCH" in last_message:
            return "researcher"
        elif "ANALYZE" in last_message:
            return "analyst"
        elif "WRITE" in last_message:
            return "writer"
        else:
            return "end"
    
    def _determine_next(self, response) -> str:
        """Determine next agent from response"""
        content = response.content
        if "need research" in content.lower():
            return "researcher"
        elif "need analysis" in content.lower():
            return "analyst"
        elif "need writing" in content.lower():
            return "writer"
        return "end"


# Usage
system = AgentSystem()
graph = system.build_graph()

result = graph.invoke({
    "messages": [HumanMessage(content="Research AI trends and write a report")],
    "next_agent": "supervisor",
    "research_data": {},
    "analysis_results": {},
    "final_output": ""
})
```

---

# Project 3: Real-time Video Analytics

## 🎯 Problem Statement

**Business Context:** Retail stores, airports, and cities need real-time monitoring of crowd density, behavior detection, and safety alerts.

**Goal:** Build streaming video analytics processing multiple camera feeds.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME VIDEO ANALYTICS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  INGESTION                          PROCESSING                          │
│  ┌──────────┐                      ┌─────────────────────────────────┐  │
│  │ Camera 1 │──┐                   │                                 │  │
│  └──────────┘  │                   │  ┌──────────┐  ┌──────────┐    │  │
│  ┌──────────┐  │   ┌──────────┐   │  │ Decode   │─►│ Detect   │    │  │
│  │ Camera 2 │──┼──►│  Kafka   │───┼─►│ Frames   │  │ (YOLO)   │    │  │
│  └──────────┘  │   │  Stream  │   │  └──────────┘  └────┬─────┘    │  │
│  ┌──────────┐  │   └──────────┘   │                     │          │  │
│  │ Camera N │──┘                   │  ┌─────────────────▼────────┐  │  │
│  └──────────┘                      │  │         TRACK            │  │  │
│                                    │  │     (DeepSORT)           │  │  │
│                                    │  └─────────────────┬────────┘  │  │
│                                    │                    │           │  │
│                                    └────────────────────┼───────────┘  │
│                                                         │              │
│  ANALYTICS                                              ▼              │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │ Crowd    │  │ Behavior │  │ Dwell    │  │ Path     │        │  │
│  │  │ Density  │  │ Detect   │  │ Time     │  │ Analysis │        │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │  │
│  │       │             │             │             │               │  │
│  │       └─────────────┴─────────────┴─────────────┘               │  │
│  │                           │                                      │  │
│  │                    ┌──────▼──────┐                               │  │
│  │                    │   Alert     │                               │  │
│  │                    │   Engine    │                               │  │
│  │                    └─────────────┘                               │  │
│  │                                                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  OUTPUT: Dashboard, Alerts, Analytics API                               │
└─────────────────────────────────────────────────────────────────────────┘
```

## 💻 Core Implementation

```python
"""
Streaming Video Analytics
"""
import cv2
import numpy as np
from collections import defaultdict
import torch
from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort

class VideoAnalyticsPipeline:
    def __init__(self, model_path="yolov8n.pt"):
        self.detector = YOLO(model_path)
        self.tracker = DeepSort(max_age=30)
        self.track_history = defaultdict(list)
        
        # Analytics
        self.crowd_counts = []
        self.dwell_times = defaultdict(float)
        self.zones = []  # Define counting zones
    
    def process_frame(self, frame, frame_id):
        """Process single frame"""
        # Detect
        results = self.detector(frame, classes=[0])  # Person only
        detections = []
        
        for box in results[0].boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = box.conf[0].item()
            detections.append(([x1, y1, x2-x1, y2-y1], conf, 'person'))
        
        # Track
        tracks = self.tracker.update_tracks(detections, frame=frame)
        
        # Analytics
        active_tracks = []
        for track in tracks:
            if not track.is_confirmed():
                continue
            
            track_id = track.track_id
            bbox = track.to_ltrb()
            center = ((bbox[0]+bbox[2])/2, (bbox[1]+bbox[3])/2)
            
            # Track history for path analysis
            self.track_history[track_id].append(center)
            
            # Dwell time
            self.dwell_times[track_id] += 1/30  # Assuming 30 FPS
            
            active_tracks.append({
                'id': track_id,
                'bbox': bbox,
                'center': center
            })
        
        # Crowd density
        self.crowd_counts.append(len(active_tracks))
        
        return {
            'frame_id': frame_id,
            'tracks': active_tracks,
            'crowd_count': len(active_tracks),
            'alerts': self._check_alerts(active_tracks)
        }
    
    def _check_alerts(self, tracks):
        """Check for alert conditions"""
        alerts = []
        
        # Crowd threshold
        if len(tracks) > 50:
            alerts.append({'type': 'crowd', 'message': 'High crowd density'})
        
        # Loitering detection
        for track_id, dwell in self.dwell_times.items():
            if dwell > 300:  # 5 minutes
                alerts.append({'type': 'loiter', 'track_id': track_id})
        
        return alerts


# Stream processing with Kafka
from kafka import KafkaConsumer, KafkaProducer
import json

class StreamProcessor:
    def __init__(self):
        self.consumer = KafkaConsumer(
            'video-frames',
            bootstrap_servers='localhost:9092',
            value_deserializer=lambda x: x
        )
        self.producer = KafkaProducer(
            bootstrap_servers='localhost:9092',
            value_serializer=lambda x: json.dumps(x).encode()
        )
        self.pipeline = VideoAnalyticsPipeline()
    
    def run(self):
        for message in self.consumer:
            # Decode frame
            frame_data = np.frombuffer(message.value, dtype=np.uint8)
            frame = cv2.imdecode(frame_data, cv2.IMREAD_COLOR)
            
            # Process
            result = self.pipeline.process_frame(frame, message.offset)
            
            # Publish results
            self.producer.send('analytics-results', result)
            
            # Handle alerts
            for alert in result['alerts']:
                self.producer.send('alerts', alert)
```

---

# Projects 4-20: Detailed Summaries

## Project 4: LLM Fine-tuning Pipeline

| Component | Details |
|-----------|---------|
| **Goal** | Fine-tune LLMs for domain-specific tasks |
| **Techniques** | LoRA, QLoRA, Full fine-tuning |
| **Tools** | HuggingFace PEFT, Unsloth, Axolotl |
| **Dataset** | Domain-specific instruction dataset |
| **Challenges** | Catastrophic forgetting, data quality |

```python
# Quick LoRA setup
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-2-7b-hf")

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none"
)

model = get_peft_model(model, lora_config)
# Training code...
```

---

## Project 5: Multimodal Search Engine

| Component | Details |
|-----------|---------|
| **Goal** | Search across text, images, audio |
| **Model** | CLIP, ImageBind |
| **Architecture** | Unified embedding space |
| **Features** | Cross-modal queries |

---

## Project 6: Fraud Detection at Scale

| Component | Details |
|-----------|---------|
| **Goal** | Real-time fraud scoring at 10K TPS |
| **Architecture** | Feature Store + Streaming ML |
| **Tools** | Feast, Kafka, Flink |
| **Model** | Online learning, XGBoost |

---

## Project 7: Autonomous Trading Bot

| Component | Details |
|-----------|---------|
| **Goal** | Algorithmic trading with RL |
| **Environment** | Custom gym environment |
| **Model** | PPO, A2C |
| **Risk** | Extensive backtesting required |

---

## Project 8: Speech-to-Text Pipeline

| Component | Details |
|-----------|---------|
| **Goal** | Real-time transcription |
| **Model** | Whisper, Conformer |
| **Features** | Speaker diarization, streaming |
| **Challenges** | Noise, accents, domain terms |

---

## Project 9: Image Generation Service

| Component | Details |
|-----------|---------|
| **Goal** | Production text-to-image API |
| **Model** | Stable Diffusion XL |
| **Features** | ControlNet, LoRA styles |
| **Infra** | GPU queue, caching |

---

## Project 10: Knowledge Graph Builder

| Component | Details |
|-----------|---------|
| **Goal** | Auto-build KG from documents |
| **Components** | NER, Relation Extraction, Neo4j |
| **Use Case** | Enterprise knowledge management |

---

## Project 11: Personalized News Feed

| Component | Details |
|-----------|---------|
| **Goal** | Real-time news personalization |
| **Model** | Two-tower + bandit |
| **Objectives** | Relevance, diversity, freshness |

---

## Project 12: Code Review Assistant

| Component | Details |
|-----------|---------|
| **Goal** | AI-powered code review |
| **Components** | Static analysis + LLM |
| **Features** | Bug detection, style, security |

---

## Project 13: Medical Diagnosis Assistant

| Component | Details |
|-----------|---------|
| **Goal** | Multi-modal medical AI |
| **Data** | X-rays + clinical notes |
| **Critical** | Explainability, uncertainty |

---

## Project 14: Video Understanding System

| Component | Details |
|-----------|---------|
| **Goal** | Video summarization, QA |
| **Components** | Scene detection, captioning |
| **Model** | Video-LLM (Video-LLaVA) |

---

## Project 15: Conversational AI with Memory

| Component | Details |
|-----------|---------|
| **Goal** | Long-term memory chatbot |
| **Components** | MemGPT-style architecture |
| **Features** | Episodic + semantic memory |

---

## Project 16: Anomaly Detection Platform

| Component | Details |
|-----------|---------|
| **Goal** | Multi-domain anomaly detection |
| **Methods** | Isolation Forest, Autoencoders |
| **Use Cases** | IoT, logs, metrics |

---

## Project 17: Document Intelligence System

| Component | Details |
|-----------|---------|
| **Goal** | Full document understanding |
| **Components** | Layout analysis, table extraction |
| **Model** | LayoutLM, Donut |

---

## Project 18: Voice Cloning System

| Component | Details |
|-----------|---------|
| **Goal** | Clone voice from samples |
| **Model** | Tortoise-TTS, XTTS |
| **Ethics** | Consent, watermarking |

---

## Project 19: Autonomous Drone Navigation

| Component | Details |
|-----------|---------|
| **Goal** | Vision-based navigation |
| **Components** | SLAM, path planning |
| **Simulation** | AirSim, Gazebo |

---

## Project 20: Multi-tenant ML Platform

| Component | Details |
|-----------|---------|
| **Goal** | ML platform for multiple teams |
| **Components** | Model serving, isolation |
| **Tools** | KServe, Seldon, BentoML |

---

## 🎯 Advanced Projects Checklist

Complete at least **5 projects** before moving to Production:

- [ ] 1 RAG/LLM project
- [ ] 1 Computer Vision project
- [ ] 1 Multi-agent/agentic project
- [ ] 1 MLOps-focused project
- [ ] 1 Domain-specific project

---

**Next:** [04-Production-Systems.md](./04-Production-Systems.md) →
