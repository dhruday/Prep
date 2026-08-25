# 🦙 Ollama: Running LLMs Locally

## 📚 Table of Contents
1. [Introduction](#-introduction)
2. [Beginner Explanation](#-beginner-explanation)
3. [Deep Technical Breakdown](#-deep-technical-breakdown)
4. [Installation & Setup](#-installation--setup)
5. [Working with Models](#-working-with-models)
6. [API & Integration](#-api--integration)
7. [Real-World Use Cases](#-real-world-use-cases)
8. [Hands-On Project](#-hands-on-project)
9. [Common Mistakes](#-common-mistakes)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🎯 Introduction

**Ollama** is an open-source tool that makes it incredibly easy to run large language models locally on your machine. Think of it as "Docker for LLMs" – it handles all the complexity of downloading, configuring, and running models with a simple command-line interface.

### Why Ollama?

| Cloud LLMs | Ollama (Local) |
|------------|----------------|
| Pay per token | Free after hardware |
| Data leaves your machine | Data stays local |
| Internet required | Works offline |
| Rate limits | No limits |
| Provider lock-in | Model flexibility |
| Latency varies | Consistent latency |

### Key Features

- 🚀 One-command model downloads
- 🔧 Easy model customization
- 🌐 REST API for integration
- 🐍 Python & JavaScript libraries
- 📦 Model file format (Modelfile)
- 🖥️ Cross-platform (Mac, Linux, Windows)

---

## 🧒 Beginner Explanation

### The "Music Player" Analogy

Think of running LLMs like playing music:

**Cloud LLMs (Streaming Service):**
```
You ──► Internet ──► Spotify Servers ──► Music
        (need WiFi)  (subscription)     (their catalog)
```

**Ollama (Local Music Library):**
```
You ──► Your Computer ──► Downloaded Music
        (no WiFi needed)  (your collection, free)
```

### What Ollama Does

```
┌─────────────────────────────────────────────────────────────┐
│                        YOUR COMPUTER                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐     ┌─────────────────┐     ┌─────────────┐   │
│  │ Terminal│────▶│     OLLAMA      │────▶│   Response  │   │
│  │ "Hi!"   │     │  ┌───────────┐  │     │   "Hello!"  │   │
│  └─────────┘     │  │  Llama 3  │  │     └─────────────┘   │
│                  │  │  (7B)     │  │                        │
│                  │  └───────────┘  │                        │
│                  └─────────────────┘                        │
│                                                              │
│  No internet needed! Data never leaves!                     │
└─────────────────────────────────────────────────────────────┘
```

### Simple Commands

```bash
# Download and run a model
ollama run llama3

# List your models
ollama list

# That's it! You're chatting with an LLM locally!
```

---

## 🔬 Deep Technical Breakdown

### Ollama Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      OLLAMA ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      CLI / API CLIENT                        ││
│  └─────────────────────────────┬───────────────────────────────┘│
│                                │                                 │
│  ┌─────────────────────────────▼───────────────────────────────┐│
│  │                       OLLAMA SERVER                          ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         ││
│  │  │   Model     │  │   Request   │  │    Cache    │         ││
│  │  │   Manager   │  │   Handler   │  │   Manager   │         ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘         ││
│  └─────────────────────────────┬───────────────────────────────┘│
│                                │                                 │
│  ┌─────────────────────────────▼───────────────────────────────┐│
│  │                    INFERENCE ENGINE                          ││
│  │  ┌───────────────────────────────────────────────────────┐  ││
│  │  │                    llama.cpp                           │  ││
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │  ││
│  │  │  │ Tokenize│─▶│ Forward │─▶│ Sample  │─▶│ Decode  │  │  ││
│  │  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │  ││
│  │  └───────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    MODEL STORAGE                             ││
│  │  ~/.ollama/models/                                          ││
│  │  ├── llama3/                                                ││
│  │  ├── mistral/                                               ││
│  │  └── codellama/                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. llama.cpp Backend
Ollama uses `llama.cpp` for inference:
- Written in C/C++ for performance
- Supports quantization (4-bit, 8-bit)
- CPU and GPU acceleration
- Memory-mapped model loading

#### 2. Model Format (GGUF)
Models are stored in GGUF format:
- **G**PU-ready
- **G**eneral
- **U**nified
- **F**ormat

```
GGUF File Structure:
├── Header (magic number, version)
├── Metadata (model config, tokenizer)
├── Tensor Info (names, shapes, offsets)
└── Tensor Data (quantized weights)
```

#### 3. Quantization Levels

| Quantization | Bits | Memory | Quality | Speed |
|--------------|------|--------|---------|-------|
| F16 | 16 | High | Best | Slow |
| Q8_0 | 8 | Medium | Great | Medium |
| Q4_0 | 4 | Low | Good | Fast |
| Q4_K_M | 4 | Low | Better | Fast |
| Q2_K | 2 | Lowest | Okay | Fastest |

**Memory Formula:**
$$\text{Memory (GB)} \approx \frac{\text{Parameters (B)} \times \text{Bits}}{8 \times 10^9}$$

Example: 7B model at 4-bit:
$$\text{Memory} = \frac{7 \times 10^9 \times 4}{8 \times 10^9} = 3.5 \text{ GB}$$

---

## 🛠️ Installation & Setup

### Windows Installation

```powershell
# Download from https://ollama.com/download
# Or use winget
winget install Ollama.Ollama

# Verify installation
ollama --version
```

### macOS Installation

```bash
# Using Homebrew
brew install ollama

# Or download from https://ollama.com/download
```

### Linux Installation

```bash
# One-line install
curl -fsSL https://ollama.com/install.sh | sh

# Verify
ollama --version
```

### GPU Support

| GPU | Support | Setup |
|-----|---------|-------|
| NVIDIA | Full | Install CUDA drivers |
| AMD (ROCm) | Linux only | ROCm 5.6+ |
| Apple Silicon | Native | Automatic |
| Intel Arc | Experimental | oneAPI |

```bash
# Check GPU detection
ollama run llama3 --verbose
# Look for: "using GPU" or "CUDA"
```

---

## 🤖 Working with Models

### Downloading Models

```bash
# Download a model
ollama pull llama3

# Download specific size
ollama pull llama3:8b
ollama pull llama3:70b

# Download quantized version
ollama pull llama3:8b-q4_0
```

### Popular Models

| Model | Sizes | Best For |
|-------|-------|----------|
| **llama3** | 8B, 70B | General purpose |
| **mistral** | 7B | Fast, efficient |
| **codellama** | 7B, 13B, 34B | Code generation |
| **mixtral** | 8x7B | MoE, powerful |
| **phi3** | 3.8B | Small, efficient |
| **gemma2** | 2B, 9B, 27B | Google's model |
| **qwen2** | 0.5B-72B | Multilingual |
| **deepseek-coder** | 1.3B-33B | Coding |

### Running Models

```bash
# Interactive chat
ollama run llama3

# Single prompt
ollama run llama3 "Explain quantum computing"

# With system prompt
ollama run llama3 "You are a pirate. Say hello." --system "Always respond as a pirate"
```

### Model Management

```bash
# List installed models
ollama list

# Show model details
ollama show llama3

# Remove a model
ollama rm llama3

# Copy/rename a model
ollama cp llama3 my-llama
```

### Creating Custom Models (Modelfile)

```dockerfile
# Modelfile - Custom model definition

# Base model
FROM llama3:8b

# Set parameters
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx 4096

# System prompt
SYSTEM """
You are a helpful AI assistant specializing in Python programming.
Always provide working code examples.
Explain your reasoning step by step.
"""

# Template for chat format
TEMPLATE """
{{ if .System }}<|system|>
{{ .System }}<|end|>
{{ end }}{{ if .Prompt }}<|user|>
{{ .Prompt }}<|end|>
{{ end }}<|assistant|>
{{ .Response }}<|end|>
"""
```

```bash
# Create custom model
ollama create python-assistant -f Modelfile

# Run your custom model
ollama run python-assistant
```

---

## 🌐 API & Integration

### REST API

Ollama runs a local server on port 11434:

```bash
# Start server (usually automatic)
ollama serve
```

#### Generate Completion

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3",
  "prompt": "Why is the sky blue?",
  "stream": false
}'
```

#### Chat Completion

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "llama3",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "stream": false
}'
```

#### Streaming Response

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3",
  "prompt": "Write a story",
  "stream": true
}'
```

### Python Integration

```python
"""
Ollama Python Integration Examples
"""

import ollama
import asyncio

# ============================================
# BASIC USAGE
# ============================================

# Simple generation
response = ollama.generate(
    model='llama3',
    prompt='What is machine learning?'
)
print(response['response'])

# Chat completion
response = ollama.chat(
    model='llama3',
    messages=[
        {'role': 'system', 'content': 'You are a helpful assistant.'},
        {'role': 'user', 'content': 'Explain Python decorators.'}
    ]
)
print(response['message']['content'])

# ============================================
# STREAMING
# ============================================

def stream_response():
    """Stream response tokens"""
    stream = ollama.chat(
        model='llama3',
        messages=[
            {'role': 'user', 'content': 'Write a haiku about coding.'}
        ],
        stream=True
    )
    
    for chunk in stream:
        print(chunk['message']['content'], end='', flush=True)
    print()

# ============================================
# ASYNC USAGE
# ============================================

async def async_chat():
    """Async chat completion"""
    response = await ollama.AsyncClient().chat(
        model='llama3',
        messages=[
            {'role': 'user', 'content': 'Hello!'}
        ]
    )
    return response['message']['content']

# ============================================
# EMBEDDINGS
# ============================================

def get_embeddings():
    """Generate embeddings for RAG"""
    embeddings = ollama.embeddings(
        model='llama3',
        prompt='Machine learning is a subset of AI'
    )
    return embeddings['embedding']

# ============================================
# VISION (MULTIMODAL)
# ============================================

def analyze_image():
    """Analyze an image with LLaVA"""
    import base64
    
    # Read image
    with open('image.jpg', 'rb') as f:
        image_data = base64.b64encode(f.read()).decode()
    
    response = ollama.chat(
        model='llava',
        messages=[
            {
                'role': 'user',
                'content': 'What is in this image?',
                'images': [image_data]
            }
        ]
    )
    return response['message']['content']

# ============================================
# MODEL MANAGEMENT
# ============================================

def manage_models():
    """List and manage models"""
    # List models
    models = ollama.list()
    for model in models['models']:
        print(f"- {model['name']}: {model['size'] / 1e9:.1f} GB")
    
    # Pull a model
    ollama.pull('mistral')
    
    # Delete a model
    ollama.delete('old-model')

# ============================================
# CUSTOM OPTIONS
# ============================================

def custom_generation():
    """Generate with custom parameters"""
    response = ollama.generate(
        model='llama3',
        prompt='Write creative fiction:',
        options={
            'temperature': 0.9,
            'top_p': 0.95,
            'top_k': 50,
            'num_predict': 500,
            'repeat_penalty': 1.1,
            'seed': 42
        }
    )
    return response['response']
```

### LangChain Integration

```python
"""
Ollama with LangChain
"""

from langchain_community.llms import Ollama
from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# ============================================
# BASIC LLM
# ============================================

llm = Ollama(
    model="llama3",
    temperature=0.7
)

response = llm.invoke("What is the capital of France?")
print(response)

# ============================================
# CHAT MODEL
# ============================================

chat = ChatOllama(
    model="llama3",
    temperature=0
)

# Simple chain
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful coding assistant."),
    ("human", "{question}")
])

chain = prompt | chat | StrOutputParser()

result = chain.invoke({"question": "How do I read a file in Python?"})
print(result)

# ============================================
# EMBEDDINGS
# ============================================

embeddings = OllamaEmbeddings(model="llama3")

# Single embedding
vector = embeddings.embed_query("Hello world")
print(f"Embedding dimension: {len(vector)}")

# Multiple embeddings
vectors = embeddings.embed_documents([
    "First document",
    "Second document",
    "Third document"
])
print(f"Generated {len(vectors)} embeddings")

# ============================================
# RAG WITH OLLAMA
# ============================================

from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.runnables import RunnablePassthrough

def create_rag_chain(documents):
    """Create a RAG chain with Ollama"""
    
    # Split documents
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_documents(documents)
    
    # Create vector store
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=OllamaEmbeddings(model="llama3")
    )
    retriever = vectorstore.as_retriever(k=3)
    
    # Create prompt
    template = """Answer based on the context below.
    
Context: {context}

Question: {question}

Answer:"""
    
    prompt = ChatPromptTemplate.from_template(template)
    
    # Build chain
    chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | ChatOllama(model="llama3")
        | StrOutputParser()
    )
    
    return chain
```

---

## 🌍 Real-World Use Cases

### 1. Local Code Assistant

```python
"""
Local coding assistant with Ollama
"""

import ollama

def code_assistant(query: str, language: str = "python") -> str:
    """Get coding help locally"""
    
    response = ollama.chat(
        model='codellama',
        messages=[
            {
                'role': 'system',
                'content': f'''You are an expert {language} programmer.
                Provide clear, working code with explanations.
                Follow best practices and PEP 8 style.'''
            },
            {
                'role': 'user',
                'content': query
            }
        ],
        options={
            'temperature': 0.2,  # More deterministic for code
            'num_predict': 1000
        }
    )
    
    return response['message']['content']

# Usage
result = code_assistant("Write a function to find prime numbers")
print(result)
```

### 2. Private Document Q&A

```python
"""
Private document Q&A - data never leaves your machine
"""

import ollama
from pathlib import Path

def private_qa(document_path: str, question: str) -> str:
    """Answer questions about private documents"""
    
    # Read document
    content = Path(document_path).read_text()
    
    # Truncate if too long
    max_chars = 10000
    if len(content) > max_chars:
        content = content[:max_chars] + "..."
    
    response = ollama.chat(
        model='llama3',
        messages=[
            {
                'role': 'system',
                'content': 'Answer questions based only on the provided document. If the answer is not in the document, say so.'
            },
            {
                'role': 'user',
                'content': f"""Document:
{content}

Question: {question}"""
            }
        ]
    )
    
    return response['message']['content']

# Usage - analyze confidential documents locally
answer = private_qa("confidential_report.txt", "What are the key findings?")
```

### 3. Offline Translation

```python
"""
Offline translation with multilingual models
"""

def translate(text: str, target_language: str) -> str:
    """Translate text offline"""
    
    response = ollama.chat(
        model='qwen2',  # Good multilingual support
        messages=[
            {
                'role': 'system',
                'content': f'You are a translator. Translate the following text to {target_language}. Only output the translation, nothing else.'
            },
            {
                'role': 'user',
                'content': text
            }
        ],
        options={'temperature': 0.3}
    )
    
    return response['message']['content']

# Works without internet!
result = translate("Hello, how are you?", "Japanese")
print(result)  # こんにちは、お元気ですか？
```

### 4. Local Summarization Service

```python
"""
Summarization service for sensitive documents
"""

def summarize(
    text: str,
    style: str = "concise",
    max_words: int = 100
) -> str:
    """Summarize text locally"""
    
    style_prompts = {
        "concise": f"Summarize in {max_words} words or less.",
        "bullet": "Summarize as bullet points.",
        "eli5": "Explain like I'm 5 years old.",
        "technical": "Provide a technical summary."
    }
    
    response = ollama.chat(
        model='llama3',
        messages=[
            {
                'role': 'system',
                'content': f'You are a summarization expert. {style_prompts.get(style, style_prompts["concise"])}'
            },
            {
                'role': 'user',
                'content': f"Summarize this:\n\n{text}"
            }
        ]
    )
    
    return response['message']['content']
```

---

## 🛠️ Hands-On Project

### Project: Build a Local AI Chat Application

Create a complete chat application that runs entirely locally.

```python
"""
Local AI Chat Application with Ollama
Features:
- Multiple model support
- Conversation history
- System prompts
- Streaming responses
- Export conversations
"""

import ollama
import json
from datetime import datetime
from pathlib import Path
from typing import Generator, Optional

class LocalChatApp:
    def __init__(self, model: str = "llama3"):
        self.model = model
        self.conversation = []
        self.system_prompt = None
        self.history_dir = Path("chat_history")
        self.history_dir.mkdir(exist_ok=True)
    
    def set_model(self, model: str) -> bool:
        """Switch to a different model"""
        # Check if model exists
        models = ollama.list()
        available = [m['name'].split(':')[0] for m in models['models']]
        
        if model in available or any(model in m for m in available):
            self.model = model
            return True
        return False
    
    def set_system_prompt(self, prompt: str):
        """Set the system prompt"""
        self.system_prompt = prompt
    
    def clear_conversation(self):
        """Clear conversation history"""
        self.conversation = []
    
    def _build_messages(self) -> list:
        """Build messages list for API"""
        messages = []
        
        if self.system_prompt:
            messages.append({
                'role': 'system',
                'content': self.system_prompt
            })
        
        messages.extend(self.conversation)
        return messages
    
    def chat(self, user_message: str) -> str:
        """Send a message and get a response"""
        
        # Add user message
        self.conversation.append({
            'role': 'user',
            'content': user_message
        })
        
        # Get response
        response = ollama.chat(
            model=self.model,
            messages=self._build_messages()
        )
        
        assistant_message = response['message']['content']
        
        # Add to conversation
        self.conversation.append({
            'role': 'assistant',
            'content': assistant_message
        })
        
        return assistant_message
    
    def chat_stream(self, user_message: str) -> Generator[str, None, None]:
        """Stream a response token by token"""
        
        # Add user message
        self.conversation.append({
            'role': 'user',
            'content': user_message
        })
        
        # Stream response
        full_response = ""
        stream = ollama.chat(
            model=self.model,
            messages=self._build_messages(),
            stream=True
        )
        
        for chunk in stream:
            token = chunk['message']['content']
            full_response += token
            yield token
        
        # Add complete response to conversation
        self.conversation.append({
            'role': 'assistant',
            'content': full_response
        })
    
    def save_conversation(self, name: Optional[str] = None) -> str:
        """Save conversation to file"""
        
        if name is None:
            name = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        filepath = self.history_dir / f"{name}.json"
        
        data = {
            'model': self.model,
            'system_prompt': self.system_prompt,
            'timestamp': datetime.now().isoformat(),
            'conversation': self.conversation
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        return str(filepath)
    
    def load_conversation(self, name: str) -> bool:
        """Load a saved conversation"""
        
        filepath = self.history_dir / f"{name}.json"
        
        if not filepath.exists():
            return False
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        self.model = data['model']
        self.system_prompt = data.get('system_prompt')
        self.conversation = data['conversation']
        
        return True
    
    def list_saved_conversations(self) -> list:
        """List all saved conversations"""
        return [f.stem for f in self.history_dir.glob("*.json")]
    
    def get_stats(self) -> dict:
        """Get conversation statistics"""
        
        user_messages = [m for m in self.conversation if m['role'] == 'user']
        assistant_messages = [m for m in self.conversation if m['role'] == 'assistant']
        
        return {
            'model': self.model,
            'total_messages': len(self.conversation),
            'user_messages': len(user_messages),
            'assistant_messages': len(assistant_messages),
            'total_user_chars': sum(len(m['content']) for m in user_messages),
            'total_assistant_chars': sum(len(m['content']) for m in assistant_messages)
        }


# ============================================
# TERMINAL INTERFACE
# ============================================

def run_terminal_chat():
    """Run interactive chat in terminal"""
    
    app = LocalChatApp()
    
    print("=" * 50)
    print("🤖 Local AI Chat (Ollama)")
    print("=" * 50)
    print(f"Model: {app.model}")
    print("Commands: /model, /system, /clear, /save, /load, /stats, /quit")
    print("-" * 50)
    
    while True:
        try:
            user_input = input("\n👤 You: ").strip()
            
            if not user_input:
                continue
            
            # Handle commands
            if user_input.startswith('/'):
                cmd = user_input.split()[0].lower()
                
                if cmd == '/quit':
                    print("Goodbye!")
                    break
                
                elif cmd == '/model':
                    parts = user_input.split(maxsplit=1)
                    if len(parts) > 1:
                        if app.set_model(parts[1]):
                            print(f"✅ Model changed to: {app.model}")
                        else:
                            print(f"❌ Model not found: {parts[1]}")
                    else:
                        models = ollama.list()
                        print("Available models:")
                        for m in models['models']:
                            print(f"  - {m['name']}")
                
                elif cmd == '/system':
                    parts = user_input.split(maxsplit=1)
                    if len(parts) > 1:
                        app.set_system_prompt(parts[1])
                        print("✅ System prompt set")
                    else:
                        print(f"Current: {app.system_prompt or 'None'}")
                
                elif cmd == '/clear':
                    app.clear_conversation()
                    print("✅ Conversation cleared")
                
                elif cmd == '/save':
                    parts = user_input.split(maxsplit=1)
                    name = parts[1] if len(parts) > 1 else None
                    filepath = app.save_conversation(name)
                    print(f"✅ Saved to: {filepath}")
                
                elif cmd == '/load':
                    parts = user_input.split(maxsplit=1)
                    if len(parts) > 1:
                        if app.load_conversation(parts[1]):
                            print(f"✅ Loaded conversation: {parts[1]}")
                        else:
                            print(f"❌ Not found: {parts[1]}")
                    else:
                        saved = app.list_saved_conversations()
                        print(f"Saved conversations: {saved}")
                
                elif cmd == '/stats':
                    stats = app.get_stats()
                    for key, value in stats.items():
                        print(f"  {key}: {value}")
                
                else:
                    print(f"Unknown command: {cmd}")
                
                continue
            
            # Regular chat with streaming
            print("\n🤖 Assistant: ", end="", flush=True)
            for token in app.chat_stream(user_input):
                print(token, end="", flush=True)
            print()
            
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    run_terminal_chat()
```

---

## ⚠️ Common Mistakes

### 1. Not Checking Available Memory

```python
# ❌ Bad - Running 70B model on 8GB RAM
ollama run llama3:70b  # Will fail or be very slow!

# ✅ Good - Check model requirements first
def can_run_model(model_name: str, available_ram_gb: float) -> bool:
    """Check if model can run with available RAM"""
    model_sizes = {
        "llama3:8b": 4.5,
        "llama3:70b": 40,
        "mistral:7b": 4,
        "mixtral:8x7b": 26
    }
    required = model_sizes.get(model_name, 10)
    return available_ram_gb >= required * 1.2  # 20% buffer
```

### 2. Not Handling Timeouts

```python
# ❌ Bad - No timeout for slow models
response = ollama.generate(model='llama3', prompt='...')

# ✅ Good - Use timeout and error handling
import signal

def timeout_handler(signum, frame):
    raise TimeoutError("Model response took too long")

signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(30)  # 30 second timeout

try:
    response = ollama.generate(model='llama3', prompt='...')
finally:
    signal.alarm(0)  # Cancel timeout
```

### 3. Ignoring Context Length

```python
# ❌ Bad - Sending too much context
huge_document = "..." * 100000  # Way too long!
response = ollama.generate(prompt=huge_document)

# ✅ Good - Respect context limits
def truncate_context(text: str, max_tokens: int = 4096) -> str:
    """Truncate text to fit context window"""
    # Rough estimate: 4 chars = 1 token
    max_chars = max_tokens * 4
    if len(text) > max_chars:
        return text[:max_chars] + "\n[Truncated]"
    return text
```

### 4. Not Using Streaming for Long Responses

```python
# ❌ Bad - Waiting for complete response (poor UX)
response = ollama.generate(model='llama3', prompt='Write a long story')
print(response['response'])  # User waits a long time...

# ✅ Good - Stream for immediate feedback
for chunk in ollama.generate(model='llama3', prompt='Write a long story', stream=True):
    print(chunk['response'], end='', flush=True)
```

---

## 🎯 Interview Questions

### Q1: What is Ollama and why would you use it?

**Answer:**
Ollama is an open-source tool for running LLMs locally. You'd use it for:

1. **Privacy:** Data stays on your machine
2. **Cost:** No per-token charges
3. **Offline:** Works without internet
4. **Control:** Custom models and parameters
5. **Speed:** No network latency

It wraps llama.cpp and provides a Docker-like experience for models.

---

### Q2: Explain quantization in the context of local LLMs.

**Answer:**
Quantization reduces model precision to decrease memory usage:

| Precision | Memory/Parameter | Llama 7B Size |
|-----------|------------------|---------------|
| FP32 | 4 bytes | 28 GB |
| FP16 | 2 bytes | 14 GB |
| INT8 | 1 byte | 7 GB |
| INT4 | 0.5 bytes | 3.5 GB |

**Trade-off:** Lower precision = less memory + faster, but slightly reduced quality.

Common formats: Q4_0, Q4_K_M, Q8_0, Q2_K

---

### Q3: How does Ollama compare to cloud APIs?

**Answer:**

| Aspect | Ollama | Cloud API |
|--------|--------|-----------|
| **Cost** | Hardware only | Pay per token |
| **Privacy** | 100% local | Data leaves machine |
| **Latency** | Consistent | Network dependent |
| **Model options** | Open source only | Latest proprietary |
| **Offline** | Yes | No |
| **Quality** | Good (7B-70B) | Best (GPT-4, Claude) |
| **Scale** | Limited by hardware | Infinite |

**Use Ollama when:** Privacy critical, predictable costs, offline needed
**Use Cloud when:** Best quality needed, scaling required, no hardware

---

### Q4: How would you optimize Ollama for production?

**Answer:**

1. **Choose right model size:**
   - Match model to hardware
   - Use quantization (Q4_K_M good balance)

2. **Hardware optimization:**
   ```bash
   # Use GPU
   OLLAMA_NUM_GPU=1 ollama serve
   
   # Multiple GPUs
   OLLAMA_NUM_GPU=2 ollama serve
   ```

3. **Memory management:**
   - Preload frequently used models
   - Set appropriate context length

4. **Deployment:**
   - Run as service
   - Use load balancer for multiple instances
   - Monitor memory/GPU usage

5. **API optimization:**
   - Use streaming
   - Implement request queuing
   - Cache frequent responses

---

### Q5: Explain the Modelfile format.

**Answer:**
Modelfile is Ollama's configuration format (like Dockerfile):

```dockerfile
# Base model
FROM llama3:8b

# Model parameters
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_ctx 4096

# System prompt
SYSTEM "You are a helpful assistant"

# Custom template
TEMPLATE "{{ .Prompt }}"

# Adapter (for fine-tuned models)
ADAPTER ./path/to/adapter.bin
```

**Key directives:**
- `FROM`: Base model
- `PARAMETER`: Generation settings
- `SYSTEM`: Default system prompt
- `TEMPLATE`: Chat format
- `ADAPTER`: LoRA/fine-tune weights

---

## 📝 Homework

### Level 1: Basic
1. Install Ollama on your machine
2. Download and run 3 different models
3. Compare response quality and speed

### Level 2: Intermediate
1. Create a custom Modelfile for a Python tutor
2. Build a CLI chat app with conversation history
3. Integrate Ollama with LangChain for RAG

### Level 3: Advanced
1. Set up Ollama as a service with auto-restart
2. Build a multi-model router (choose model based on task)
3. Implement a caching layer for common queries

### Level 4: Expert
1. Deploy Ollama in Docker with GPU support
2. Build a load balancer for multiple Ollama instances
3. Create a benchmarking suite for model comparison

---

## 🔗 Resources

- [Ollama Official Site](https://ollama.com/)
- [Ollama GitHub](https://github.com/ollama/ollama)
- [Ollama Model Library](https://ollama.com/library)
- [llama.cpp](https://github.com/ggerganov/llama.cpp)
- [GGUF Format Spec](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)

---

**Next:** [03-Unsloth.md](./03-Unsloth.md) - Fast fine-tuning with Unsloth
