# 📘 Mini Project: Q&A Application


## 📑 Table of Contents

- [🎯 **Project Overview:**](#project-overview)
- [**Phase 1: Core Backend (MVP)**](#phase-1-core-backend-mvp)
- [**Phase 2: API Layer**](#phase-2-api-layer)
- [**Phase 3: Frontend**](#phase-3-frontend)
- [**Phase 4: Advanced Features**](#phase-4-advanced-features)
- [**Phase 5: Deployment**](#phase-5-deployment)
- [**Testing:**](#testing)
- [**Performance Optimization:**](#performance-optimization)
- [**🎉 Project Complete!**](#project-complete)

---

## 🎯 **Project Overview:**

### **What We're Building:**

```javascript
const project_vision = {
  name: 'Document Q&A Application',
  
  description: 'Production-ready web app that answers questions from your documents',
  
  features: {
    core: [
      'Upload PDF, TXT, DOCX documents',
      'Ask questions in natural language',
      'Get accurate answers with source citations',
      'Conversational memory (multi-turn dialogue)',
      'Fast semantic search'
    ],
    
    advanced: [
      'Multiple document support',
      'Real-time streaming responses',
      'Chat history persistence',
      'User authentication',
      'Document management UI'
    ]
  },
  
  tech_stack: {
    backend: 'Python (FastAPI or Flask)',
    llm: 'OpenAI GPT-4 or local LLaMA',
    embeddings: 'OpenAI embeddings or sentence-transformers',
    vector_db: 'ChromaDB or Pinecone',
    frontend: 'HTML/CSS/JavaScript or React',
    framework: 'LangChain'
  },
  
  learning_outcomes: [
    'End-to-end LLM application',
    'RAG (Retrieval-Augmented Generation)',
    'Vector databases in practice',
    'Production deployment patterns',
    'User interface for AI'
  ]
};
```

---

## **Phase 1: Core Backend (MVP)**

### **Architecture:**

```
┌─────────────────────────────────────────────┐
│          USER INTERFACE                     │
│   Upload docs | Ask questions | View chat   │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│         API LAYER (FastAPI)                 │
│  /upload   /ask   /history                  │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│      DOCUMENT PROCESSOR                     │
│  Load → Chunk → Embed → Store               │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│      VECTOR DATABASE (ChromaDB)             │
│  Store document embeddings                  │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│      Q&A CHAIN (LangChain)                  │
│  Retrieve → Augment → Generate              │
└─────────────────────────────────────────────┘
```

### **Step 1: Setup and Dependencies**

```python
# requirements.txt
langchain==0.1.0
openai==1.0.0
chromadb==0.4.0
fastapi==0.104.0
uvicorn==0.24.0
python-multipart==0.0.6
pypdf==3.17.0
python-docx==1.0.0
sentence-transformers==2.2.2  # For local embeddings
pydantic==2.5.0
```

```bash
# Install
pip install -r requirements.txt

# Setup
mkdir qa_app
cd qa_app
mkdir src data uploads
touch src/__init__.py
```

### **Step 2: Document Processing**

```python
# src/document_processor.py

from langchain.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from typing import List
import os

class DocumentProcessor:
    """
    Load, chunk, and prepare documents for embedding
    """
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""]
        )
    
    def load_document(self, file_path: str):
        """
        Load document based on file extension
        """
        ext = os.path.splitext(file_path)[1].lower()
        
        loaders = {
            '.pdf': PyPDFLoader,
            '.txt': TextLoader,
            '.docx': Docx2txtLoader
        }
        
        loader_class = loaders.get(ext)
        if not loader_class:
            raise ValueError(f"Unsupported file type: {ext}")
        
        loader = loader_class(file_path)
        documents = loader.load()
        
        return documents
    
    def chunk_documents(self, documents):
        """
        Split documents into smaller chunks
        """
        chunks = self.text_splitter.split_documents(documents)
        
        # Add metadata
        for i, chunk in enumerate(chunks):
            chunk.metadata['chunk_id'] = i
            chunk.metadata['source'] = chunk.metadata.get('source', 'unknown')
        
        return chunks
    
    def process_file(self, file_path: str):
        """
        Full processing pipeline
        """
        print(f"Loading {file_path}...")
        documents = self.load_document(file_path)
        
        print(f"Chunking {len(documents)} documents...")
        chunks = self.chunk_documents(documents)
        
        print(f"Created {len(chunks)} chunks")
        return chunks


# Example usage
if __name__ == "__main__":
    processor = DocumentProcessor()
    
    # Test with sample document
    chunks = processor.process_file("sample.pdf")
    
    # Inspect
    print(f"\nFirst chunk:")
    print(f"Content: {chunks[0].page_content[:200]}...")
    print(f"Metadata: {chunks[0].metadata}")
```

### **Step 3: Vector Store**

```python
# src/vector_store.py

from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
import chromadb
from typing import List
import os

class VectorStore:
    """
    Manage vector database for document embeddings
    """
    
    def __init__(
        self,
        persist_directory: str = "./data/chroma_db",
        embedding_model: str = "text-embedding-ada-002"
    ):
        self.persist_directory = persist_directory
        self.embeddings = OpenAIEmbeddings(model=embedding_model)
        self.vectorstore = None
    
    def create_from_documents(self, documents):
        """
        Create new vector store from documents
        """
        print("Creating embeddings...")
        
        self.vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=self.persist_directory
        )
        
        self.vectorstore.persist()
        print(f"Stored {len(documents)} documents")
        
        return self.vectorstore
    
    def load_existing(self):
        """
        Load existing vector store
        """
        if not os.path.exists(self.persist_directory):
            raise ValueError("No existing vector store found")
        
        self.vectorstore = Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings
        )
        
        return self.vectorstore
    
    def add_documents(self, documents):
        """
        Add more documents to existing store
        """
        if not self.vectorstore:
            return self.create_from_documents(documents)
        
        self.vectorstore.add_documents(documents)
        self.vectorstore.persist()
        
        print(f"Added {len(documents)} documents")
    
    def similarity_search(self, query: str, k: int = 4):
        """
        Find most similar documents
        """
        if not self.vectorstore:
            raise ValueError("Vector store not initialized")
        
        results = self.vectorstore.similarity_search(query, k=k)
        return results
    
    def similarity_search_with_score(self, query: str, k: int = 4):
        """
        Search with relevance scores
        """
        results = self.vectorstore.similarity_search_with_score(query, k=k)
        return results
    
    def as_retriever(self, **kwargs):
        """
        Return as retriever for LangChain
        """
        return self.vectorstore.as_retriever(**kwargs)


# Example usage
if __name__ == "__main__":
    from document_processor import DocumentProcessor
    
    # Process document
    processor = DocumentProcessor()
    chunks = processor.process_file("sample.pdf")
    
    # Create vector store
    store = VectorStore()
    store.create_from_documents(chunks)
    
    # Test search
    results = store.similarity_search("What is LangChain?")
    print(f"\nFound {len(results)} results:")
    for i, doc in enumerate(results):
        print(f"\n{i+1}. {doc.page_content[:200]}...")
```

### **Step 4: Q&A Chain**

```python
# src/qa_chain.py

from langchain.chains import ConversationalRetrievalChain
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from typing import Dict, List

class QAChain:
    """
    Question-answering chain with conversational memory
    """
    
    def __init__(self, vectorstore, model_name: str = "gpt-4"):
        self.llm = ChatOpenAI(
            model_name=model_name,
            temperature=0
        )
        
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )
        
        # Custom prompt
        self.prompt = PromptTemplate(
            template="""
You are a helpful AI assistant. Answer the question based on the context provided.
If you don't know the answer, say "I don't have enough information to answer that."

Context:
{context}

Question: {question}

Answer: Let me help you with that.
""",
            input_variables=["context", "question"]
        )
        
        # Create chain
        self.chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 4}
            ),
            memory=self.memory,
            return_source_documents=True,
            verbose=True
        )
    
    def ask(self, question: str) -> Dict:
        """
        Ask a question and get answer with sources
        """
        result = self.chain({"question": question})
        
        # Format response
        return {
            "answer": result["answer"],
            "sources": [
                {
                    "content": doc.page_content,
                    "metadata": doc.metadata
                }
                for doc in result["source_documents"]
            ],
            "chat_history": self.get_chat_history()
        }
    
    def get_chat_history(self) -> List[Dict]:
        """
        Get formatted chat history
        """
        history = []
        
        if hasattr(self.memory, 'chat_memory'):
            for msg in self.memory.chat_memory.messages:
                history.append({
                    "role": msg.type,
                    "content": msg.content
                })
        
        return history
    
    def clear_history(self):
        """
        Clear conversation memory
        """
        self.memory.clear()


# Example usage
if __name__ == "__main__":
    from vector_store import VectorStore
    from document_processor import DocumentProcessor
    
    # Setup
    processor = DocumentProcessor()
    chunks = processor.process_file("sample.pdf")
    
    store = VectorStore()
    store.create_from_documents(chunks)
    
    # Create QA chain
    qa = QAChain(store.vectorstore)
    
    # Ask questions
    questions = [
        "What is this document about?",
        "Can you summarize the main points?",
        "Tell me more about the first point you mentioned"  # Tests memory!
    ]
    
    for q in questions:
        print(f"\n🙋 Question: {q}")
        response = qa.ask(q)
        print(f"🤖 Answer: {response['answer']}")
        print(f"📚 Sources: {len(response['sources'])} documents used")
```

---

## **Phase 2: API Layer**

### **FastAPI Backend:**

```python
# src/api.py

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
from datetime import datetime

from document_processor import DocumentProcessor
from vector_store import VectorStore
from qa_chain import QAChain

app = FastAPI(title="Q&A Application API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
processor = DocumentProcessor()
store = VectorStore()
qa_chain = None

# Models
class Question(BaseModel):
    question: str
    session_id: Optional[str] = "default"

class Answer(BaseModel):
    answer: str
    sources: List[dict]
    chat_history: List[dict]

# Endpoints
@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process a document
    """
    try:
        # Save uploaded file
        upload_dir = "./uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process document
        chunks = processor.process_file(file_path)
        
        # Add to vector store
        global qa_chain
        if not store.vectorstore:
            store.create_from_documents(chunks)
        else:
            store.add_documents(chunks)
        
        # Initialize QA chain if not exists
        if not qa_chain:
            qa_chain = QAChain(store.vectorstore)
        
        return {
            "message": "Document uploaded successfully",
            "filename": file.filename,
            "chunks": len(chunks),
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask", response_model=Answer)
async def ask_question(question: Question):
    """
    Ask a question about uploaded documents
    """
    global qa_chain
    
    if not qa_chain:
        raise HTTPException(
            status_code=400,
            detail="No documents uploaded yet"
        )
    
    try:
        result = qa_chain.ask(question.question)
        return Answer(**result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history")
async def get_history():
    """
    Get chat history
    """
    global qa_chain
    
    if not qa_chain:
        return {"history": []}
    
    return {"history": qa_chain.get_chat_history()}


@app.post("/clear")
async def clear_history():
    """
    Clear chat history
    """
    global qa_chain
    
    if qa_chain:
        qa_chain.clear_history()
    
    return {"message": "History cleared"}


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "documents_loaded": store.vectorstore is not None,
        "qa_ready": qa_chain is not None
    }


# Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## **Phase 3: Frontend**

### **Simple HTML/CSS/JS UI:**

```html
<!-- static/index.html -->

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Q&A</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .main-content {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 20px;
        }

        .sidebar {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .chat-container {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            height: 600px;
        }

        .upload-section {
            margin-bottom: 20px;
        }

        .upload-section h3 {
            margin-bottom: 10px;
            color: #333;
        }

        .file-input {
            display: none;
        }

        .upload-btn {
            width: 100%;
            padding: 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.3s;
        }

        .upload-btn:hover {
            background: #5568d3;
        }

        .uploaded-files {
            margin-top: 15px;
        }

        .file-item {
            padding: 8px;
            background: #f3f4f6;
            border-radius: 6px;
            margin-bottom: 8px;
            font-size: 0.9rem;
        }

        .messages {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 20px;
            padding: 10px;
        }

        .message {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 12px;
            max-width: 80%;
        }

        .message.user {
            background: #667eea;
            color: white;
            margin-left: auto;
        }

        .message.assistant {
            background: #f3f4f6;
            color: #333;
        }

        .message.assistant .sources {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            font-size: 0.85rem;
            color: #666;
        }

        .input-section {
            display: flex;
            gap: 10px;
        }

        .input-section input {
            flex: 1;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 1rem;
        }

        .input-section button {
            padding: 12px 24px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.3s;
        }

        .input-section button:hover {
            background: #5568d3;
        }

        .input-section button:disabled {
            background: #cbd5e0;
            cursor: not-allowed;
        }

        .loading {
            display: none;
            text-align: center;
            padding: 20px;
            color: #666;
        }

        .loading.show {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 Document Q&A</h1>
            <p>Upload documents and ask questions</p>
        </div>

        <div class="main-content">
            <!-- Sidebar -->
            <div class="sidebar">
                <div class="upload-section">
                    <h3>Upload Documents</h3>
                    <input type="file" id="fileInput" class="file-input" accept=".pdf,.txt,.docx" multiple>
                    <button class="upload-btn" onclick="document.getElementById('fileInput').click()">
                        Choose Files
                    </button>
                    
                    <div class="uploaded-files" id="uploadedFiles">
                        <small>No files uploaded yet</small>
                    </div>
                </div>

                <button class="upload-btn" onclick="clearHistory()" style="background: #ef4444; margin-top: 10px;">
                    Clear Chat
                </button>
            </div>

            <!-- Chat -->
            <div class="chat-container">
                <div class="messages" id="messages">
                    <div class="message assistant">
                        <strong>Assistant:</strong>
                        <p>Hello! Upload some documents and I'll answer questions about them.</p>
                    </div>
                </div>

                <div class="loading" id="loading">
                    <p>⏳ Processing...</p>
                </div>

                <div class="input-section">
                    <input 
                        type="text" 
                        id="questionInput" 
                        placeholder="Ask a question..." 
                        onkeypress="handleKeyPress(event)"
                    >
                    <button onclick="askQuestion()" id="sendBtn">Send</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const API_URL = 'http://localhost:8000';
        let uploadedFiles = [];

        // File upload handler
        document.getElementById('fileInput').addEventListener('change', async (e) => {
            const files = e.target.files;
            
            for (let file of files) {
                await uploadFile(file);
            }
        });

        async function uploadFile(file) {
            const formData = new FormData();
            formData.append('file', file);

            showLoading(true);

            try {
                const response = await fetch(`${API_URL}/upload`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                uploadedFiles.push({
                    name: file.name,
                    chunks: data.chunks
                });

                updateUploadedFilesList();
                addMessage('assistant', `✅ Uploaded "${file.name}" (${data.chunks} chunks)`);
            } catch (error) {
                addMessage('assistant', `❌ Error uploading file: ${error.message}`);
            } finally {
                showLoading(false);
            }
        }

        function updateUploadedFilesList() {
            const container = document.getElementById('uploadedFiles');
            
            if (uploadedFiles.length === 0) {
                container.innerHTML = '<small>No files uploaded yet</small>';
                return;
            }

            container.innerHTML = uploadedFiles.map(file => `
                <div class="file-item">
                    📄 ${file.name}<br>
                    <small>${file.chunks} chunks</small>
                </div>
            `).join('');
        }

        async function askQuestion() {
            const input = document.getElementById('questionInput');
            const question = input.value.trim();

            if (!question) return;

            if (uploadedFiles.length === 0) {
                addMessage('assistant', '⚠️ Please upload documents first!');
                return;
            }

            // Add user message
            addMessage('user', question);
            input.value = '';

            showLoading(true);

            try {
                const response = await fetch(`${API_URL}/ask`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ question })
                });

                const data = await response.json();
                
                // Add assistant response with sources
                addMessage('assistant', data.answer, data.sources);
            } catch (error) {
                addMessage('assistant', `❌ Error: ${error.message}`);
            } finally {
                showLoading(false);
            }
        }

        function addMessage(role, content, sources = null) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${role}`;

            let html = `<strong>${role === 'user' ? 'You' : 'Assistant'}:</strong><p>${content}</p>`;

            if (sources && sources.length > 0) {
                html += '<div class="sources">';
                html += '<strong>📚 Sources:</strong><br>';
                sources.slice(0, 2).forEach((source, i) => {
                    html += `${i + 1}. ${source.content.substring(0, 100)}...<br>`;
                });
                html += '</div>';
            }

            messageDiv.innerHTML = html;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        async function clearHistory() {
            try {
                await fetch(`${API_URL}/clear`, { method: 'POST' });
                
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML = `
                    <div class="message assistant">
                        <strong>Assistant:</strong>
                        <p>Chat history cleared. Ask me anything about your documents!</p>
                    </div>
                `;
            } catch (error) {
                console.error('Error clearing history:', error);
            }
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                askQuestion();
            }
        }

        function showLoading(show) {
            const loading = document.getElementById('loading');
            const sendBtn = document.getElementById('sendBtn');
            
            if (show) {
                loading.classList.add('show');
                sendBtn.disabled = true;
            } else {
                loading.classList.remove('show');
                sendBtn.disabled = false;
            }
        }
    </script>
</body>
</html>
```

---

## **Phase 4: Advanced Features**

### **1. Streaming Responses:**

```python
# src/streaming_qa.py

from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.callbacks.base import BaseCallbackHandler

class StreamingHandler(BaseCallbackHandler):
    def __init__(self):
        self.text = ""
    
    def on_llm_new_token(self, token: str, **kwargs):
        self.text += token
        print(token, end="", flush=True)

# In api.py, add streaming endpoint
@app.get("/ask_stream")
async def ask_question_stream(question: str):
    from fastapi.responses import StreamingResponse
    
    async def generate():
        handler = StreamingHandler()
        # Configure chain with streaming handler
        # Yield tokens as they come
        pass
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

### **2. Multiple Collections:**

```python
# Support multiple document collections (projects)

class MultiCollectionStore:
    def __init__(self):
        self.collections = {}
    
    def create_collection(self, name: str):
        self.collections[name] = VectorStore(
            persist_directory=f"./data/{name}"
        )
    
    def get_collection(self, name: str):
        return self.collections.get(name)
    
    def list_collections(self):
        return list(self.collections.keys())
```

### **3. Authentication:**

```python
# Add JWT authentication

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

security = HTTPBearer()

@app.post("/ask")
async def ask_question(
    question: Question,
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    # Verify token
    token = credentials.credentials
    # ... verify JWT ...
    
    # Then process question
    pass
```

### **4. Caching:**

```python
# Cache frequently asked questions

from functools import lru_cache
import hashlib

cache = {}

def get_cache_key(question: str) -> str:
    return hashlib.md5(question.encode()).hexdigest()

@app.post("/ask")
async def ask_question(question: Question):
    cache_key = get_cache_key(question.question)
    
    if cache_key in cache:
        return cache[cache_key]
    
    result = qa_chain.ask(question.question)
    cache[cache_key] = result
    
    return result
```

---

## **Phase 5: Deployment**

### **1. Docker Setup:**

```dockerfile
# Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY src/ ./src/
COPY static/ ./static/

# Create data directories
RUN mkdir -p /app/data /app/uploads

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml

version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
```

### **2. Environment Variables:**

```bash
# .env

OPENAI_API_KEY=your_api_key_here
MODEL_NAME=gpt-4
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_TOKENS=500
```

### **3. Production Considerations:**

```python
# src/config.py

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    model_name: str = "gpt-4"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    max_tokens: int = 500
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## **Testing:**

```python
# tests/test_api.py

import pytest
from fastapi.testclient import TestClient
from src.api import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_upload_document():
    files = {"file": ("test.txt", b"Test content", "text/plain")}
    response = client.post("/upload", files=files)
    assert response.status_code == 200
    assert "chunks" in response.json()

def test_ask_question():
    # Upload first
    files = {"file": ("test.txt", b"Paris is the capital of France.", "text/plain")}
    client.post("/upload", files=files)
    
    # Ask question
    response = client.post(
        "/ask",
        json={"question": "What is the capital of France?"}
    )
    assert response.status_code == 200
    assert "answer" in response.json()
    assert "Paris" in response.json()["answer"]
```

---

## **Performance Optimization:**

```python
# 1. Batch processing for large documents
def process_large_file(file_path: str, batch_size: int = 100):
    chunks = processor.process_file(file_path)
    
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i+batch_size]
        store.add_documents(batch)

# 2. Async processing
import asyncio

async def process_multiple_files(file_paths: List[str]):
    tasks = [process_file_async(path) for path in file_paths]
    await asyncio.gather(*tasks)

# 3. Connection pooling for vector DB
# 4. Redis caching for frequent queries
# 5. Load balancing with multiple instances
```

---

## **🎉 Project Complete!**

### **What You've Built:**

```javascript
const achievements = {
  technical: [
    '✅ Full-stack LLM application',
    '✅ Document processing pipeline',
    '✅ Vector database integration',
    '✅ Conversational Q&A system',
    '✅ REST API with FastAPI',
    '✅ Interactive web UI',
    '✅ Production deployment setup'
  ],
  
  skills_learned: [
    'RAG architecture',
    'LangChain framework',
    'Vector embeddings',
    'API design',
    'Frontend integration',
    'Docker deployment'
  ],
  
  next_steps: [
    'Add user authentication',
    'Implement multi-tenancy',
    'Add analytics dashboard',
    'Optimize for large documents',
    'Deploy to cloud (AWS/GCP/Azure)',
    'Add monitoring and logging'
  ]
};
```

---

**🚀 Congratulations!**

You now have a **production-ready Q&A application** that demonstrates:
- End-to-end LLM development
- Real-world AI application architecture
- Modern development practices
- Deployment readiness

**Portfolio Project:** This is a complete, working application you can showcase to employers!

---

**🎓 Week 4 Complete!**

You've mastered:
1. ✅ Pre-training vs Fine-tuning
2. ✅ LoRA & QLoRA
3. ✅ Hugging Face ecosystem
4. ✅ Summarization & QA
5. ✅ LangChain framework
6. ✅ LangGraph workflows
7. ✅ AI Agents
8. ✅ Production Q&A App

**Next:** **Week 5 - Vector DBs & RAG** 🚀
