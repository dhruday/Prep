# 📘 LangChain - Framework for LLM Applications

---

## **Purpose (Why this exists):**

### **The LLM Application Problem:**

```javascript
const building_llm_apps_before_langchain = {
  challenges: {
    prompt_management: 'Manually format prompts for each use case',
    context_handling: 'No standard way to inject context',
    memory: 'How to remember conversation history?',
    data_integration: 'How to connect LLM with databases, APIs?',
    chaining: 'How to combine multiple LLM calls?',
    error_handling: 'Every app reinvents the wheel',
    
    result: 'Every developer writes 1000+ lines of boilerplate!'
  },
  
  example_pain: {
    task: 'Build chatbot that answers from company docs',
    without_langchain: [
      '1. Write doc loader (PDF, CSV, HTML...)',
      '2. Write text splitter',
      '3. Manage embeddings',
      '4. Build vector store',
      '5. Write retrieval logic',
      '6. Format prompts',
      '7. Manage conversation history',
      '8. Handle LLM API calls',
      '9. Parse outputs',
      '10. Error handling'
    ],
    time: '2-3 weeks',
    lines_of_code: '2000+'
  }
};

const langchain_solution = {
  vision: 'Standardize common LLM patterns into reusable components',
  
  with_langchain: [
    'from langchain import DocumentLoader, VectorStore, Chain',
    'loader = DocumentLoader("./docs")',
    'vectorstore = VectorStore.from_documents(docs)',
    'chain = RetrievalQA.from_chain_type(llm, vectorstore)',
    'answer = chain.run("Your question")'
  ],
  time: '1-2 hours',
  lines_of_code: '50',
  
  breakthrough: 'Production LLM apps in hours, not weeks!'
};
```

---

## **What it is:**

### **LangChain Core Concepts:**

```javascript
const langchain_ecosystem = {
  definition: 'Framework for developing applications powered by language models',
  
  core_abstraction: 'Chains - Sequences of calls to LLMs or other utilities',
  
  key_components: {
    models: {
      llms: 'LLM wrappers (OpenAI, Anthropic, HuggingFace)',
      chat_models: 'Chat-optimized models',
      embeddings: 'Text embedding models'
    },
    
    prompts: {
      templates: 'Reusable prompt templates',
      few_shot: 'Dynamic example selection',
      output_parsers: 'Structure LLM outputs'
    },
    
    memory: {
      buffer: 'Keep recent messages',
      summary: 'Summarize old messages',
      entity: 'Extract and remember entities',
      vector: 'Semantic search over history'
    },
    
    indexes: {
      document_loaders: 'Load from 50+ sources',
      text_splitters: 'Chunk documents intelligently',
      vectorstores: 'Store and search embeddings',
      retrievers: 'Fetch relevant documents'
    },
    
    chains: {
      simple: 'Single LLM call',
      sequential: 'Multiple steps in order',
      router: 'Route to different chains',
      retrieval_qa: 'Answer from documents'
    },
    
    agents: {
      tools: 'Give LLM access to external tools',
      react: 'Reasoning + Acting pattern',
      plan_execute: 'Plan then execute',
      autonomous: 'Self-directed agents'
    }
  }
};
```

### **Architecture Overview:**

```
┌────────────────────────────────────────────────┐
│           LangChain Application                │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│  CHAINS (Orchestration Layer)                  │
│  - Combine components                          │
│  - Define workflows                            │
└────────────────────────────────────────────────┘
         ↓            ↓            ↓
┌────────────┐  ┌──────────┐  ┌──────────┐
│   Models   │  │  Memory  │  │  Tools   │
│            │  │          │  │          │
│  LLM API   │  │ History  │  │ Search   │
│  Calls     │  │ Storage  │  │ Calc     │
└────────────┘  └──────────┘  └──────────┘
         ↓
┌────────────────────────────────────────────────┐
│  DATA LAYER                                    │
│  - Document Loaders                            │
│  - Vector Stores                               │
│  - Retrievers                                  │
└────────────────────────────────────────────────┘
```

---

## **How it works (Intuition):**

### **Chain Concept:**

```javascript
// Think of chains like cooking recipes

const cooking_recipe = {
  task: 'Make pasta',
  steps: [
    '1. Boil water',
    '2. Add pasta',
    '3. Cook 8 minutes',
    '4. Drain',
    '5. Add sauce',
    '6. Serve'
  ],
  
  note: 'Each step depends on previous step, creates a chain'
};

const langchain_equivalent = {
  task: 'Answer question from documents',
  chain: [
    '1. Receive question',
    '2. Retrieve relevant docs',
    '3. Format prompt with docs + question',
    '4. Call LLM',
    '5. Parse response',
    '6. Return answer'
  ],
  
  langchain_code: `
    chain = RetrievalQA.from_chain_type(
      llm=OpenAI(),
      retriever=vectorstore.as_retriever()
    )
    answer = chain.run("What is LangChain?")
  `,
  
  magic: 'LangChain handles all 6 steps automatically!'
};
```

### **Memory Intuition:**

```javascript
const conversation_without_memory = {
  user: "What's the capital of France?",
  ai: "Paris",
  
  user: "What's its population?",  // "its" refers to Paris
  ai: "I don't know what you're referring to",  // ❌ No memory!
  
  problem: 'Each call is independent, no context'
};

const conversation_with_memory = {
  memory: {
    buffer: ['User: Capital of France?', 'AI: Paris']
  },
  
  user: "What's its population?",
  
  prompt_sent_to_llm: `
    Previous conversation:
    User: What's the capital of France?
    AI: Paris
    
    New question: What's its population?
  `,
  
  ai: "Paris has a population of about 2.2 million",  // ✅ Remembers!
  
  magic: 'LangChain automatically manages conversation history'
};
```

---

## **How it works (Math – simplified):**

### **Retrieval Chain Mathematics:**

```python
# Retrieval-Augmented Generation (RAG) Math

def retrieval_qa_chain(question, documents):
    """
    Math behind LangChain's RetrievalQA chain
    """
    # Step 1: Embed question
    # q_embedding = Embed(question) ∈ ℝ^d
    q_embedding = embedding_model.embed(question)
    # q_embedding shape: [768]
    
    # Step 2: Embed all documents (done once, cached)
    # d_i = Embed(document_i) ∈ ℝ^d
    doc_embeddings = [embedding_model.embed(doc) for doc in documents]
    # doc_embeddings shape: [num_docs, 768]
    
    # Step 3: Calculate similarity
    # similarity(q, d_i) = cos(q, d_i) = (q · d_i) / (||q|| × ||d_i||)
    similarities = []
    for doc_emb in doc_embeddings:
        sim = cosine_similarity(q_embedding, doc_emb)
        # sim = dot(q, d) / (norm(q) * norm(d))
        similarities.append(sim)
    
    # Step 4: Retrieve top-k most similar documents
    # top_k = argsort(similarities)[-k:]
    top_k_indices = np.argsort(similarities)[-3:]  # Top 3
    relevant_docs = [documents[i] for i in top_k_indices]
    
    # Step 5: Format prompt
    context = "\n\n".join(relevant_docs)
    prompt = f"""
    Answer the question based on the context below.
    
    Context: {context}
    
    Question: {question}
    
    Answer:
    """
    
    # Step 6: Generate answer
    # P(answer | question, context) = LLM(prompt)
    answer = llm.generate(prompt)
    
    return answer


# Information flow:
"""
Question → Embedding → Similarity Search → Retrieve Docs
                                                ↓
                                          Format Prompt
                                                ↓
                                           LLM Generate
                                                ↓
                                              Answer
"""
```

### **Sequential Chain Mathematics:**

```python
# Sequential Chain: Output of one step feeds into next

def sequential_chain_example():
    """
    Chain: Translate → Summarize → Extract Keywords
    """
    # Chain structure:
    # f1: text → translation
    # f2: translation → summary
    # f3: summary → keywords
    # Final: keywords = f3(f2(f1(text)))
    
    # Step 1: Translation
    # P(translation | text) = LLM1(prompt1)
    prompt1 = f"Translate to English: {text}"
    translation = llm(prompt1)
    
    # Step 2: Summarization
    # P(summary | translation) = LLM2(prompt2)
    prompt2 = f"Summarize: {translation}"
    summary = llm(prompt2)
    
    # Step 3: Keyword extraction
    # P(keywords | summary) = LLM3(prompt3)
    prompt3 = f"Extract keywords: {summary}"
    keywords = llm(prompt3)
    
    return keywords


# Mathematical composition:
"""
Let f_i be the i-th step
Output = f_n ∘ f_{n-1} ∘ ... ∘ f_2 ∘ f_1 (input)

Each f_i is typically:
  f_i(x) = LLM(template_i.format(x))
"""
```

---

## **Visual Explanation (described):**

### **Simple Chain Flow:**

```
USER QUESTION: "What is LangChain?"
        ↓
┌───────────────────────────────┐
│  Prompt Template              │
│  "Explain {concept} simply"   │
│  concept = "LangChain"        │
└───────────────────────────────┘
        ↓
┌───────────────────────────────┐
│  LLM (OpenAI GPT-4)           │
│  Generate response            │
└───────────────────────────────┘
        ↓
┌───────────────────────────────┐
│  Output Parser                │
│  Structure response           │
└───────────────────────────────┘
        ↓
ANSWER: "LangChain is a framework..."
```

### **Retrieval QA Chain:**

```
USER: "What did the CEO say about Q4?"
        ↓
┌────────────────────────────────────┐
│  1. RETRIEVER                      │
│  Search vector store for relevant  │
│  documents about Q4                │
└────────────────────────────────────┘
        ↓
Documents: [Doc1: Q4 earnings..., Doc2: CEO statement..., Doc3: Forecast...]
        ↓
┌────────────────────────────────────┐
│  2. PROMPT CONSTRUCTOR             │
│  Combine docs + question           │
│                                    │
│  Context: [Doc1, Doc2, Doc3]       │
│  Question: What did CEO say?       │
└────────────────────────────────────┘
        ↓
┌────────────────────────────────────┐
│  3. LLM                            │
│  Generate answer from context      │
└────────────────────────────────────┘
        ↓
┌────────────────────────────────────┐
│  4. RESPONSE                       │
│  "The CEO stated that Q4 showed    │
│   record revenue of $10M..."       │
└────────────────────────────────────┘
```

### **Conversational Chain with Memory:**

```
Turn 1:
USER: "What's the capital of France?"
        ↓
[Memory: Empty]
        ↓
LLM: "The capital of France is Paris."
        ↓
[Memory: Q: France capital? A: Paris] ← Save

Turn 2:
USER: "What's its population?"
        ↓
[Memory: Q: France capital? A: Paris] ← Load
        ↓
Prompt: """
Previous: Q: Capital? A: Paris
New Q: What's its population?
"""
        ↓
LLM: "Paris has ~2.2M people."
        ↓
[Memory: ...previous... + new Q&A] ← Update
```

---

## **Simple Example:**

### **JavaScript Conceptual Implementation:**

```javascript
// Conceptual LangChain-like framework

class SimpleLangChain {
  constructor(llm) {
    this.llm = llm;
  }
  
  // Basic chain
  createChain(template) {
    return {
      run: async (input) => {
        const prompt = template.replace('{input}', input);
        const response = await this.llm.generate(prompt);
        return response;
      }
    };
  }
  
  // Sequential chain
  createSequentialChain(steps) {
    return {
      run: async (input) => {
        let current = input;
        
        for (const step of steps) {
          const prompt = step.template.replace('{input}', current);
          current = await this.llm.generate(prompt);
          console.log(`${step.name}: ${current}`);
        }
        
        return current;
      }
    };
  }
  
  // Conversational chain with memory
  createConversationalChain() {
    const memory = [];
    
    return {
      run: async (input) => {
        // Build context from memory
        let context = '';
        for (const turn of memory) {
          context += `Human: ${turn.input}\nAI: ${turn.output}\n\n`;
        }
        
        // Add current question
        const prompt = `${context}Human: ${input}\nAI:`;
        
        // Generate response
        const response = await this.llm.generate(prompt);
        
        // Save to memory
        memory.push({ input, output: response });
        
        return response;
      },
      
      clearMemory: () => {
        memory.length = 0;
      }
    };
  }
}

// Mock LLM
class MockLLM {
  async generate(prompt) {
    // Simulate API call
    return `Response to: ${prompt.slice(0, 50)}...`;
  }
}

// Usage examples
async function examples() {
  const lc = new SimpleLangChain(new MockLLM());
  
  // 1. Simple chain
  const simpleChain = lc.createChain('Explain {input} in simple terms');
  const answer = await simpleChain.run('quantum computing');
  console.log('Simple Chain:', answer);
  
  // 2. Sequential chain
  const seqChain = lc.createSequentialChain([
    { name: 'Translate', template: 'Translate to French: {input}' },
    { name: 'Summarize', template: 'Summarize in 10 words: {input}' },
    { name: 'Keywords', template: 'Extract 3 keywords: {input}' }
  ]);
  
  const result = await seqChain.run('LangChain is awesome for building LLM apps');
  
  // 3. Conversational chain
  const chatChain = lc.createConversationalChain();
  
  await chatChain.run("What's the capital of France?");
  await chatChain.run("What's its population?");  // Remembers context!
}

examples();
```

### **Python Real Implementation:**

```python
# ============================================
# 1. Basic LangChain Setup
# ============================================

from langchain.llms import OpenAI
from langchain.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

# Initialize LLM
llm = OpenAI(temperature=0.7, openai_api_key="your-key")

# Create prompt template
template = """
You are a helpful assistant. Answer the following question:

Question: {question}

Answer:
"""

prompt = PromptTemplate(
    input_variables=["question"],
    template=template
)

# Create chain
chain = LLMChain(llm=llm, prompt=prompt)

# Run
response = chain.run(question="What is LangChain?")
print(response)


# ============================================
# 2. Sequential Chain
# ============================================

from langchain.chains import SimpleSequentialChain

# Step 1: Generate company name
llm1 = OpenAI(temperature=0.9)
prompt1 = PromptTemplate(
    input_variables=["product"],
    template="What is a good name for a company that makes {product}?"
)
chain1 = LLMChain(llm=llm1, prompt=prompt1)

# Step 2: Generate slogan for that company
llm2 = OpenAI(temperature=0.9)
prompt2 = PromptTemplate(
    input_variables=["company_name"],
    template="Write a catchy slogan for {company_name}"
)
chain2 = LLMChain(llm=llm2, prompt=prompt2)

# Combine into sequential chain
overall_chain = SimpleSequentialChain(
    chains=[chain1, chain2],
    verbose=True
)

result = overall_chain.run("AI-powered notebooks")
print(result)


# ============================================
# 3. Conversational Chain with Memory
# ============================================

from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory

llm = ChatOpenAI(temperature=0)
memory = ConversationBufferMemory()

conversation = ConversationChain(
    llm=llm,
    memory=memory,
    verbose=True
)

# Conversation
print(conversation.run("Hi, I'm learning about LangChain"))
print(conversation.run("What are chains?"))
print(conversation.run("Can you explain the first thing I said?"))  # Tests memory

# View memory
print("\nMemory:")
print(memory.buffer)


# ============================================
# 4. Retrieval QA Chain
# ============================================

from langchain.document_loaders import TextLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains import RetrievalQA

# Load documents
loader = TextLoader('company_docs.txt')
documents = loader.load()

# Split into chunks
text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
texts = text_splitter.split_documents(documents)

# Create embeddings and vector store
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_documents(texts, embeddings)

# Create retrieval QA chain
qa_chain = RetrievalQA.from_chain_type(
    llm=OpenAI(),
    chain_type="stuff",  # "stuff" all docs into context
    retriever=vectorstore.as_retriever(search_kwargs={"k": 3})
)

# Ask questions
response = qa_chain.run("What did the CEO say about Q4 earnings?")
print(response)


# ============================================
# 5. Different Memory Types
# ============================================

# Buffer Memory (keep N recent messages)
from langchain.memory import ConversationBufferWindowMemory

memory = ConversationBufferWindowMemory(k=2)  # Keep last 2 turns

# Summary Memory (summarize old messages)
from langchain.memory import ConversationSummaryMemory

memory = ConversationSummaryMemory(llm=OpenAI())

# Entity Memory (track entities mentioned)
from langchain.memory import ConversationEntityMemory

memory = ConversationEntityMemory(llm=OpenAI())

# Vector Store Memory (semantic search over history)
from langchain.memory import VectorStoreRetrieverMemory

memory = VectorStoreRetrieverMemory(retriever=vectorstore.as_retriever())


# ============================================
# 6. Router Chain
# ============================================

from langchain.chains.router import MultiPromptChain
from langchain.chains.router.llm_router import LLMRouterChain, RouterOutputParser

# Define prompts for different domains
physics_template = """You are a physics professor. Answer: {input}"""
math_template = """You are a math professor. Answer: {input}"""
history_template = """You are a history professor. Answer: {input}"""

prompt_infos = [
    {
        "name": "physics",
        "description": "Good for physics questions",
        "prompt_template": physics_template
    },
    {
        "name": "math",
        "description": "Good for math questions",
        "prompt_template": math_template
    },
    {
        "name": "history",
        "description": "Good for history questions",
        "prompt_template": history_template
    }
]

# Create destination chains
destination_chains = {}
for p_info in prompt_infos:
    name = p_info["name"]
    prompt = PromptTemplate(template=p_info["prompt_template"], input_variables=["input"])
    chain = LLMChain(llm=llm, prompt=prompt)
    destination_chains[name] = chain

# Create router
router_template = """Given input, route to appropriate destination.

Destinations: {destinations}

Input: {{input}}
Destination:"""

router_prompt = PromptTemplate(
    template=router_template,
    input_variables=["input"],
    partial_variables={"destinations": "\n".join([f"{p['name']}: {p['description']}" for p in prompt_infos])}
)

router_chain = LLMRouterChain.from_llm(llm, router_prompt)

# Create multi-prompt chain
chain = MultiPromptChain(
    router_chain=router_chain,
    destination_chains=destination_chains,
    default_chain=destination_chains["physics"],
    verbose=True
)

# Test routing
print(chain.run("What is Newton's second law?"))  # → physics
print(chain.run("What is 2+2?"))  # → math
print(chain.run("When was WWI?"))  # → history


# ============================================
# 7. Custom Chain
# ============================================

from langchain.chains.base import Chain
from typing import Dict, List

class CustomChain(Chain):
    """
    Custom chain that processes input through multiple steps
    """
    llm: OpenAI
    
    @property
    def input_keys(self) -> List[str]:
        return ["text"]
    
    @property
    def output_keys(self) -> List[str]:
        return ["result"]
    
    def _call(self, inputs: Dict[str, str]) -> Dict[str, str]:
        text = inputs["text"]
        
        # Step 1: Analyze sentiment
        sentiment_prompt = f"What is the sentiment of: {text}? Answer in one word."
        sentiment = self.llm(sentiment_prompt)
        
        # Step 2: Extract topics
        topics_prompt = f"What are the main topics in: {text}? List 3."
        topics = self.llm(topics_prompt)
        
        # Step 3: Generate summary
        summary_prompt = f"Summarize in one sentence: {text}"
        summary = self.llm(summary_prompt)
        
        result = f"""
        Sentiment: {sentiment}
        Topics: {topics}
        Summary: {summary}
        """
        
        return {"result": result}

# Usage
custom_chain = CustomChain(llm=OpenAI())
output = custom_chain({"text": "LangChain makes building LLM apps easy!"})
print(output["result"])


# ============================================
# 8. Production RAG Application
# ============================================

class ProductionRAGApp:
    def __init__(self, docs_path, openai_key):
        # Load documents
        from langchain.document_loaders import DirectoryLoader
        loader = DirectoryLoader(docs_path, glob="**/*.txt")
        documents = loader.load()
        
        # Split
        text_splitter = CharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separator="\n"
        )
        texts = text_splitter.split_documents(documents)
        
        # Create vector store
        embeddings = OpenAIEmbeddings(openai_api_key=openai_key)
        self.vectorstore = Chroma.from_documents(
            texts,
            embeddings,
            persist_directory="./chroma_db"
        )
        
        # Create QA chain
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=ChatOpenAI(temperature=0, openai_api_key=openai_key),
            chain_type="stuff",
            retriever=self.vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 4}
            ),
            return_source_documents=True
        )
    
    def ask(self, question):
        result = self.qa_chain({"query": question})
        return {
            "answer": result["result"],
            "sources": [doc.metadata for doc in result["source_documents"]]
        }

# Usage
app = ProductionRAGApp("./company_docs", "your-key")
response = app.ask("What is our refund policy?")
print(f"Answer: {response['answer']}")
print(f"Sources: {response['sources']}")
```

---

## **Real-World Applications:**

### **1. Customer Support Chatbot:**

```python
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory

class SupportChatbot:
    def __init__(self, knowledge_base_path):
        # Load KB
        loader = DirectoryLoader(knowledge_base_path)
        docs = loader.load()
        
        # Vector store
        texts = text_splitter.split_documents(docs)
        vectorstore = Chroma.from_documents(texts, OpenAIEmbeddings())
        
        # Memory
        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # Conversational retrieval chain
        self.chain = ConversationalRetrievalChain.from_llm(
            llm=ChatOpenAI(),
            retriever=vectorstore.as_retriever(),
            memory=memory
        )
    
    def chat(self, user_message):
        response = self.chain({"question": user_message})
        return response["answer"]

# Handles 1000s of customer queries automatically!
```

### **2. Code Documentation Assistant:**

```python
class CodeDocAssistant:
    def __init__(self, repo_path):
        # Load all code files
        loader = DirectoryLoader(repo_path, glob="**/*.py")
        docs = loader.load()
        
        # Create searchable index
        texts = text_splitter.split_documents(docs)
        self.vectorstore = Chroma.from_documents(texts, OpenAIEmbeddings())
        
        # QA chain
        self.chain = RetrievalQA.from_chain_type(
            llm=ChatOpenAI(),
            retriever=self.vectorstore.as_retriever()
        )
    
    def explain_function(self, function_name):
        return self.chain.run(f"Explain what {function_name} does")
    
    def find_usage(self, feature):
        return self.chain.run(f"How do I use {feature}? Show examples")

# Instant documentation for any codebase!
```

---

## **Common Misconceptions:**

### ❌ **Misconception 1: "LangChain is just prompt templates"**

**Reality:**
```python
langchain_is_much_more = {
    'yes_includes_prompts': True,
    
    'but_also': [
        'Memory management',
        'Document loading & chunking',
        'Vector store integrations',
        'Agent frameworks',
        'Tool integration',
        'Chain orchestration',
        'Streaming support',
        'Callback system',
        'Production utilities'
    ],
    
    'analogy': 'Saying LangChain is just prompts is like saying Django is just URLs'
}
```

### ❌ **Misconception 2: "Chains are always better than direct LLM calls"**

**Reality:**
```python
when_to_use_chains = {
    'use_chains': [
        'Multi-step workflows',
        'Need memory/context',
        'Document retrieval',
        'Tool use',
        'Complex orchestration'
    ],
    
    'use_direct_llm': [
        'Simple one-off generation',
        'Custom logic needed',
        'Maximum performance',
        'Non-standard patterns'
    ],
    
    'rule': 'Use chains for standard patterns, direct calls for custom logic'
}
```

---

## **Best Practices:**

### **1. Prompt Template Best Practices:**

```python
# Good: Structured templates
good_template = """
You are an expert {role}.

Context: {context}

Task: {task}

Format your answer as:
1. Summary
2. Details
3. Recommendations

Answer:
"""

# Bad: Unstructured
bad_template = "Answer this: {question}"


# Use few-shot examples
from langchain.prompts import FewShotPromptTemplate

examples = [
    {"input": "happy", "output": "sad"},
    {"input": "tall", "output": "short"}
]

template = FewShotPromptTemplate(
    examples=examples,
    example_prompt=PromptTemplate(
        input_variables=["input", "output"],
        template="Input: {input}\nOutput: {output}"
    ),
    prefix="Give the opposite of each word:",
    suffix="Input: {input}\nOutput:",
    input_variables=["input"]
)
```

### **2. Memory Management:**

```python
# Choose right memory type based on use case

# Short conversations
memory = ConversationBufferMemory()

# Long conversations (keep recent only)
memory = ConversationBufferWindowMemory(k=5)

# Very long conversations (summarize old ones)
memory = ConversationSummaryMemory(llm=llm)

# Track specific entities
memory = ConversationEntityMemory(llm=llm)

# Semantic search over history
memory = VectorStoreRetrieverMemory(retriever=retriever)
```

### **3. Retrieval Optimization:**

```python
# Optimize chunk size and overlap
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,  # Adjust based on model context
    chunk_overlap=200,  # Preserve context between chunks
    length_function=len,
    separators=["\n\n", "\n", " ", ""]
)

# Use appropriate retriever
retriever = vectorstore.as_retriever(
    search_type="mmr",  # Maximum Marginal Relevance (diverse results)
    search_kwargs={"k": 4, "fetch_k": 20}
)

# Add metadata for filtering
metadata = {"source": "manual.pdf", "page": 5}
```

---

## **Key Takeaways:**

```javascript
const langchain_mastery = {
  core_concept: 'Standardized components for LLM applications',
  
  key_abstractions: {
    chains: 'Combine multiple steps',
    memory: 'Remember conversation context',
    retrievers: 'Fetch relevant documents',
    agents: 'Give LLMs tools'
  },
  
  benefits: {
    speed: 'Build in hours, not weeks',
    reliability: 'Battle-tested patterns',
    flexibility: 'Highly composable',
    community: 'Huge ecosystem of integrations'
  },
  
  when_to_use: [
    'Document Q&A systems',
    'Chatbots with memory',
    'Multi-step workflows',
    'Tool-using agents',
    'Production LLM apps'
  ]
};
```

---

## ✅ **Review Questions:**

1. **Conceptual:**
   - What is a chain in LangChain?
   - Why is memory important?
   - What's the difference between RetrievalQA and ConversationalRetrievalChain?

2. **Technical:**
   - How does a SequentialChain work?
   - What are the different memory types?
   - How does retrieval augmentation work?

3. **Practical:**
   - When to use LangChain vs direct OpenAI API?
   - How to choose memory type?
   - How to optimize retrieval?

---

## 🧩 **Practice Problems:**

### **Problem 1: Custom Chain**

```python
# Build chain that:
# 1. Extracts entities from text
# 2. Looks up each entity in Wikipedia
# 3. Summarizes findings

class EntityResearchChain(Chain):
    # Implement
    pass
```

### **Problem 2: Multi-Source QA**

```python
# Build system that answers questions from:
# - PDF documents
# - Web pages
# - SQL database

# And cites sources
```

---

## 🚀 **Mini Project:**

**Build Company Knowledge Base:**

```python
class CompanyKB:
    def __init__(self):
        # Load from multiple sources
        # - Employee handbook (PDF)
        # - Company wiki (HTML)
        # - Slack history (JSON)
        # - Code repos (Python)
        
        # Create unified search
        # Add conversational interface
        # Track what info is accessed most
        pass
    
    def ask(self, question):
        # Retrieve + answer with sources
        pass
    
    def chat(self, message):
        # Conversational with memory
        pass
```

---

**🎉 LangChain Complete!**

You now understand:
- Chains for orchestration
- Memory for context
- Retrieval for document Q&A
- Production patterns

**Next:** **LangGraph** - Advanced agent workflows! 🚀
