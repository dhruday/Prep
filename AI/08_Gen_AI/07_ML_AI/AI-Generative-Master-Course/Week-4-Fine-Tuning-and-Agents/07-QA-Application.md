# ❓ Q&A Application: Complete Project

## 📚 Table of Contents
1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [System Architecture](#-system-architecture)
3. [Building Blocks](#-building-blocks)
4. [Implementation](#-implementation)
5. [Advanced Features](#-advanced-features)
6. [Deployment](#-deployment)
7. [Evaluation and Testing](#-evaluation-and-testing)
8. [Real World Considerations](#-real-world-considerations)
9. [Complete Project Code](#-complete-project-code)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🔰 Beginner Friendly Explanation

### What is a Q&A Application?

```
Q&A Application = Your Own Expert System

Traditional Search:
User: "What is our refund policy?"
Search: Returns 10 documents with "refund" mentioned
User: *Has to read all documents to find answer*

Q&A Application:
User: "What is our refund policy?"
App: "Our refund policy allows returns within 30 days 
      of purchase. Items must be unused with original 
      packaging. Refunds are processed within 5-7 
      business days."

The app:
├── Understands your question
├── Finds relevant information
├── Generates a precise answer
└── Cites sources
```

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Q&A APPLICATION FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. DOCUMENT INGESTION (One-time setup)                     │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐          │
│  │  Documents │ → │   Chunk    │ → │  Embed &   │          │
│  │  (PDF,txt) │   │   Text     │   │   Store    │          │
│  └────────────┘   └────────────┘   └────────────┘          │
│                                                              │
│  2. QUESTION ANSWERING (Every query)                        │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐          │
│  │  Question  │ → │  Retrieve  │ → │  Generate  │          │
│  │            │   │  Context   │   │   Answer   │          │
│  └────────────┘   └────────────┘   └────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Types of Q&A Systems

```
1. EXTRACTIVE Q&A
   - Finds answer span in text
   - "The answer is in paragraph 3, sentence 2"
   - Fast, precise, limited flexibility

2. GENERATIVE Q&A (RAG)
   - Generates natural answer from context
   - "Based on the documents, the answer is..."
   - Flexible, natural, needs careful grounding

3. HYBRID Q&A
   - Combines both approaches
   - Extract candidates, then generate answer
   - Best of both worlds

This project: GENERATIVE Q&A with RAG
```

---

## 🎯 System Architecture

### High-Level Design

```
┌──────────────────────────────────────────────────────────────────┐
│                       Q&A SYSTEM ARCHITECTURE                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                        FRONTEND                              │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────────────┐   │ │
│  │  │  Chat UI  │  │  Upload   │  │  Answer Display       │   │ │
│  │  │           │  │  Documents│  │  + Sources            │   │ │
│  │  └───────────┘  └───────────┘  └───────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                         API LAYER                            │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │ │
│  │  │   /chat    │  │  /upload   │  │  /feedback         │    │ │
│  │  └────────────┘  └────────────┘  └────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    PROCESSING LAYER                          │ │
│  │                                                               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │   Document   │  │   Retrieval  │  │  Generation  │      │ │
│  │  │   Processor  │  │    Engine    │  │    Engine    │      │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │ │
│  │                                                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      DATA LAYER                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │  Vector DB   │  │  Document    │  │   Chat       │      │ │
│  │  │  (Embeddings)│  │  Storage     │  │   History    │      │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Component Details

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Streamlit/Gradio | User interface |
| API | FastAPI | Backend services |
| Vector DB | ChromaDB/Pinecone | Semantic search |
| LLM | OpenAI/Claude | Answer generation |
| Embeddings | OpenAI/HuggingFace | Text embeddings |
| Document Loader | LangChain | PDF/text parsing |
| Chat Memory | Redis/SQLite | Conversation history |

---

## 🧱 Building Blocks

### 1. Document Processing

```python
"""
Document Processing Pipeline
Load, split, and prepare documents
"""

from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    DirectoryLoader,
    UnstructuredWordDocumentLoader,
    CSVLoader
)
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter,
    TokenTextSplitter
)
from langchain_core.documents import Document

# ============================================
# DOCUMENT LOADERS
# ============================================

def load_pdf(filepath: str) -> list[Document]:
    """Load PDF document"""
    loader = PyPDFLoader(filepath)
    return loader.load()

def load_directory(path: str, glob: str = "**/*.pdf") -> list[Document]:
    """Load all documents in directory"""
    loader = DirectoryLoader(
        path,
        glob=glob,
        loader_cls=PyPDFLoader
    )
    return loader.load()

def load_text(filepath: str) -> list[Document]:
    """Load text file"""
    loader = TextLoader(filepath)
    return loader.load()

def load_csv(filepath: str) -> list[Document]:
    """Load CSV as documents"""
    loader = CSVLoader(filepath)
    return loader.load()

# ============================================
# TEXT SPLITTING
# ============================================

def split_documents(
    documents: list[Document],
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> list[Document]:
    """Split documents into chunks"""
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    
    return splitter.split_documents(documents)

# ============================================
# METADATA ENRICHMENT
# ============================================

def enrich_metadata(documents: list[Document]) -> list[Document]:
    """Add useful metadata to chunks"""
    
    enriched = []
    for doc in documents:
        # Add chunk ID
        doc.metadata["chunk_id"] = hash(doc.page_content)
        
        # Add content summary
        doc.metadata["preview"] = doc.page_content[:100] + "..."
        
        # Add word count
        doc.metadata["word_count"] = len(doc.page_content.split())
        
        enriched.append(doc)
    
    return enriched

# ============================================
# COMPLETE PROCESSING PIPELINE
# ============================================

class DocumentProcessor:
    """Complete document processing pipeline"""
    
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def process(self, filepath: str) -> list[Document]:
        """Process a single document"""
        
        # Load based on extension
        ext = filepath.lower().split(".")[-1]
        
        if ext == "pdf":
            documents = load_pdf(filepath)
        elif ext == "txt":
            documents = load_text(filepath)
        elif ext == "csv":
            documents = load_csv(filepath)
        else:
            raise ValueError(f"Unsupported format: {ext}")
        
        # Split
        chunks = split_documents(
            documents,
            self.chunk_size,
            self.chunk_overlap
        )
        
        # Enrich
        return enrich_metadata(chunks)
    
    def process_directory(self, path: str) -> list[Document]:
        """Process all documents in directory"""
        import os
        
        all_chunks = []
        
        for root, dirs, files in os.walk(path):
            for file in files:
                filepath = os.path.join(root, file)
                try:
                    chunks = self.process(filepath)
                    all_chunks.extend(chunks)
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")
        
        return all_chunks
```

### 2. Vector Store

```python
"""
Vector Store: Semantic Search Index
"""

from langchain_openai import OpenAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma, FAISS
from langchain_core.documents import Document

# ============================================
# EMBEDDING MODELS
# ============================================

def get_embeddings(provider: str = "openai"):
    """Get embedding model"""
    
    if provider == "openai":
        return OpenAIEmbeddings(
            model="text-embedding-3-small"
        )
    elif provider == "huggingface":
        return HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
    else:
        raise ValueError(f"Unknown provider: {provider}")

# ============================================
# VECTOR STORE CLASS
# ============================================

class VectorStore:
    """Manage vector store operations"""
    
    def __init__(
        self,
        persist_directory: str = "./chroma_db",
        embedding_provider: str = "openai"
    ):
        self.persist_directory = persist_directory
        self.embeddings = get_embeddings(embedding_provider)
        self.vectorstore = None
    
    def create_from_documents(self, documents: list[Document]):
        """Create vector store from documents"""
        
        self.vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=self.persist_directory
        )
        
        return self
    
    def load(self):
        """Load existing vector store"""
        
        self.vectorstore = Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings
        )
        
        return self
    
    def add_documents(self, documents: list[Document]):
        """Add documents to existing store"""
        
        if self.vectorstore is None:
            return self.create_from_documents(documents)
        
        self.vectorstore.add_documents(documents)
        return self
    
    def search(
        self,
        query: str,
        k: int = 4,
        filter: dict = None
    ) -> list[Document]:
        """Search for similar documents"""
        
        if self.vectorstore is None:
            raise ValueError("Vector store not initialized")
        
        return self.vectorstore.similarity_search(
            query,
            k=k,
            filter=filter
        )
    
    def search_with_scores(
        self,
        query: str,
        k: int = 4
    ) -> list[tuple[Document, float]]:
        """Search with relevance scores"""
        
        return self.vectorstore.similarity_search_with_relevance_scores(
            query,
            k=k
        )
    
    def as_retriever(self, **kwargs):
        """Get as LangChain retriever"""
        return self.vectorstore.as_retriever(**kwargs)
    
    def delete(self, ids: list[str] = None):
        """Delete documents"""
        if ids:
            self.vectorstore.delete(ids)
        else:
            # Delete all
            import shutil
            shutil.rmtree(self.persist_directory)
            self.vectorstore = None
```

### 3. Answer Generation

```python
"""
Answer Generation: RAG Chain
"""

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableParallel

# ============================================
# PROMPTS
# ============================================

QA_PROMPT = ChatPromptTemplate.from_template("""
Answer the question based only on the following context:

Context:
{context}

Question: {question}

Instructions:
1. Answer the question using ONLY the information in the context
2. If the answer is not in the context, say "I don't have enough information to answer this question"
3. Be concise but complete
4. If relevant, cite which part of the context supports your answer

Answer:
""")

CONVERSATIONAL_QA_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful assistant answering questions based on provided context.

Rules:
1. Only use information from the context
2. If you don't know, say so
3. Be helpful and conversational
4. Reference previous conversation when relevant"""),
    
    ("human", """Context:
{context}

Chat History:
{chat_history}

Question: {question}

Answer:""")
])

# ============================================
# RAG CHAIN
# ============================================

def create_rag_chain(retriever, llm=None):
    """Create basic RAG chain"""
    
    if llm is None:
        llm = ChatOpenAI(model="gpt-4", temperature=0)
    
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)
    
    chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough()
        }
        | QA_PROMPT
        | llm
        | StrOutputParser()
    )
    
    return chain

# ============================================
# RAG WITH SOURCES
# ============================================

def create_rag_chain_with_sources(retriever, llm=None):
    """RAG chain that returns sources"""
    
    if llm is None:
        llm = ChatOpenAI(model="gpt-4", temperature=0)
    
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)
    
    # Get both docs and formatted context
    retrieve_and_format = RunnableParallel(
        context=retriever | format_docs,
        source_documents=retriever
    )
    
    def generate_answer(inputs):
        response = (
            QA_PROMPT
            | llm
            | StrOutputParser()
        ).invoke({
            "context": inputs["context"],
            "question": inputs["question"]
        })
        
        return {
            "answer": response,
            "sources": [
                {
                    "content": doc.page_content[:200] + "...",
                    "metadata": doc.metadata
                }
                for doc in inputs["source_documents"]
            ]
        }
    
    chain = (
        RunnablePassthrough.assign(**retrieve_and_format.invoke)
        | generate_answer
    )
    
    return chain

# ============================================
# CONVERSATIONAL RAG
# ============================================

class ConversationalRAG:
    """RAG with conversation memory"""
    
    def __init__(self, retriever, llm=None):
        self.retriever = retriever
        self.llm = llm or ChatOpenAI(model="gpt-4", temperature=0)
        self.chat_history = []
    
    def format_history(self):
        """Format chat history for prompt"""
        if not self.chat_history:
            return "No previous conversation."
        
        formatted = []
        for turn in self.chat_history[-5:]:  # Last 5 turns
            formatted.append(f"Human: {turn['question']}")
            formatted.append(f"Assistant: {turn['answer']}")
        
        return "\n".join(formatted)
    
    def format_docs(self, docs):
        return "\n\n".join(doc.page_content for doc in docs)
    
    def ask(self, question: str) -> dict:
        """Ask a question"""
        
        # Retrieve
        docs = self.retriever.invoke(question)
        
        # Generate
        response = (
            CONVERSATIONAL_QA_PROMPT
            | self.llm
            | StrOutputParser()
        ).invoke({
            "context": self.format_docs(docs),
            "chat_history": self.format_history(),
            "question": question
        })
        
        # Store in history
        self.chat_history.append({
            "question": question,
            "answer": response
        })
        
        return {
            "answer": response,
            "sources": docs
        }
    
    def clear_history(self):
        """Clear conversation history"""
        self.chat_history = []
```

---

## 💻 Implementation

### Complete Backend

```python
"""
Complete Q&A Backend
FastAPI + LangChain
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import tempfile
import os
from datetime import datetime

# ============================================
# PYDANTIC MODELS
# ============================================

class QuestionRequest(BaseModel):
    question: str
    session_id: Optional[str] = "default"

class AnswerResponse(BaseModel):
    answer: str
    sources: list[dict]
    session_id: str

class UploadResponse(BaseModel):
    message: str
    documents_processed: int
    chunks_created: int

# ============================================
# FASTAPI APP
# ============================================

app = FastAPI(
    title="Q&A API",
    description="Question Answering over documents",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# GLOBAL STATE
# ============================================

# Initialize components
document_processor = DocumentProcessor()
vector_store = VectorStore()
sessions = {}  # session_id -> ConversationalRAG

def get_session(session_id: str) -> ConversationalRAG:
    """Get or create conversation session"""
    if session_id not in sessions:
        retriever = vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 4}
        )
        sessions[session_id] = ConversationalRAG(retriever)
    return sessions[session_id]

# ============================================
# ENDPOINTS
# ============================================

@app.get("/")
async def root():
    return {"status": "running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "vector_store": vector_store.vectorstore is not None,
        "active_sessions": len(sessions)
    }

@app.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document"""
    
    # Validate file type
    allowed_types = [".pdf", ".txt", ".csv"]
    ext = os.path.splitext(file.filename)[1].lower()
    
    if ext not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {allowed_types}"
        )
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Process document
        chunks = document_processor.process(tmp_path)
        
        # Add to vector store
        vector_store.add_documents(chunks)
        
        return UploadResponse(
            message=f"Successfully processed {file.filename}",
            documents_processed=1,
            chunks_created=len(chunks)
        )
    
    finally:
        # Cleanup
        os.unlink(tmp_path)

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    """Ask a question"""
    
    if vector_store.vectorstore is None:
        raise HTTPException(
            status_code=400,
            detail="No documents uploaded yet"
        )
    
    try:
        session = get_session(request.session_id)
        result = session.ask(request.question)
        
        return AnswerResponse(
            answer=result["answer"],
            sources=[
                {
                    "content": doc.page_content[:200] + "...",
                    "metadata": doc.metadata
                }
                for doc in result["sources"]
            ],
            session_id=request.session_id
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear-session/{session_id}")
async def clear_session(session_id: str):
    """Clear conversation history for a session"""
    if session_id in sessions:
        sessions[session_id].clear_history()
    return {"message": f"Session {session_id} cleared"}

@app.delete("/documents")
async def delete_all_documents():
    """Delete all documents and reset"""
    vector_store.delete()
    sessions.clear()
    return {"message": "All documents deleted"}

# ============================================
# RUN
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Streamlit Frontend

```python
"""
Streamlit Frontend for Q&A App
"""

import streamlit as st
import requests
import uuid

# ============================================
# CONFIG
# ============================================

API_URL = "http://localhost:8000"

# Page config
st.set_page_config(
    page_title="Document Q&A",
    page_icon="❓",
    layout="wide"
)

# ============================================
# SESSION STATE
# ============================================

if "session_id" not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())

if "messages" not in st.session_state:
    st.session_state.messages = []

if "documents_uploaded" not in st.session_state:
    st.session_state.documents_uploaded = 0

# ============================================
# SIDEBAR
# ============================================

with st.sidebar:
    st.title("📄 Document Q&A")
    st.markdown("---")
    
    # File upload
    st.subheader("Upload Documents")
    
    uploaded_files = st.file_uploader(
        "Choose files",
        type=["pdf", "txt", "csv"],
        accept_multiple_files=True
    )
    
    if uploaded_files:
        if st.button("Process Documents"):
            with st.spinner("Processing..."):
                for file in uploaded_files:
                    try:
                        files = {"file": (file.name, file.getvalue())}
                        response = requests.post(
                            f"{API_URL}/upload",
                            files=files
                        )
                        
                        if response.status_code == 200:
                            result = response.json()
                            st.success(f"✅ {file.name}: {result['chunks_created']} chunks")
                            st.session_state.documents_uploaded += 1
                        else:
                            st.error(f"❌ {file.name}: {response.json()['detail']}")
                    
                    except Exception as e:
                        st.error(f"❌ Error: {e}")
    
    st.markdown("---")
    
    # Stats
    st.subheader("Stats")
    st.metric("Documents Uploaded", st.session_state.documents_uploaded)
    st.metric("Messages", len(st.session_state.messages))
    
    # Clear buttons
    if st.button("Clear Conversation"):
        st.session_state.messages = []
        requests.post(f"{API_URL}/clear-session/{st.session_state.session_id}")
        st.rerun()
    
    if st.button("Delete All Documents"):
        requests.delete(f"{API_URL}/documents")
        st.session_state.documents_uploaded = 0
        st.session_state.messages = []
        st.success("All documents deleted")
        st.rerun()

# ============================================
# MAIN CHAT INTERFACE
# ============================================

st.title("❓ Ask Questions About Your Documents")

# Check if documents uploaded
if st.session_state.documents_uploaded == 0:
    st.info("👈 Upload documents using the sidebar to get started")

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        
        if message.get("sources"):
            with st.expander("📚 Sources"):
                for i, source in enumerate(message["sources"], 1):
                    st.markdown(f"**Source {i}:**")
                    st.markdown(f"> {source['content']}")
                    if source.get("metadata"):
                        st.caption(f"Page: {source['metadata'].get('page', 'N/A')}")

# Chat input
if question := st.chat_input("Ask a question..."):
    # Add user message
    st.session_state.messages.append({
        "role": "user",
        "content": question
    })
    
    with st.chat_message("user"):
        st.markdown(question)
    
    # Get answer
    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            try:
                response = requests.post(
                    f"{API_URL}/ask",
                    json={
                        "question": question,
                        "session_id": st.session_state.session_id
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    answer = result["answer"]
                    sources = result["sources"]
                    
                    st.markdown(answer)
                    
                    if sources:
                        with st.expander("📚 Sources"):
                            for i, source in enumerate(sources, 1):
                                st.markdown(f"**Source {i}:**")
                                st.markdown(f"> {source['content']}")
                    
                    # Add to history
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": answer,
                        "sources": sources
                    })
                
                else:
                    error = response.json().get("detail", "Unknown error")
                    st.error(f"Error: {error}")
            
            except Exception as e:
                st.error(f"Error: {e}")
```

---

## 🔧 Advanced Features

### Re-ranking Retrieved Documents

```python
"""
Re-ranking: Improve retrieval quality
"""

from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor
from langchain_cohere import CohereRerank

# ============================================
# LLM-BASED COMPRESSION
# ============================================

def create_compression_retriever(base_retriever, llm):
    """Compress retrieved docs to most relevant parts"""
    
    compressor = LLMChainExtractor.from_llm(llm)
    
    return ContextualCompressionRetriever(
        base_compressor=compressor,
        base_retriever=base_retriever
    )

# ============================================
# COHERE RERANKING
# ============================================

def create_rerank_retriever(base_retriever, top_n: int = 3):
    """Rerank with Cohere"""
    
    compressor = CohereRerank(top_n=top_n)
    
    return ContextualCompressionRetriever(
        base_compressor=compressor,
        base_retriever=base_retriever
    )

# ============================================
# HYBRID SEARCH
# ============================================

from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever

def create_hybrid_retriever(documents, vector_retriever):
    """Combine keyword (BM25) and semantic search"""
    
    # BM25 for keyword matching
    bm25_retriever = BM25Retriever.from_documents(documents)
    bm25_retriever.k = 4
    
    # Combine with weights
    ensemble_retriever = EnsembleRetriever(
        retrievers=[bm25_retriever, vector_retriever],
        weights=[0.3, 0.7]  # 30% keyword, 70% semantic
    )
    
    return ensemble_retriever
```

### Query Transformation

```python
"""
Query Transformation: Better retrieval
"""

from langchain.retrievers.multi_query import MultiQueryRetriever

# ============================================
# MULTI-QUERY RETRIEVAL
# ============================================

def create_multi_query_retriever(base_retriever, llm):
    """Generate multiple queries for better coverage"""
    
    return MultiQueryRetriever.from_llm(
        retriever=base_retriever,
        llm=llm
    )

# ============================================
# QUERY DECOMPOSITION
# ============================================

def decompose_query(query: str, llm) -> list[str]:
    """Break complex query into sub-queries"""
    
    prompt = f"""Break this complex question into simpler sub-questions:

Question: {query}

Return a numbered list of simpler questions that, when answered together, 
would answer the original question.
"""
    
    response = llm.invoke(prompt)
    
    # Parse numbered list
    lines = response.content.strip().split("\n")
    sub_queries = [
        line.split(". ", 1)[1] 
        for line in lines 
        if ". " in line
    ]
    
    return sub_queries

# ============================================
# HYPOTHETICAL DOCUMENT EMBEDDINGS (HyDE)
# ============================================

def hyde_retrieval(query: str, retriever, llm):
    """Generate hypothetical answer, then search"""
    
    # Generate hypothetical answer
    prompt = f"""Write a detailed passage that would answer this question:
Question: {query}

Passage:"""
    
    hypothetical_answer = llm.invoke(prompt).content
    
    # Search using hypothetical answer
    return retriever.invoke(hypothetical_answer)
```

### Evaluation Metrics

```python
"""
Evaluation: Measure Q&A quality
"""

from typing import List, Dict
import numpy as np

# ============================================
# EVALUATION METRICS
# ============================================

def evaluate_retrieval(
    queries: List[str],
    retrieved_docs: List[List[dict]],
    relevant_docs: List[List[str]]
) -> dict:
    """Evaluate retrieval quality"""
    
    precisions = []
    recalls = []
    
    for query, retrieved, relevant in zip(queries, retrieved_docs, relevant_docs):
        retrieved_ids = [d.get("id") for d in retrieved]
        
        # Precision@K
        hits = sum(1 for rid in retrieved_ids if rid in relevant)
        precision = hits / len(retrieved_ids) if retrieved_ids else 0
        precisions.append(precision)
        
        # Recall@K
        recall = hits / len(relevant) if relevant else 0
        recalls.append(recall)
    
    return {
        "precision@k": np.mean(precisions),
        "recall@k": np.mean(recalls),
        "f1": 2 * (np.mean(precisions) * np.mean(recalls)) / 
              (np.mean(precisions) + np.mean(recalls) + 1e-8)
    }

def evaluate_generation(
    questions: List[str],
    generated_answers: List[str],
    ground_truth: List[str],
    contexts: List[str],
    llm
) -> dict:
    """Evaluate generation quality using LLM"""
    
    scores = {
        "relevance": [],
        "faithfulness": [],
        "correctness": []
    }
    
    for q, gen, truth, ctx in zip(questions, generated_answers, ground_truth, contexts):
        
        # Relevance: Does answer address the question?
        relevance_prompt = f"""Rate how well the answer addresses the question (0-1):
Question: {q}
Answer: {gen}
Score:"""
        relevance = float(llm.invoke(relevance_prompt).content.strip())
        scores["relevance"].append(relevance)
        
        # Faithfulness: Is answer grounded in context?
        faithfulness_prompt = f"""Rate if the answer is supported by the context (0-1):
Context: {ctx}
Answer: {gen}
Score:"""
        faithfulness = float(llm.invoke(faithfulness_prompt).content.strip())
        scores["faithfulness"].append(faithfulness)
        
        # Correctness: Does answer match ground truth?
        if truth:
            correctness_prompt = f"""Rate answer correctness vs ground truth (0-1):
Ground Truth: {truth}
Answer: {gen}
Score:"""
            correctness = float(llm.invoke(correctness_prompt).content.strip())
            scores["correctness"].append(correctness)
    
    return {
        metric: np.mean(values)
        for metric, values in scores.items()
        if values
    }

# ============================================
# RAGAS EVALUATION
# ============================================

# Using RAGAS library for comprehensive evaluation
# pip install ragas

from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall
)

def evaluate_with_ragas(dataset):
    """Evaluate using RAGAS framework"""
    
    result = evaluate(
        dataset,
        metrics=[
            faithfulness,
            answer_relevancy,
            context_precision,
            context_recall
        ]
    )
    
    return result
```

---

## 🚀 Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy code
COPY . .

# Expose port
EXPOSE 8000

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./chroma_db:/app/chroma_db
  
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.streamlit
    ports:
      - "8501:8501"
    environment:
      - API_URL=http://api:8000
    depends_on:
      - api
```

### Cloud Deployment Checklist

```
Production Checklist:
├── Security
│   ├── API authentication
│   ├── Input validation
│   ├── Rate limiting
│   └── HTTPS only
│
├── Performance
│   ├── Caching (Redis)
│   ├── Connection pooling
│   ├── Async processing
│   └── Load balancing
│
├── Reliability
│   ├── Health checks
│   ├── Error handling
│   ├── Logging
│   └── Monitoring
│
├── Scalability
│   ├── Horizontal scaling
│   ├── Database scaling
│   ├── Vector DB scaling
│   └── CDN for static
│
└── Cost Optimization
    ├── Caching LLM responses
    ├── Embedding batch processing
    ├── Smaller models when possible
    └── Usage monitoring
```

---

## 📊 Complete Project Code

```python
"""
Complete Q&A Application
All components in one file for reference
"""

# Full implementation combining all above components
# See the separate files in the project structure

# Project Structure:
# qa_app/
# ├── backend/
# │   ├── __init__.py
# │   ├── main.py           # FastAPI app
# │   ├── document_processor.py
# │   ├── vector_store.py
# │   ├── rag_chain.py
# │   └── config.py
# ├── frontend/
# │   ├── app.py            # Streamlit app
# │   └── components/
# ├── tests/
# │   ├── test_processor.py
# │   ├── test_retrieval.py
# │   └── test_generation.py
# ├── docker-compose.yml
# ├── Dockerfile
# ├── requirements.txt
# └── README.md
```

---

## ❓ Interview Questions

### Beginner Level

**Q1: What is RAG and why is it used for Q&A?**

> **A:** RAG (Retrieval-Augmented Generation) combines retrieval and generation:
> 1. **Retrieval:** Find relevant documents for the question
> 2. **Generation:** Generate answer using retrieved context
>
> Benefits:
> - Answers grounded in actual documents
> - Reduces hallucination
> - Can answer questions about private data

**Q2: What is the purpose of chunking documents?**

> **A:** Chunking breaks large documents into smaller pieces because:
> 1. Embedding models have token limits
> 2. Smaller chunks = more precise retrieval
> 3. LLM context windows are limited
> 4. Better semantic matching on focused content

**Q3: How do you measure Q&A system quality?**

> **A:** Key metrics:
> - **Retrieval:** Precision, Recall, MRR
> - **Generation:** Relevance, Faithfulness, Correctness
> - **Overall:** User satisfaction, task completion rate

### Intermediate Level

**Q4: How do you handle questions that can't be answered from the documents?**

> **A:** Multiple strategies:
> 1. **Confidence thresholds:** Check retrieval scores
> 2. **Explicit instruction:** Tell LLM to say "I don't know"
> 3. **Verification chain:** Verify answer is grounded
> 4. **Fallback:** Redirect to human or web search

**Q5: How would you improve retrieval quality?**

> **A:** Techniques:
> 1. **Better chunking:** Semantic chunking, overlap
> 2. **Hybrid search:** Combine BM25 + semantic
> 3. **Re-ranking:** Score and re-order results
> 4. **Query expansion:** Multiple query variants
> 5. **Fine-tuned embeddings:** Domain-specific

**Q6: How do you handle multi-hop questions?**

> **A:** Multi-hop questions require combining information:
>
> 1. **Decomposition:** Break into sub-questions
> 2. **Iterative retrieval:** Retrieve for each sub-question
> 3. **Chain-of-thought:** Step-by-step reasoning
> 4. **Knowledge graphs:** Follow relationships

### Advanced Level

**Q7: Design a Q&A system for 1M documents.**

> **A:** Architecture considerations:
>
> - **Vector DB:** Use scalable option (Pinecone, Weaviate)
> - **Chunking:** Smaller chunks, better compression
> - **Indexing:** HNSW for fast approximate search
> - **Caching:** Cache frequent queries
> - **Sharding:** Distribute across nodes
> - **Tiered storage:** Hot/warm/cold data

**Q8: How do you handle documents that update frequently?**

> **A:** Strategies:
> 1. **Incremental indexing:** Update only changed chunks
> 2. **Versioning:** Track document versions
> 3. **TTL:** Expire old embeddings
> 4. **Change detection:** Monitor for updates
> 5. **Metadata:** Store update timestamps

### FAANG Level

**Q9: Design an enterprise Q&A system with access control.**

> **A:** Architecture:
> ```
> Authentication → User Context → Filtered Retrieval → Answer
> ```
>
> Key features:
> - Per-document permissions
> - Metadata filtering at query time
> - Audit logging
> - Rate limiting per user/team
> - Data isolation (multi-tenant)

**Q10: How would you implement semantic caching for Q&A?**

> **A:** Semantic caching strategy:
>
> 1. **Embed query:** Get query embedding
> 2. **Cache lookup:** Find similar cached queries
> 3. **Similarity threshold:** If above threshold, return cached
> 4. **Cache miss:** Generate new answer, cache it
>
> Benefits: Reduce LLM costs, faster responses
>
> Challenges: Cache invalidation when docs change

---

## 📝 Homework

### Easy

1. Build a basic Q&A app with 3 PDF documents
2. Add conversation history (last 5 turns)
3. Display source documents for each answer

### Medium

4. Implement re-ranking with Cohere
5. Add hybrid search (BM25 + semantic)
6. Create evaluation pipeline with 20 test questions

### Hard

7. Implement multi-query retrieval
8. Add document access control
9. Deploy to cloud with monitoring

### Expert

10. Build enterprise Q&A with:
    - Multi-tenant support
    - Access control
    - Audit logging
    - Analytics dashboard

11. Implement semantic caching:
    - Cache similar queries
    - Invalidate on document updates
    - Measure hit rate

---

## 🎯 Key Takeaways

```
Q&A System Components:
├── Document Processing: Load, chunk, embed
├── Vector Store: Index and search
├── Retrieval: Find relevant context
├── Generation: Answer from context
└── Evaluation: Measure quality

Best Practices:
├── Chunk wisely (size, overlap)
├── Use hybrid search
├── Ground answers in context
├── Return sources
├── Handle "I don't know"
└── Cache aggressively

Production Considerations:
├── Scalability: Vector DB choice
├── Quality: Re-ranking, evaluation
├── Cost: Caching, smaller models
├── Security: Access control, audit
└── UX: Fast responses, clear sources
```

---

**Congratulations! You've completed Week 4: Fine-Tuning & Agents!** 🎉

**Key Skills Learned:**
- ✅ Fine-tuning LLMs (LoRA, QLoRA)
- ✅ HuggingFace ecosystem
- ✅ LangChain for AI applications
- ✅ LangGraph for stateful workflows
- ✅ Building AI Agents
- ✅ Complete Q&A Application

**Next:** [Week-5: Vector DB & RAG](../Week-5-Vector-DB-and-RAG/) - Deep dive into retrieval systems! 📚
