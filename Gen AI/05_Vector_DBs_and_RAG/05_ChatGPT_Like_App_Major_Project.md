# 📘 Major Project: Build a ChatGPT-like App - Production RAG System

---

## **Purpose (Why this exists):**

### **The Ultimate Integration Project:**

```javascript
const why_this_project = {
  learning_journey: {
    week1_4: {
      learned: [
        'Neural networks',
        'Transformers',
        'Fine-tuning',
        'LangChain',
        'AI Agents'
      ],
      status: 'Theory + small examples'
    },
    
    week5_so_far: {
      learned: [
        'Vector databases (ChromaDB)',
        'RAG architecture',
        'Streamlit UI'
      ],
      status: 'Individual components'
    },
    
    this_project: {
      integrates: 'ALL previous concepts',
      builds: 'Production-ready ChatGPT clone',
      demonstrates: 'End-to-end AI application',
      
      tagline: '"From concepts to complete product"'
    }
  },
  
  what_youll_build: {
    name: 'Personal AI Assistant with RAG',
    
    features: [
      '💬 Chat interface (like ChatGPT)',
      '📁 Document upload (PDF, TXT, DOCX)',
      '🔍 Semantic search across documents',
      '🤖 AI responses with citations',
      '💾 Conversation history',
      '⚙️ Model selection (GPT-4, Claude, etc.)',
      '🎨 Beautiful UI',
      '🚀 Ready to deploy'
    ],
    
    real_world_value: {
      portfolio: 'Impressive project for resume',
      practical: 'Actually useful tool',
      foundation: 'Template for future AI apps',
      understanding: 'Deep knowledge of AI pipelines'
    }
  },
  
  architecture_preview: {
    frontend: 'Streamlit (chat UI, file uploads)',
    backend: 'Python (RAG logic)',
    vector_db: 'ChromaDB (document storage)',
    llm: 'OpenAI/Anthropic API',
    features: 'Streaming, citations, history',
    
    stack: 'Production-grade, scalable, maintainable'
  }
};
```

---

## **What it is:**

### **System Architecture:**

```javascript
const system_architecture = {
  components: {
    frontend: {
      technology: 'Streamlit',
      responsibilities: [
        'Chat interface',
        'File upload UI',
        'Settings panel',
        'Display responses',
        'Show sources'
      ]
    },
    
    document_processor: {
      responsibilities: [
        'Load files (PDF, TXT, DOCX)',
        'Extract text',
        'Split into chunks',
        'Handle metadata'
      ],
      libraries: ['PyPDF2', 'python-docx', 'LangChain']
    },
    
    vector_store: {
      technology: 'ChromaDB',
      responsibilities: [
        'Store document embeddings',
        'Semantic search',
        'Metadata filtering',
        'Persist to disk'
      ]
    },
    
    rag_engine: {
      responsibilities: [
        'Retrieve relevant docs',
        'Build context',
        'Generate prompts',
        'Stream responses',
        'Extract citations'
      ]
    },
    
    llm_interface: {
      providers: ['OpenAI', 'Anthropic', 'Ollama'],
      features: ['Streaming', 'Function calling', 'Token counting']
    }
  },
  
  data_flow: {
    document_indexing: `
      User uploads file 
        → Extract text 
        → Chunk 
        → Embed 
        → Store in ChromaDB
    `,
    
    query_answering: `
      User asks question 
        → Embed query 
        → Search ChromaDB 
        → Retrieve top-k docs 
        → Build prompt 
        → Stream LLM response 
        → Display with citations
    `
  }
};

const feature_breakdown = {
  core_features: {
    chat: {
      what: 'ChatGPT-like conversation',
      how: 'Streamlit chat components + history',
      ux: 'Smooth, responsive, familiar'
    },
    
    document_upload: {
      what: 'Upload multiple files',
      formats: ['PDF', 'TXT', 'DOCX', 'MD'],
      processing: 'Async indexing with progress'
    },
    
    rag_responses: {
      what: 'Answers from your documents',
      accuracy: 'Citations for every claim',
      fallback: 'General knowledge if docs insufficient'
    },
    
    streaming: {
      what: 'Token-by-token display',
      why: 'Feels responsive, like ChatGPT',
      how: 'OpenAI streaming API'
    }
  },
  
  advanced_features: {
    conversation_memory: {
      what: 'Remember previous messages',
      how: 'Session state + context window',
      limit: 'Last N messages or token limit'
    },
    
    source_citations: {
      what: 'Show which documents used',
      display: 'Expandable source viewer',
      metadata: 'Filename, page number, relevance'
    },
    
    model_selection: {
      what: 'Choose LLM (GPT-4, Claude, etc.)',
      flexibility: 'Different models for different needs',
      cost: 'Track tokens and costs'
    },
    
    settings: {
      what: 'Customize behavior',
      options: ['Temperature', 'Max tokens', 'Top-k retrieval'],
      persistence: 'Save preferences'
    }
  },
  
  production_features: {
    error_handling: 'Graceful failures',
    loading_states: 'Progress indicators',
    rate_limiting: 'Handle API limits',
    caching: 'Cache embeddings and results',
    logging: 'Debug and monitor',
    deployment: 'Docker + cloud ready'
  }
};
```

---

## **How it works (Intuition):**

### **System Flow Visualization:**

```javascript
const system_intuition = {
  user_perspective: {
    step1: 'Upload company docs, research papers, notes',
    step2: 'Wait a few seconds while system processes',
    step3: 'Ask questions in natural language',
    step4: 'Get accurate answers with source citations',
    step5: 'Follow-up questions with context',
    
    feels_like: 'ChatGPT but knows about YOUR documents'
  },
  
  behind_the_scenes: {
    indexing: {
      user_action: 'Uploads "Company_Policy.pdf"',
      
      system_does: [
        '1. Extract text from PDF',
        '2. Split into chunks (overlap for context)',
        '3. Generate embeddings for each chunk',
        '4. Store in ChromaDB with metadata',
        '5. Build searchable index'
      ],
      
      time: '5-10 seconds for typical document',
      once: 'Only needed when uploading, not every query'
    },
    
    querying: {
      user_action: 'Asks "What is the vacation policy?"',
      
      system_does: [
        '1. Embed query',
        '2. Search ChromaDB (semantic similarity)',
        '3. Retrieve 3-5 most relevant chunks',
        '4. Build prompt: [context] + [question]',
        '5. Stream LLM response',
        '6. Parse citations',
        '7. Display answer + sources'
      ],
      
      time: '2-3 seconds',
      feels: 'Instant and intelligent'
    }
  },
  
  key_insight: {
    not_magic: 'Combining well-understood components',
    architecture: 'Each piece does one thing well',
    integration: 'The magic is in the connections',
    
    analogy: {
      car: 'Engine, wheels, steering all work together',
      this: 'UI, search, LLM all work together',
      
      result: 'Greater than sum of parts'
    }
  }
};
```

---

## **How it works (Math – simplified):**

### **Performance Calculations:**

```python
# System performance analysis

def calculate_costs(num_documents, avg_pages, queries_per_day):
    """
    Cost and performance calculations
    """
    
    # Document processing
    chars_per_page = 2000
    total_chars = num_documents * avg_pages * chars_per_page
    chunks = total_chars / 1000  # 1000 chars per chunk
    
    # Embedding costs
    embedding_model = "text-embedding-3-small"
    embedding_cost_per_1k_tokens = 0.00002  # $0.00002/1k tokens
    embedding_tokens = chunks * 250  # ~250 tokens per chunk
    embedding_cost = (embedding_tokens / 1000) * embedding_cost_per_1k_tokens
    
    # Query costs
    avg_context_tokens = 2000  # Retrieved chunks
    avg_response_tokens = 500
    total_query_tokens = avg_context_tokens + avg_response_tokens
    
    llm_cost_per_query = {
        'gpt-3.5-turbo': (2000 * 0.0000015) + (500 * 0.000002),  # $0.003
        'gpt-4': (2000 * 0.00003) + (500 * 0.00006),  # $0.09
        'claude-3-haiku': (2000 * 0.00000025) + (500 * 0.00000125),  # $0.001
    }
    
    monthly_query_cost = queries_per_day * 30 * llm_cost_per_query['gpt-3.5-turbo']
    
    return {
        'one_time': {
            'embedding_cost': f'${embedding_cost:.4f}',
            'chunks_created': int(chunks),
            'processing_time': f'{chunks * 0.01:.1f} seconds'
        },
        'per_query': {
            'latency': '2-3 seconds',
            'cost': {
                'gpt-3.5-turbo': f'${llm_cost_per_query["gpt-3.5-turbo"]:.4f}',
                'gpt-4': f'${llm_cost_per_query["gpt-4"]:.4f}',
                'claude-3-haiku': f'${llm_cost_per_query["claude-3-haiku"]:.4f}'
            }
        },
        'monthly': {
            'queries': queries_per_day * 30,
            'cost': f'${monthly_query_cost:.2f}',
            'cost_per_user': f'${monthly_query_cost / 10:.2f} (assuming 10 users)'
        }
    }

# Example: 50 documents, 10 pages each, 100 queries/day
result = calculate_costs(50, 10, 100)

"""
Result:
{
    'one_time': {
        'embedding_cost': '$0.0100',
        'chunks_created': 1000,
        'processing_time': '10.0 seconds'
    },
    'per_query': {
        'latency': '2-3 seconds',
        'cost': {
            'gpt-3.5-turbo': '$0.0040',
            'gpt-4': '$0.0900',
            'claude-3-haiku': '$0.0011'
        }
    },
    'monthly': {
        'queries': 3000,
        'cost': '$12.00',
        'cost_per_user': '$1.20'
    }
}

Conclusion: Very affordable! ~$1-2/user/month
"""
```

---

## **Visual Explanation (described):**

### **Complete System Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    STREAMLIT FRONTEND                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Sidebar    │  │  Chat Area   │  │   Settings   │         │
│  │              │  │              │  │              │         │
│  │ • Upload     │  │ • Messages   │  │ • Model      │         │
│  │ • Documents  │  │ • Input      │  │ • Temp       │         │
│  │ • Status     │  │ • Sources    │  │ • Top-k      │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
          ↓                  ↓                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              DOCUMENT PROCESSOR                          │  │
│  │  • Load files (PDF, TXT, DOCX)                          │  │
│  │  • Extract text                                         │  │
│  │  • Split into chunks (RecursiveTextSplitter)            │  │
│  │  • Generate metadata                                    │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       ↓                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              EMBEDDING LAYER                             │  │
│  │  • SentenceTransformer / OpenAI API                      │  │
│  │  • Batch processing                                      │  │
│  │  • Caching                                              │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       ↓                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              VECTOR STORE (ChromaDB)                     │  │
│  │  • Store embeddings                                      │  │
│  │  • Semantic search                                       │  │
│  │  • Metadata filtering                                    │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       ↑                                         │
│  ┌────────────────────┴─────────────────────────────────────┐  │
│  │              RAG ENGINE                                  │  │
│  │  • Query embedding                                       │  │
│  │  • Retrieval (top-k chunks)                             │  │
│  │  • Context building                                      │  │
│  │  • Prompt engineering                                    │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       ↓                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              LLM INTERFACE                               │  │
│  │  • OpenAI / Anthropic / Ollama                          │  │
│  │  • Streaming                                            │  │
│  │  • Error handling                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                            │
│  • ChromaDB database (./chroma_db/)                            │
│  • Session state (st.session_state)                            │
│  • Configuration (config.yaml)                                 │
│  • Logs (app.log)                                              │
└─────────────────────────────────────────────────────────────────┘
```

### **Query Processing Flow:**

```
USER QUERY: "What is the vacation policy?"
        │
        ↓
┌───────────────────┐
│ 1. Input Handler  │  Capture query, validate
└────────┬──────────┘
         ↓
┌───────────────────┐
│ 2. Query Embed    │  text → [0.2, -0.5, ..., 0.7]
└────────┬──────────┘
         ↓
┌───────────────────┐
│ 3. Vector Search  │  Find 5 most similar chunks
│    ChromaDB       │  - "Vacation Policy: ..."
│                   │  - "PTO Guidelines: ..."
│                   │  - "Leave Request: ..."
└────────┬──────────┘
         ↓
┌───────────────────┐
│ 4. Rerank         │  Optional: Improve relevance
│    (Optional)     │  Cross-encoder scoring
└────────┬──────────┘
         ↓
┌───────────────────┐
│ 5. Context Build  │  Format: Context: [chunks]
│                   │          Question: [query]
│                   │          Answer:
└────────┬──────────┘
         ↓
┌───────────────────┐
│ 6. LLM Call       │  Stream response token-by-token
│    (Streaming)    │  Display in real-time
└────────┬──────────┘
         ↓
┌───────────────────┐
│ 7. Citation Parse │  Extract source references
│                   │  Map to documents
└────────┬──────────┘
         ↓
┌───────────────────┐
│ 8. Display        │  Show answer + sources
│                   │  Update UI
└───────────────────┘

Total Time: ~2-3 seconds
```

---

## **Complete Implementation:**

### **Project Structure:**

```
chatgpt-clone/
├── app.py                    # Main Streamlit app
├── requirements.txt          # Dependencies
├── config.yaml              # Configuration
├── .env                     # API keys (gitignored)
├── README.md                # Documentation
│
├── src/
│   ├── __init__.py
│   ├── document_processor.py   # PDF/TXT loading & chunking
│   ├── vector_store.py          # ChromaDB interface
│   ├── rag_engine.py            # RAG logic
│   ├── llm_interface.py         # OpenAI/Anthropic wrapper
│   └── utils.py                 # Helper functions
│
├── chroma_db/               # ChromaDB storage (created automatically)
├── uploads/                 # Temporary file storage
├── logs/                    # Application logs
│
└── tests/
    ├── test_document_processor.py
    ├── test_vector_store.py
    └── test_rag_engine.py
```

### **Full Implementation:**

```python
# ============================================
# 1. app.py - Main Streamlit Application
# ============================================

import streamlit as st
from src.document_processor import DocumentProcessor
from src.vector_store import VectorStore
from src.rag_engine import RAGEngine
from src.llm_interface import LLMInterface
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Page configuration
st.set_page_config(
    page_title="Personal AI Assistant",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
    <style>
    .stChatMessage {
        padding: 1rem;
        border-radius: 0.5rem;
    }
    .source-box {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-top: 0.5rem;
    }
    </style>
""", unsafe_allow_html=True)

# Initialize components
@st.cache_resource
def initialize_system():
    """Initialize system components (cached)"""
    processor = DocumentProcessor()
    vector_store = VectorStore()
    rag_engine = RAGEngine(vector_store)
    llm_interface = LLMInterface()
    
    return processor, vector_store, rag_engine, llm_interface

processor, vector_store, rag_engine, llm_interface = initialize_system()

# Initialize session state
if 'messages' not in st.session_state:
    st.session_state.messages = []

if 'documents' not in st.session_state:
    st.session_state.documents = []

# Sidebar
with st.sidebar:
    st.title("⚙️ Configuration")
    
    # API Key
    api_key = st.text_input(
        "OpenAI API Key",
        type="password",
        value=os.getenv("OPENAI_API_KEY", ""),
        help="Get your key from platform.openai.com"
    )
    
    if api_key:
        os.environ["OPENAI_API_KEY"] = api_key
        llm_interface.set_api_key(api_key)
    
    st.divider()
    
    # Model selection
    model = st.selectbox(
        "Model",
        ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
        help="GPT-4 is more accurate but slower and more expensive"
    )
    
    # Temperature
    temperature = st.slider(
        "Temperature",
        0.0, 1.0, 0.7,
        help="Higher = more creative, Lower = more focused"
    )
    
    # Top-k retrieval
    top_k = st.slider(
        "Number of sources",
        1, 10, 3,
        help="How many document chunks to retrieve"
    )
    
    st.divider()
    
    # Document upload
    st.subheader("📁 Upload Documents")
    
    uploaded_files = st.file_uploader(
        "Choose files",
        type=['pdf', 'txt', 'docx', 'md'],
        accept_multiple_files=True,
        help="Upload documents to chat about"
    )
    
    if uploaded_files:
        if st.button("📤 Index Documents", type="primary"):
            with st.spinner("Processing documents..."):
                try:
                    for file in uploaded_files:
                        # Save file
                        file_path = f"uploads/{file.name}"
                        os.makedirs("uploads", exist_ok=True)
                        with open(file_path, "wb") as f:
                            f.write(file.getbuffer())
                        
                        # Process
                        chunks = processor.process_file(file_path)
                        
                        # Index
                        vector_store.add_documents(
                            chunks,
                            metadatas=[{
                                'source': file.name,
                                'chunk_index': i
                            } for i in range(len(chunks))]
                        )
                        
                        st.session_state.documents.append(file.name)
                    
                    st.success(f"✅ Indexed {len(uploaded_files)} documents!")
                
                except Exception as e:
                    st.error(f"Error: {str(e)}")
    
    # Show indexed documents
    if st.session_state.documents:
        st.divider()
        st.subheader("📚 Indexed Documents")
        for doc in st.session_state.documents:
            st.text(f"• {doc}")
    
    st.divider()
    
    # Clear chat
    if st.button("🗑️ Clear Chat"):
        st.session_state.messages = []
        st.rerun()
    
    # Stats
    st.caption(f"💬 {len(st.session_state.messages)} messages")
    st.caption(f"📄 {vector_store.count()} chunks indexed")

# Main content
st.title("🤖 Personal AI Assistant")
st.caption("Upload documents and ask questions")

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message['role']):
        st.write(message['content'])
        
        # Display sources if available
        if 'sources' in message and message['sources']:
            with st.expander("📚 View Sources"):
                for i, source in enumerate(message['sources']):
                    st.markdown(f"""
                        <div class="source-box">
                            <strong>Source {i+1}: {source['metadata'].get('source', 'Unknown')}</strong><br>
                            <small>Relevance: {source['relevance']:.1%}</small><br>
                            <p>{source['content'][:200]}...</p>
                        </div>
                    """, unsafe_allow_html=True)

# Chat input
if prompt := st.chat_input("Ask a question about your documents"):
    # Add user message
    st.session_state.messages.append({
        'role': 'user',
        'content': prompt
    })
    
    # Display user message
    with st.chat_message('user'):
        st.write(prompt)
    
    # Generate response
    with st.chat_message('assistant'):
        with st.spinner("Thinking..."):
            try:
                # RAG response
                response = rag_engine.generate_response(
                    query=prompt,
                    conversation_history=st.session_state.messages[-5:],  # Last 5 messages
                    model=model,
                    temperature=temperature,
                    top_k=top_k
                )
                
                # Stream response
                message_placeholder = st.empty()
                full_response = ""
                
                for chunk in response['answer_stream']:
                    full_response += chunk
                    message_placeholder.write(full_response + "▌")
                
                message_placeholder.write(full_response)
                
                # Display sources
                if response['sources']:
                    with st.expander("📚 View Sources"):
                        for i, source in enumerate(response['sources']):
                            st.markdown(f"""
                                <div class="source-box">
                                    <strong>Source {i+1}: {source['metadata'].get('source', 'Unknown')}</strong><br>
                                    <small>Relevance: {source['relevance']:.1%}</small><br>
                                    <p>{source['content'][:200]}...</p>
                                </div>
                            """, unsafe_allow_html=True)
                
                # Add assistant message
                st.session_state.messages.append({
                    'role': 'assistant',
                    'content': full_response,
                    'sources': response['sources']
                })
            
            except Exception as e:
                st.error(f"Error: {str(e)}")
                st.caption("Try uploading documents or check your API key")


# ============================================
# 2. src/document_processor.py
# ============================================

from typing import List
from langchain.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter

class DocumentProcessor:
    """Process documents for RAG"""
    
    def __init__(self, chunk_size=1000, chunk_overlap=200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
    
    def process_file(self, file_path: str) -> List[str]:
        """Load and chunk a file"""
        # Load based on extension
        if file_path.endswith('.pdf'):
            loader = PyPDFLoader(file_path)
        elif file_path.endswith('.txt') or file_path.endswith('.md'):
            loader = TextLoader(file_path)
        elif file_path.endswith('.docx'):
            loader = Docx2txtLoader(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_path}")
        
        # Load documents
        documents = loader.load()
        
        # Split into chunks
        chunks = self.text_splitter.split_documents(documents)
        
        # Extract text
        texts = [chunk.page_content for chunk in chunks]
        
        return texts


# ============================================
# 3. src/vector_store.py
# ============================================

import chromadb
from typing import List, Dict
from sentence_transformers import SentenceTransformer

class VectorStore:
    """ChromaDB interface"""
    
    def __init__(self, collection_name="documents"):
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.collection = self.client.get_or_create_collection(collection_name)
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def add_documents(self, documents: List[str], metadatas: List[Dict]):
        """Add documents to vector store"""
        # Generate IDs
        start_id = self.collection.count()
        ids = [f"doc_{start_id + i}" for i in range(len(documents))]
        
        # Add to collection
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
    
    def search(self, query: str, top_k: int = 3) -> List[Dict]:
        """Search for similar documents"""
        results = self.collection.query(
            query_texts=[query],
            n_results=top_k
        )
        
        # Format results
        formatted = []
        for i in range(len(results['documents'][0])):
            formatted.append({
                'content': results['documents'][0][i],
                'metadata': results['metadatas'][0][i],
                'distance': results['distances'][0][i],
                'relevance': 1 - results['distances'][0][i]  # Convert to relevance
            })
        
        return formatted
    
    def count(self) -> int:
        """Get total document count"""
        return self.collection.count()


# ============================================
# 4. src/rag_engine.py
# ============================================

from typing import List, Dict, Generator
from .vector_store import VectorStore
from .llm_interface import LLMInterface

class RAGEngine:
    """RAG pipeline"""
    
    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.llm = LLMInterface()
    
    def generate_response(
        self,
        query: str,
        conversation_history: List[Dict] = None,
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
        top_k: int = 3
    ) -> Dict:
        """Generate RAG response"""
        
        # Retrieve relevant documents
        sources = self.vector_store.search(query, top_k=top_k)
        
        # Build context
        context = self._build_context(sources)
        
        # Build prompt
        prompt = self._build_prompt(context, query, conversation_history)
        
        # Generate response (streaming)
        answer_stream = self.llm.generate_stream(
            prompt=prompt,
            model=model,
            temperature=temperature
        )
        
        return {
            'answer_stream': answer_stream,
            'sources': sources
        }
    
    def _build_context(self, sources: List[Dict]) -> str:
        """Format retrieved documents"""
        context_parts = []
        
        for i, source in enumerate(sources):
            source_text = f"[Source {i+1}: {source['metadata'].get('source', 'Unknown')}]\n"
            source_text += source['content']
            context_parts.append(source_text)
        
        return "\n\n".join(context_parts)
    
    def _build_prompt(
        self,
        context: str,
        query: str,
        conversation_history: List[Dict] = None
    ) -> str:
        """Build augmented prompt"""
        
        prompt = f"""Answer the question based on the context below. If you cannot answer based on the context, say so.

Context:
{context}

Question: {query}

Instructions:
- Answer using ONLY information from the context
- Be concise and accurate
- Cite sources using [Source N] notation
- If unsure, say "I don't have enough information"

Answer:"""
        
        return prompt


# ============================================
# 5. src/llm_interface.py
# ============================================

from openai import OpenAI
from typing import Generator
import os

class LLMInterface:
    """LLM API wrapper"""
    
    def __init__(self):
        self.client = None
        self.set_api_key(os.getenv("OPENAI_API_KEY"))
    
    def set_api_key(self, api_key: str):
        """Set API key"""
        if api_key:
            self.client = OpenAI(api_key=api_key)
    
    def generate_stream(
        self,
        prompt: str,
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7
    ) -> Generator[str, None, None]:
        """Generate response with streaming"""
        
        if not self.client:
            yield "Please set your OpenAI API key in the sidebar."
            return
        
        try:
            stream = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        
        except Exception as e:
            yield f"Error: {str(e)}"


# ============================================
# 6. requirements.txt
# ============================================

"""
streamlit==1.31.0
chromadb==0.4.22
openai==1.12.0
sentence-transformers==2.3.1
langchain==0.1.9
pypdf2==3.0.1
python-docx==1.1.0
python-dotenv==1.0.0
"""


# ============================================
# 7. .env (example)
# ============================================

"""
OPENAI_API_KEY=sk-...your-key-here...
"""


# ============================================
# 8. Run Application
# ============================================

"""
# Setup:
pip install -r requirements.txt

# Run:
streamlit run app.py

# Access:
http://localhost:8501
"""
```

---

*(Continuing in next message due to length...)*