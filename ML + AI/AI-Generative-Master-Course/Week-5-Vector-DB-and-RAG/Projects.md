# 🛠️ Week 5 Projects: Vector DB & RAG

## 📚 Table of Contents
1. [Project Overview](#-project-overview)
2. [Project 1: Document Search Engine](#-project-1-document-search-engine)
3. [Project 2: Customer Support Chatbot](#-project-2-customer-support-chatbot)
4. [Project 3: Research Paper Assistant](#-project-3-research-paper-assistant)
5. [Project 4: Multimodal Product Search](#-project-4-multimodal-product-search)
6. [Capstone: Enterprise Knowledge Base](#-capstone-enterprise-knowledge-base)

---

## 📋 Project Overview

### Difficulty Levels

| Project | Difficulty | Time | Key Skills |
|---------|------------|------|------------|
| Document Search Engine | ⭐⭐ Medium | 3-4 hours | Vector DB, Search |
| Customer Support Chatbot | ⭐⭐⭐ Hard | 6-8 hours | RAG, Streaming |
| Research Paper Assistant | ⭐⭐⭐ Hard | 6-8 hours | PDF Processing, Citations |
| Multimodal Product Search | ⭐⭐⭐⭐ Expert | 8-10 hours | CLIP, Multimodal |
| Enterprise Knowledge Base | ⭐⭐⭐⭐⭐ Capstone | 15-20 hours | Full Stack |

---

## 🔍 Project 1: Document Search Engine

### Objective
Build a semantic search engine that can find relevant documents based on meaning, not just keywords.

### Features
- Upload multiple document types (PDF, TXT, MD)
- Semantic search with relevance scores
- Filter by metadata (date, type, tags)
- Export search results

### Architecture

```
┌────────────────────────────────────────────────────────┐
│                  DOCUMENT SEARCH ENGINE                 │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Upload ──► Process ──► Chunk ──► Embed ──► Store      │
│                                                         │
│  Search ──► Embed Query ──► Vector Search ──► Results  │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Implementation

```python
"""
Project 1: Document Search Engine
"""

import streamlit as st
import os
import tempfile
from datetime import datetime
from typing import List, Dict

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import (
    PyPDFLoader, TextLoader, UnstructuredMarkdownLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter

# ============================================
# CONFIGURATION
# ============================================

st.set_page_config(
    page_title="Document Search",
    page_icon="🔍",
    layout="wide"
)

PERSIST_DIR = "./search_db"
SUPPORTED_TYPES = ["pdf", "txt", "md"]

# ============================================
# SEARCH ENGINE CLASS
# ============================================

class DocumentSearchEngine:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        self._vectorstore = None
    
    @property
    def vectorstore(self):
        if self._vectorstore is None:
            if os.path.exists(PERSIST_DIR):
                self._vectorstore = Chroma(
                    persist_directory=PERSIST_DIR,
                    embedding_function=self.embeddings
                )
            else:
                self._vectorstore = Chroma(
                    persist_directory=PERSIST_DIR,
                    embedding_function=self.embeddings
                )
        return self._vectorstore
    
    def load_document(self, file_path: str, file_type: str):
        """Load document based on type"""
        if file_type == "pdf":
            loader = PyPDFLoader(file_path)
        elif file_type == "md":
            loader = UnstructuredMarkdownLoader(file_path)
        else:
            loader = TextLoader(file_path)
        
        return loader.load()
    
    def index_document(self, file, tags: List[str] = None) -> int:
        """Index a document"""
        
        # Save to temp file
        ext = os.path.splitext(file.name)[1].lower()[1:]
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
            tmp.write(file.getvalue())
            tmp_path = tmp.name
        
        try:
            # Load
            docs = self.load_document(tmp_path, ext)
            
            # Add metadata
            for doc in docs:
                doc.metadata.update({
                    "source": file.name,
                    "file_type": ext,
                    "indexed_at": datetime.now().isoformat(),
                    "tags": ",".join(tags or [])
                })
            
            # Split
            chunks = self.splitter.split_documents(docs)
            
            # Index
            self._vectorstore = Chroma.from_documents(
                documents=chunks,
                embedding=self.embeddings,
                persist_directory=PERSIST_DIR
            )
            
            return len(chunks)
        
        finally:
            os.unlink(tmp_path)
    
    def search(
        self, 
        query: str, 
        k: int = 10,
        file_type: str = None,
        tags: List[str] = None
    ) -> List[Dict]:
        """Search documents"""
        
        # Build filter
        where = {}
        if file_type:
            where["file_type"] = file_type
        
        # Search
        results = self.vectorstore.similarity_search_with_relevance_scores(
            query,
            k=k,
            filter=where if where else None
        )
        
        # Format results
        formatted = []
        for doc, score in results:
            # Filter by tags if specified
            if tags:
                doc_tags = doc.metadata.get("tags", "").split(",")
                if not any(tag in doc_tags for tag in tags):
                    continue
            
            formatted.append({
                "content": doc.page_content,
                "source": doc.metadata.get("source", "Unknown"),
                "file_type": doc.metadata.get("file_type", "Unknown"),
                "score": score,
                "tags": doc.metadata.get("tags", "").split(",")
            })
        
        return formatted
    
    def get_stats(self) -> Dict:
        """Get index statistics"""
        try:
            collection = self.vectorstore._collection
            return {
                "total_documents": collection.count(),
                "index_exists": True
            }
        except:
            return {"total_documents": 0, "index_exists": False}

# ============================================
# STREAMLIT UI
# ============================================

# Initialize
if "engine" not in st.session_state:
    st.session_state.engine = DocumentSearchEngine()

engine = st.session_state.engine

# Sidebar - Document Management
with st.sidebar:
    st.title("📁 Documents")
    
    # Stats
    stats = engine.get_stats()
    st.metric("Indexed Documents", stats["total_documents"])
    
    st.markdown("---")
    
    # Upload
    st.subheader("Upload Documents")
    uploaded_files = st.file_uploader(
        "Choose files",
        type=SUPPORTED_TYPES,
        accept_multiple_files=True
    )
    
    tags_input = st.text_input("Tags (comma-separated)")
    tags = [t.strip() for t in tags_input.split(",")] if tags_input else []
    
    if uploaded_files and st.button("Index Documents"):
        with st.spinner("Indexing..."):
            total_chunks = 0
            for file in uploaded_files:
                chunks = engine.index_document(file, tags)
                total_chunks += chunks
                st.success(f"✅ {file.name}: {chunks} chunks")
            
            st.success(f"Total: {total_chunks} chunks indexed")

# Main - Search
st.title("🔍 Document Search Engine")
st.caption("Semantic search across your documents")

# Search filters
col1, col2, col3 = st.columns([3, 1, 1])

with col1:
    query = st.text_input("Search query", placeholder="Enter your search...")

with col2:
    file_type_filter = st.selectbox("File type", ["All", "pdf", "txt", "md"])

with col3:
    num_results = st.slider("Results", 1, 20, 10)

# Search button
if st.button("🔍 Search", type="primary") and query:
    with st.spinner("Searching..."):
        results = engine.search(
            query=query,
            k=num_results,
            file_type=file_type_filter if file_type_filter != "All" else None
        )
        
        if results:
            st.success(f"Found {len(results)} results")
            
            for i, result in enumerate(results, 1):
                with st.expander(
                    f"**{i}. {result['source']}** (Score: {result['score']:.2%})"
                ):
                    st.markdown(result['content'])
                    
                    st.markdown("---")
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.caption(f"📄 Type: {result['file_type']}")
                    with col2:
                        st.caption(f"📊 Relevance: {result['score']:.2%}")
                    with col3:
                        if result['tags'] and result['tags'][0]:
                            st.caption(f"🏷️ Tags: {', '.join(result['tags'])}")
        else:
            st.warning("No results found. Try a different query.")

# Empty state
if not query:
    st.info("👆 Enter a search query to find relevant documents")
```

### Deliverables
1. Working search engine with document upload
2. Metadata filtering
3. Relevance scoring display
4. Export functionality

---

## 💬 Project 2: Customer Support Chatbot

### Objective
Build a customer support chatbot that answers questions based on FAQ documents and product documentation.

### Features
- Ingest FAQ and documentation
- Conversational interface
- Source citations
- Escalation to human
- Feedback collection

### Implementation

```python
"""
Project 2: Customer Support Chatbot
"""

import streamlit as st
from openai import OpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import json

# ============================================
# CONFIGURATION
# ============================================

st.set_page_config(
    page_title="Support Assistant",
    page_icon="💬",
    layout="wide"
)

client = OpenAI()

SYSTEM_PROMPT = """You are a helpful customer support assistant for TechCorp.

Your responsibilities:
1. Answer questions based on the provided context
2. Be polite, professional, and helpful
3. If you don't know the answer, admit it and offer to escalate
4. Always cite your sources when possible

Context:
{context}

Guidelines:
- Be concise but thorough
- Use bullet points for lists
- Offer next steps when appropriate
- If the query seems urgent or complex, suggest human support
"""

# ============================================
# SUPPORT BOT CLASS
# ============================================

class SupportBot:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        self.vectorstore = None
        self.conversation_history = []
    
    def load_faqs(self, faqs: list):
        """Load FAQ data"""
        docs = []
        for faq in faqs:
            doc = Document(
                page_content=f"Q: {faq['question']}\nA: {faq['answer']}",
                metadata={
                    "type": "faq",
                    "category": faq.get("category", "general")
                }
            )
            docs.append(doc)
        
        self.vectorstore = Chroma.from_documents(
            documents=docs,
            embedding=self.embeddings
        )
    
    def get_context(self, query: str, k: int = 3) -> str:
        """Retrieve relevant context"""
        if not self.vectorstore:
            return "No knowledge base loaded."
        
        docs = self.vectorstore.similarity_search(query, k=k)
        return "\n\n".join([doc.page_content for doc in docs])
    
    def should_escalate(self, query: str) -> bool:
        """Check if query should be escalated"""
        escalation_keywords = [
            "speak to human", "real person", "manager",
            "urgent", "emergency", "refund", "cancel",
            "legal", "lawyer", "sue"
        ]
        return any(kw in query.lower() for kw in escalation_keywords)
    
    def chat(self, query: str):
        """Generate response"""
        
        # Check for escalation
        if self.should_escalate(query):
            yield {
                "type": "escalation",
                "message": "I'll connect you with a human support agent. Please hold..."
            }
            return
        
        # Get context
        context = self.get_context(query)
        
        # Build messages
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT.format(context=context)}
        ]
        
        # Add history (last 6 messages)
        for msg in self.conversation_history[-6:]:
            messages.append(msg)
        
        messages.append({"role": "user", "content": query})
        
        # Stream response
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            stream=True,
            temperature=0.7
        )
        
        full_response = ""
        for chunk in response:
            if chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                full_response += token
                yield {"type": "token", "content": token}
        
        # Save to history
        self.conversation_history.append({"role": "user", "content": query})
        self.conversation_history.append({"role": "assistant", "content": full_response})
        
        yield {"type": "done", "sources": context}

# ============================================
# SAMPLE DATA
# ============================================

SAMPLE_FAQS = [
    {
        "question": "How do I reset my password?",
        "answer": "Go to Settings > Security > Reset Password. You'll receive an email with reset instructions.",
        "category": "account"
    },
    {
        "question": "What are the shipping options?",
        "answer": "We offer Standard (5-7 days, free), Express (2-3 days, $9.99), and Overnight ($24.99).",
        "category": "shipping"
    },
    {
        "question": "How do I return a product?",
        "answer": "Initiate a return within 30 days via your order page. Print the shipping label and drop off at any carrier location.",
        "category": "returns"
    },
    {
        "question": "How can I contact support?",
        "answer": "Email: support@techcorp.com, Phone: 1-800-TECH-CORP (Mon-Fri 9AM-6PM EST), Live Chat: Available 24/7",
        "category": "support"
    },
    {
        "question": "What payment methods are accepted?",
        "answer": "We accept Visa, Mastercard, American Express, PayPal, and Apple Pay.",
        "category": "payment"
    }
]

# ============================================
# STREAMLIT UI
# ============================================

# Initialize
if "bot" not in st.session_state:
    bot = SupportBot()
    bot.load_faqs(SAMPLE_FAQS)
    st.session_state.bot = bot

if "messages" not in st.session_state:
    st.session_state.messages = [
        {
            "role": "assistant",
            "content": "👋 Hello! I'm your TechCorp support assistant. How can I help you today?"
        }
    ]

# Sidebar
with st.sidebar:
    st.title("💬 Support Bot")
    st.markdown("---")
    
    st.subheader("Quick Actions")
    if st.button("🔄 Reset Conversation"):
        st.session_state.messages = [
            {
                "role": "assistant",
                "content": "👋 Hello! I'm your TechCorp support assistant. How can I help you today?"
            }
        ]
        st.session_state.bot.conversation_history = []
        st.rerun()
    
    st.markdown("---")
    
    st.subheader("FAQ Categories")
    st.write("• Account")
    st.write("• Shipping")
    st.write("• Returns")
    st.write("• Payment")
    st.write("• Support")

# Main Chat
st.title("TechCorp Support")

# Display messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Chat input
if query := st.chat_input("Type your question..."):
    # Add user message
    st.session_state.messages.append({"role": "user", "content": query})
    with st.chat_message("user"):
        st.markdown(query)
    
    # Generate response
    with st.chat_message("assistant"):
        placeholder = st.empty()
        full_response = ""
        
        for chunk in st.session_state.bot.chat(query):
            if chunk["type"] == "escalation":
                st.warning(chunk["message"])
                full_response = chunk["message"]
            elif chunk["type"] == "token":
                full_response += chunk["content"]
                placeholder.markdown(full_response + "▌")
            elif chunk["type"] == "done":
                placeholder.markdown(full_response)
                
                # Show feedback
                col1, col2, col3 = st.columns([1, 1, 3])
                with col1:
                    if st.button("👍"):
                        st.toast("Thanks for the feedback!")
                with col2:
                    if st.button("👎"):
                        st.toast("Sorry to hear that. We'll improve!")
        
        st.session_state.messages.append({
            "role": "assistant",
            "content": full_response
        })
```

### Deliverables
1. FAQ-powered chatbot
2. Conversation history
3. Escalation logic
4. Feedback collection

---

## 📚 Project 3: Research Paper Assistant

### Objective
Build an AI assistant that helps researchers find and understand academic papers.

### Features
- PDF paper ingestion
- Citation extraction
- Paper Q&A
- Summary generation
- Related paper suggestions

### Implementation

```python
"""
Project 3: Research Paper Assistant
"""

import streamlit as st
import fitz  # PyMuPDF
import re
from openai import OpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import tempfile
import os

# ============================================
# CONFIGURATION
# ============================================

st.set_page_config(
    page_title="Research Assistant",
    page_icon="📚",
    layout="wide"
)

client = OpenAI()

# ============================================
# PAPER PROCESSOR
# ============================================

class PaperProcessor:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        self.vectorstore = None
        self.papers = {}
    
    def extract_text(self, pdf_path: str) -> str:
        """Extract text from PDF"""
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    
    def extract_citations(self, text: str) -> list:
        """Extract citations from text"""
        # Simple citation pattern matching
        patterns = [
            r'\(([A-Z][a-z]+(?:\s+et\s+al\.?)?,?\s*\d{4}[a-z]?)\)',  # (Author, 2023)
            r'\[(\d+)\]',  # [1]
        ]
        
        citations = []
        for pattern in patterns:
            matches = re.findall(pattern, text)
            citations.extend(matches)
        
        return list(set(citations))
    
    def extract_metadata(self, text: str) -> dict:
        """Extract paper metadata"""
        # This is simplified - real implementation would be more robust
        lines = text.split('\n')[:20]
        
        return {
            "title": lines[0] if lines else "Unknown",
            "abstract_start": text.find("Abstract"),
            "has_references": "References" in text or "Bibliography" in text
        }
    
    def process_paper(self, file, paper_id: str) -> dict:
        """Process a research paper"""
        
        # Save to temp
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file.getvalue())
            tmp_path = tmp.name
        
        try:
            # Extract text
            text = self.extract_text(tmp_path)
            
            # Extract metadata
            metadata = self.extract_metadata(text)
            metadata["filename"] = file.name
            metadata["paper_id"] = paper_id
            
            # Extract citations
            citations = self.extract_citations(text)
            
            # Split into chunks
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1500,
                chunk_overlap=300
            )
            
            chunks = splitter.split_text(text)
            
            # Create documents
            docs = [
                Document(
                    page_content=chunk,
                    metadata={**metadata, "chunk_index": i}
                )
                for i, chunk in enumerate(chunks)
            ]
            
            # Add to vectorstore
            if self.vectorstore is None:
                self.vectorstore = Chroma.from_documents(
                    documents=docs,
                    embedding=self.embeddings
                )
            else:
                self.vectorstore.add_documents(docs)
            
            # Store paper info
            self.papers[paper_id] = {
                "filename": file.name,
                "title": metadata["title"],
                "citations": citations,
                "num_chunks": len(chunks)
            }
            
            return {
                "success": True,
                "chunks": len(chunks),
                "citations": len(citations)
            }
        
        finally:
            os.unlink(tmp_path)
    
    def query(self, question: str, paper_id: str = None) -> dict:
        """Query papers"""
        
        if not self.vectorstore:
            return {"answer": "No papers loaded.", "sources": []}
        
        # Build filter
        filter_dict = {"paper_id": paper_id} if paper_id else None
        
        # Retrieve
        docs = self.vectorstore.similarity_search(
            question,
            k=5,
            filter=filter_dict
        )
        
        if not docs:
            return {"answer": "No relevant content found.", "sources": []}
        
        # Format context
        context = "\n\n".join([
            f"[{doc.metadata.get('filename', 'Unknown')}]\n{doc.page_content}"
            for doc in docs
        ])
        
        # Generate answer
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": """You are a research assistant helping analyze academic papers.
                    
Provide accurate, well-structured answers based on the paper content.
Use academic language and cite specific sections when relevant.
If the content doesn't fully answer the question, say so."""
                },
                {
                    "role": "user",
                    "content": f"""Based on these paper excerpts:

{context}

Question: {question}

Provide a detailed answer with references to the source material."""
                }
            ],
            temperature=0.3
        )
        
        return {
            "answer": response.choices[0].message.content,
            "sources": [
                {
                    "filename": doc.metadata.get("filename"),
                    "content": doc.page_content[:300] + "..."
                }
                for doc in docs
            ]
        }
    
    def summarize_paper(self, paper_id: str) -> str:
        """Generate paper summary"""
        
        if paper_id not in self.papers:
            return "Paper not found."
        
        result = self.query(
            "Provide a comprehensive summary of this paper including: "
            "1) Main research question, 2) Methodology, 3) Key findings, "
            "4) Conclusions and implications",
            paper_id=paper_id
        )
        
        return result["answer"]

# ============================================
# STREAMLIT UI
# ============================================

# Initialize
if "processor" not in st.session_state:
    st.session_state.processor = PaperProcessor()

processor = st.session_state.processor

# Sidebar
with st.sidebar:
    st.title("📚 Papers")
    
    # Upload
    st.subheader("Upload Paper")
    uploaded = st.file_uploader("Choose PDF", type=["pdf"])
    
    if uploaded and st.button("Process Paper"):
        with st.spinner("Processing..."):
            paper_id = f"paper_{len(processor.papers)}"
            result = processor.process_paper(uploaded, paper_id)
            
            if result["success"]:
                st.success(f"✅ Processed: {result['chunks']} chunks, {result['citations']} citations")
    
    st.markdown("---")
    
    # Paper list
    st.subheader("Loaded Papers")
    for pid, info in processor.papers.items():
        st.write(f"📄 {info['filename'][:30]}")

# Main area
st.title("📖 Research Paper Assistant")

# Tabs
tab1, tab2, tab3 = st.tabs(["💬 Ask Questions", "📝 Summarize", "🔗 Citations"])

with tab1:
    st.subheader("Ask Questions About Papers")
    
    paper_filter = st.selectbox(
        "Filter by paper",
        ["All Papers"] + list(processor.papers.keys())
    )
    
    question = st.text_area("Your question", height=100)
    
    if st.button("Get Answer") and question:
        with st.spinner("Analyzing..."):
            paper_id = None if paper_filter == "All Papers" else paper_filter
            result = processor.query(question, paper_id)
            
            st.markdown("### Answer")
            st.markdown(result["answer"])
            
            if result["sources"]:
                with st.expander("📚 Sources"):
                    for src in result["sources"]:
                        st.markdown(f"**{src['filename']}**")
                        st.markdown(f"> {src['content']}")

with tab2:
    st.subheader("Generate Paper Summary")
    
    if processor.papers:
        paper_to_summarize = st.selectbox(
            "Select paper",
            list(processor.papers.keys()),
            format_func=lambda x: processor.papers[x]["filename"]
        )
        
        if st.button("Generate Summary"):
            with st.spinner("Generating summary..."):
                summary = processor.summarize_paper(paper_to_summarize)
                st.markdown(summary)
    else:
        st.info("Upload papers to generate summaries")

with tab3:
    st.subheader("Extracted Citations")
    
    if processor.papers:
        for pid, info in processor.papers.items():
            with st.expander(f"📄 {info['filename']}"):
                st.write(f"**Found {len(info['citations'])} citations:**")
                for cit in info["citations"][:20]:
                    st.write(f"• {cit}")
    else:
        st.info("Upload papers to extract citations")
```

### Deliverables
1. PDF processing pipeline
2. Paper Q&A system
3. Summary generation
4. Citation extraction

---

## 🛍️ Project 4: Multimodal Product Search

### Objective
Build a product search system that supports both text and image queries.

### Features
- Index products with images and descriptions
- Text-based semantic search
- Image-based similarity search
- Combined search (text + image)
- Product recommendations

### Implementation

```python
"""
Project 4: Multimodal Product Search
"""

import streamlit as st
from PIL import Image
import base64
import io
from openai import OpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
import json

# ============================================
# CONFIGURATION
# ============================================

st.set_page_config(
    page_title="Product Search",
    page_icon="🛍️",
    layout="wide"
)

client = OpenAI()

# ============================================
# SAMPLE PRODUCTS
# ============================================

SAMPLE_PRODUCTS = [
    {
        "id": "prod_001",
        "name": "Wireless Bluetooth Headphones",
        "description": "High-quality over-ear headphones with active noise cancellation, 30-hour battery life, and premium sound quality.",
        "category": "Electronics",
        "price": 199.99,
        "features": ["Noise cancellation", "30h battery", "Bluetooth 5.0"]
    },
    {
        "id": "prod_002",
        "name": "Ergonomic Office Chair",
        "description": "Adjustable lumbar support, breathable mesh back, and 4D armrests for comfortable all-day seating.",
        "category": "Furniture",
        "price": 449.99,
        "features": ["Lumbar support", "Mesh back", "4D armrests"]
    },
    {
        "id": "prod_003",
        "name": "Smart Watch Pro",
        "description": "Fitness tracking, heart rate monitor, GPS, and 5-day battery life in a sleek titanium design.",
        "category": "Electronics",
        "price": 399.99,
        "features": ["Fitness tracking", "Heart rate", "GPS", "5-day battery"]
    },
    {
        "id": "prod_004",
        "name": "Premium Coffee Maker",
        "description": "Programmable 12-cup coffee maker with built-in grinder and thermal carafe.",
        "category": "Kitchen",
        "price": 179.99,
        "features": ["Built-in grinder", "Programmable", "Thermal carafe"]
    },
    {
        "id": "prod_005",
        "name": "Mechanical Keyboard",
        "description": "RGB backlit mechanical keyboard with Cherry MX switches and aluminum frame.",
        "category": "Electronics",
        "price": 149.99,
        "features": ["Cherry MX", "RGB", "Aluminum frame"]
    }
]

# ============================================
# PRODUCT SEARCH ENGINE
# ============================================

class ProductSearch:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        self.vectorstore = None
        self.products = {}
    
    def index_products(self, products: list):
        """Index products"""
        docs = []
        
        for product in products:
            # Create searchable text
            text = f"""
Product: {product['name']}
Category: {product['category']}
Description: {product['description']}
Features: {', '.join(product['features'])}
Price: ${product['price']}
            """.strip()
            
            doc = Document(
                page_content=text,
                metadata={
                    "id": product["id"],
                    "name": product["name"],
                    "category": product["category"],
                    "price": product["price"]
                }
            )
            docs.append(doc)
            self.products[product["id"]] = product
        
        self.vectorstore = Chroma.from_documents(
            documents=docs,
            embedding=self.embeddings
        )
    
    def search_text(self, query: str, k: int = 5, category: str = None) -> list:
        """Search by text"""
        
        filter_dict = {"category": category} if category else None
        
        results = self.vectorstore.similarity_search_with_relevance_scores(
            query, k=k, filter=filter_dict
        )
        
        return [
            {
                "product": self.products.get(doc.metadata["id"]),
                "score": score
            }
            for doc, score in results
            if doc.metadata["id"] in self.products
        ]
    
    def describe_image(self, image: Image.Image) -> str:
        """Get description of uploaded image"""
        
        # Convert to base64
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG")
        base64_image = base64.standard_b64encode(buffered.getvalue()).decode()
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Describe this product image in detail for search purposes. Include: type of product, colors, style, features, and any text visible."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=300
        )
        
        return response.choices[0].message.content
    
    def search_image(self, image: Image.Image, k: int = 5) -> list:
        """Search by image"""
        
        # Get image description
        description = self.describe_image(image)
        
        # Search using description
        results = self.search_text(description, k=k)
        
        return results, description
    
    def get_recommendations(self, product_id: str, k: int = 3) -> list:
        """Get similar products"""
        
        if product_id not in self.products:
            return []
        
        product = self.products[product_id]
        
        # Search for similar
        results = self.search_text(
            f"{product['name']} {product['description']}",
            k=k+1
        )
        
        # Exclude the same product
        return [r for r in results if r["product"]["id"] != product_id][:k]

# ============================================
# STREAMLIT UI
# ============================================

# Initialize
if "search" not in st.session_state:
    search = ProductSearch()
    search.index_products(SAMPLE_PRODUCTS)
    st.session_state.search = search

search = st.session_state.search

# Main
st.title("🛍️ Multimodal Product Search")

# Search tabs
tab1, tab2 = st.tabs(["🔤 Text Search", "📷 Image Search"])

with tab1:
    st.subheader("Search by Text")
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        text_query = st.text_input("What are you looking for?")
    
    with col2:
        category = st.selectbox(
            "Category",
            ["All", "Electronics", "Furniture", "Kitchen"]
        )
    
    if st.button("Search", key="text_search") and text_query:
        cat_filter = None if category == "All" else category
        results = search.search_text(text_query, category=cat_filter)
        
        if results:
            st.success(f"Found {len(results)} products")
            
            for result in results:
                product = result["product"]
                score = result["score"]
                
                with st.container():
                    col1, col2 = st.columns([2, 1])
                    
                    with col1:
                        st.markdown(f"### {product['name']}")
                        st.markdown(product["description"])
                        st.markdown(f"**Features:** {', '.join(product['features'])}")
                    
                    with col2:
                        st.metric("Price", f"${product['price']}")
                        st.caption(f"Match: {score:.1%}")
                        st.caption(f"Category: {product['category']}")
                    
                    st.markdown("---")
        else:
            st.warning("No products found")

with tab2:
    st.subheader("Search by Image")
    
    uploaded_image = st.file_uploader(
        "Upload a product image",
        type=["jpg", "jpeg", "png"]
    )
    
    if uploaded_image:
        image = Image.open(uploaded_image)
        st.image(image, width=300)
        
        if st.button("Find Similar Products"):
            with st.spinner("Analyzing image..."):
                results, description = search.search_image(image)
                
                st.markdown("**Image Analysis:**")
                st.info(description)
                
                st.markdown("**Similar Products:**")
                
                for result in results:
                    product = result["product"]
                    
                    with st.container():
                        st.markdown(f"### {product['name']}")
                        st.markdown(f"${product['price']} | {product['category']}")
                        st.markdown(product["description"][:100] + "...")
                        st.markdown("---")
```

### Deliverables
1. Text-based product search
2. Image-based product search
3. Product recommendations
4. Category filtering

---

## 🏢 Capstone: Enterprise Knowledge Base

### Objective
Build a complete enterprise knowledge base system with multi-user support, document management, and analytics.

### Features
- Multi-format document support
- Role-based access control
- Conversation history
- Analytics dashboard
- API endpoints
- Admin panel

### Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                  ENTERPRISE KNOWLEDGE BASE                      │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                       FRONTEND                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │   Chat   │  │  Search  │  │  Admin   │              │   │
│  │  │   UI     │  │   UI     │  │  Panel   │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                        API LAYER                         │   │
│  │  /chat  /search  /documents  /users  /analytics         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     SERVICE LAYER                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │   RAG    │  │   Auth   │  │Analytics │              │   │
│  │  │ Service  │  │ Service  │  │ Service  │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      DATA LAYER                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │ ChromaDB │  │ Postgres │  │  Redis   │              │   │
│  │  │ (Vectors)│  │  (Data)  │  │ (Cache)  │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

This capstone project combines all Week 5 skills into a production-ready application. Full implementation available in the course repository.

### Key Components to Build
1. **Document Service:** Multi-format ingestion and processing
2. **RAG Service:** Retrieval and generation
3. **User Service:** Authentication and authorization
4. **Analytics Service:** Usage tracking and reporting
5. **API Layer:** FastAPI with proper routing
6. **Frontend:** Streamlit with multiple pages
7. **Deployment:** Docker Compose setup

---

## 🎯 Submission Guidelines

For each project:

1. **Code:** Clean, documented Python code
2. **README:** Project overview and setup instructions
3. **Demo:** Screenshots or video walkthrough
4. **Reflection:** What you learned, challenges faced

---

**Congratulations on completing the Week 5 projects!** 🎉
