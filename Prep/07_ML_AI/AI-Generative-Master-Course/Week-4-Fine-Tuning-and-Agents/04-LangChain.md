# 🔗 LangChain: Building AI Applications

## 📚 Table of Contents
1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [LangChain Architecture](#-langchain-architecture)
3. [Core Components](#-core-components)
4. [Chains](#-chains)
5. [Memory](#-memory)
6. [Agents and Tools](#-agents-and-tools)
7. [Code Implementation](#-code-implementation)
8. [Real World Use Cases](#-real-world-use-cases)
9. [Mini Project](#-mini-project)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🔰 Beginner Friendly Explanation

### What is LangChain? (The LEGO Analogy)

```
Think of building an AI app like building with LEGOs:

Without LangChain:
├── Get raw LLM API
├── Handle prompts manually
├── Parse outputs yourself
├── Build memory from scratch
├── Connect tools individually
└── Result: 1000s of lines of boilerplate code

With LangChain:
├── Pre-built "LEGO blocks"
├── Snap them together
├── Standard interfaces
├── Everything just works
└── Result: Build complex AI apps in hours

LangChain is a FRAMEWORK for building LLM-powered applications.
It provides the building blocks and glue to connect them.
```

### Why Do We Need LangChain?

```
LLMs by themselves can:
├── Answer questions
├── Generate text
├── Translate
└── Summarize

But real applications need:
├── Connect to databases       → Tools
├── Remember conversations     → Memory
├── Use external APIs          → Integrations
├── Make decisions             → Agents
├── Process documents          → Document loaders
├── Chain multiple steps       → Chains

LangChain provides ALL of this!
```

### The Core Idea

```
LangChain = Chains of LLM Calls + Tools + Memory

Simple Example:

User: "What's the weather in Paris and should I bring an umbrella?"

Without LangChain:
1. Parse question (manual code)
2. Call weather API (write integration)
3. Format response (manual code)
4. Call LLM for advice (API call)
5. Combine results (manual code)

With LangChain:
chain = weather_tool | llm | output_parser
result = chain.invoke("What's the weather in Paris?")
# Done!
```

---

## 🎯 LangChain Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     LangChain Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                        APPLICATION                           ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ ││
│  │  │ Chains  │  │ Agents  │  │Retrieval│  │  Assistants     │ ││
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      CORE COMPONENTS                         ││
│  │  ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ││
│  │  │  Models  │ │Prompts │ │Parsers │ │ Memory │ │Callbacks│ ││
│  │  └──────────┘ └────────┘ └────────┘ └────────┘ └─────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      INTEGRATIONS                            ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            ││
│  │  │ OpenAI  │ │Anthropic│ │ Cohere  │ │ HuggingF│ ...       ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘            ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            ││
│  │  │ Chroma  │ │ Pinecone│ │ Weaviate│ │  FAISS  │ ...       ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### LangChain Expression Language (LCEL)

```python
# LCEL: The Modern Way to Build Chains

# Old way (deprecated)
chain = LLMChain(llm=llm, prompt=prompt)

# New way (LCEL) - Pipe syntax!
chain = prompt | llm | output_parser

# Why LCEL?
# ├── Cleaner syntax
# ├── Built-in streaming
# ├── Async support
# ├── Parallel execution
# └── Easy debugging
```

---

## 🧩 Core Components

### 1. Models (LLMs and Chat Models)

```python
"""
Models: The Brain of Your Application
"""

from langchain_openai import ChatOpenAI, OpenAI
from langchain_anthropic import ChatAnthropic
from langchain_community.llms import HuggingFaceHub

# ============================================
# CHAT MODELS (Recommended)
# ============================================

# OpenAI
chat_openai = ChatOpenAI(
    model="gpt-4",
    temperature=0.7,
    max_tokens=1000
)

# Anthropic Claude
chat_claude = ChatAnthropic(
    model="claude-3-sonnet-20240229",
    temperature=0.7
)

# ============================================
# LLMs (Completion Models)
# ============================================

# OpenAI completion
llm_openai = OpenAI(
    model="gpt-3.5-turbo-instruct",
    temperature=0.7
)

# HuggingFace
llm_hf = HuggingFaceHub(
    repo_id="google/flan-t5-large",
    model_kwargs={"temperature": 0.7}
)

# ============================================
# USING MODELS
# ============================================

from langchain_core.messages import HumanMessage, SystemMessage

messages = [
    SystemMessage(content="You are a helpful assistant."),
    HumanMessage(content="What is the capital of France?")
]

response = chat_openai.invoke(messages)
print(response.content)
# "The capital of France is Paris."
```

### 2. Prompts and Prompt Templates

```python
"""
Prompts: Structured Instructions for LLMs
"""

from langchain_core.prompts import (
    ChatPromptTemplate,
    PromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder
)

# ============================================
# SIMPLE PROMPT TEMPLATE
# ============================================

prompt = PromptTemplate(
    template="Translate the following to {language}: {text}",
    input_variables=["language", "text"]
)

# Format prompt
formatted = prompt.format(language="French", text="Hello world")
print(formatted)
# "Translate the following to French: Hello world"

# ============================================
# CHAT PROMPT TEMPLATE
# ============================================

chat_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a {role} assistant."),
    ("human", "{question}")
])

messages = chat_prompt.format_messages(
    role="helpful",
    question="What is AI?"
)

# ============================================
# WITH MESSAGE HISTORY
# ============================================

chat_prompt_with_history = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

# ============================================
# FEW-SHOT PROMPTING
# ============================================

from langchain_core.prompts import FewShotPromptTemplate

examples = [
    {"input": "happy", "output": "sad"},
    {"input": "tall", "output": "short"},
    {"input": "fast", "output": "slow"},
]

example_prompt = PromptTemplate(
    template="Input: {input}\nOutput: {output}",
    input_variables=["input", "output"]
)

few_shot_prompt = FewShotPromptTemplate(
    examples=examples,
    example_prompt=example_prompt,
    prefix="Give the opposite of each word:",
    suffix="Input: {input}\nOutput:",
    input_variables=["input"]
)

print(few_shot_prompt.format(input="hot"))
# Give the opposite of each word:
# Input: happy
# Output: sad
# Input: tall
# Output: short
# Input: fast
# Output: slow
# Input: hot
# Output:
```

### 3. Output Parsers

```python
"""
Output Parsers: Structure LLM Outputs
"""

from langchain_core.output_parsers import (
    StrOutputParser,
    JsonOutputParser,
    PydanticOutputParser
)
from langchain_core.pydantic_v1 import BaseModel, Field

# ============================================
# STRING PARSER
# ============================================

str_parser = StrOutputParser()
# Just returns the string content

# ============================================
# JSON PARSER
# ============================================

json_parser = JsonOutputParser()

prompt = ChatPromptTemplate.from_messages([
    ("system", "Extract information and return as JSON."),
    ("human", "Extract name and age from: {text}")
])

chain = prompt | llm | json_parser

result = chain.invoke({"text": "John is 25 years old"})
print(result)
# {"name": "John", "age": 25}

# ============================================
# PYDANTIC PARSER (Strongly Typed)
# ============================================

class Person(BaseModel):
    name: str = Field(description="Person's name")
    age: int = Field(description="Person's age")
    occupation: str = Field(description="Person's job")

pydantic_parser = PydanticOutputParser(pydantic_object=Person)

prompt = ChatPromptTemplate.from_messages([
    ("system", "Extract person information.\n{format_instructions}"),
    ("human", "{text}")
])

chain = prompt | llm | pydantic_parser

result = chain.invoke({
    "text": "John is a 25-year-old software engineer",
    "format_instructions": pydantic_parser.get_format_instructions()
})

print(result)
# Person(name='John', age=25, occupation='software engineer')
print(result.name)  # "John"
print(result.age)   # 25
```

---

## 🔗 Chains

### Simple Chains with LCEL

```python
"""
Chains: Combining Components
"""

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# ============================================
# BASIC CHAIN
# ============================================

llm = ChatOpenAI(model="gpt-4")

prompt = ChatPromptTemplate.from_template(
    "Tell me a {adjective} joke about {topic}"
)

# LCEL: Pipe syntax
chain = prompt | llm | StrOutputParser()

# Run
result = chain.invoke({
    "adjective": "funny",
    "topic": "programming"
})
print(result)

# ============================================
# STREAMING
# ============================================

# Stream response
for chunk in chain.stream({"adjective": "funny", "topic": "AI"}):
    print(chunk, end="", flush=True)

# ============================================
# ASYNC
# ============================================

import asyncio

async def run_async():
    result = await chain.ainvoke({
        "adjective": "funny",
        "topic": "robots"
    })
    return result

# asyncio.run(run_async())

# ============================================
# BATCH PROCESSING
# ============================================

inputs = [
    {"adjective": "funny", "topic": "cats"},
    {"adjective": "clever", "topic": "dogs"},
    {"adjective": "silly", "topic": "birds"}
]

results = chain.batch(inputs)
for r in results:
    print(r)
```

### Sequential Chains

```python
"""
Sequential Chains: Multi-Step Processing
"""

from langchain_core.runnables import RunnablePassthrough, RunnableLambda

# ============================================
# CHAIN MULTIPLE STEPS
# ============================================

# Step 1: Generate outline
outline_prompt = ChatPromptTemplate.from_template(
    "Create a brief outline for an article about {topic}"
)

# Step 2: Write article from outline
article_prompt = ChatPromptTemplate.from_template(
    "Write a short article based on this outline:\n{outline}"
)

# Step 3: Create title
title_prompt = ChatPromptTemplate.from_template(
    "Create a catchy title for this article:\n{article}"
)

# Chain them together
chain = (
    {"topic": RunnablePassthrough()}
    | outline_prompt
    | llm
    | StrOutputParser()
    | {"outline": RunnablePassthrough()}
    | article_prompt
    | llm
    | StrOutputParser()
    | {"article": RunnablePassthrough()}
    | title_prompt
    | llm
    | StrOutputParser()
)

result = chain.invoke("artificial intelligence")
print(result)

# ============================================
# WITH INTERMEDIATE OUTPUTS
# ============================================

from langchain_core.runnables import RunnableParallel

# Get all intermediate steps
chain_with_steps = RunnableParallel(
    outline=outline_prompt | llm | StrOutputParser(),
    topic=RunnablePassthrough()
)

# Then continue
full_chain = (
    chain_with_steps
    | RunnableLambda(lambda x: {
        "outline": x["outline"],
        "topic": x["topic"]
    })
    | article_prompt
    | llm
    | StrOutputParser()
)
```

### Branching Chains

```python
"""
Branching: Conditional Logic in Chains
"""

from langchain_core.runnables import RunnableBranch

# ============================================
# ROUTE BASED ON INPUT
# ============================================

# Different prompts for different types
tech_prompt = ChatPromptTemplate.from_template(
    "You are a tech expert. Answer: {question}"
)

general_prompt = ChatPromptTemplate.from_template(
    "You are a helpful assistant. Answer: {question}"
)

code_prompt = ChatPromptTemplate.from_template(
    "You are a coding assistant. Answer: {question}"
)

def classify_question(input_dict):
    question = input_dict["question"].lower()
    if "code" in question or "python" in question:
        return "code"
    elif "computer" in question or "ai" in question:
        return "tech"
    else:
        return "general"

# Branch based on classification
branch = RunnableBranch(
    (lambda x: classify_question(x) == "code", code_prompt),
    (lambda x: classify_question(x) == "tech", tech_prompt),
    general_prompt  # Default
)

chain = branch | llm | StrOutputParser()

# Test
print(chain.invoke({"question": "How do I write Python code?"}))
print(chain.invoke({"question": "What is artificial intelligence?"}))
print(chain.invoke({"question": "What's the weather like?"}))
```

---

## 🧠 Memory

### Conversation Memory

```python
"""
Memory: Maintaining Conversation Context
"""

from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# ============================================
# IN-MEMORY CHAT HISTORY
# ============================================

# Store for session histories
store = {}

def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]

# ============================================
# CHAIN WITH MEMORY
# ============================================

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

chain = prompt | llm | StrOutputParser()

# Wrap with message history
chain_with_memory = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history"
)

# ============================================
# USE THE CHAIN
# ============================================

# Session 1
config = {"configurable": {"session_id": "user_123"}}

response1 = chain_with_memory.invoke(
    {"input": "My name is John"},
    config=config
)
print(response1)  # "Hello John! Nice to meet you."

response2 = chain_with_memory.invoke(
    {"input": "What's my name?"},
    config=config
)
print(response2)  # "Your name is John."

# Different session
config2 = {"configurable": {"session_id": "user_456"}}

response3 = chain_with_memory.invoke(
    {"input": "What's my name?"},
    config=config2
)
print(response3)  # "I don't know your name yet."

# ============================================
# VIEW HISTORY
# ============================================

history = get_session_history("user_123")
for message in history.messages:
    print(f"{message.type}: {message.content}")
```

### Persistent Memory

```python
"""
Persistent Memory: Store conversations in database
"""

from langchain_community.chat_message_histories import (
    RedisChatMessageHistory,
    SQLChatMessageHistory,
    FileChatMessageHistory
)

# ============================================
# FILE-BASED MEMORY
# ============================================

def get_file_history(session_id: str):
    return FileChatMessageHistory(f"./chat_histories/{session_id}.json")

# ============================================
# REDIS MEMORY
# ============================================

def get_redis_history(session_id: str):
    return RedisChatMessageHistory(
        session_id=session_id,
        url="redis://localhost:6379"
    )

# ============================================
# SQL MEMORY
# ============================================

def get_sql_history(session_id: str):
    return SQLChatMessageHistory(
        session_id=session_id,
        connection_string="sqlite:///chat_history.db"
    )

# Use any of these with RunnableWithMessageHistory
chain_with_persistent_memory = RunnableWithMessageHistory(
    chain,
    get_redis_history,  # or get_sql_history, get_file_history
    input_messages_key="input",
    history_messages_key="history"
)
```

### Summary Memory

```python
"""
Summary Memory: Compress long conversations
"""

from langchain.memory import ConversationSummaryMemory
from langchain_openai import ChatOpenAI

# ============================================
# SUMMARY MEMORY
# ============================================

llm = ChatOpenAI(model="gpt-4")

summary_memory = ConversationSummaryMemory(
    llm=llm,
    return_messages=True
)

# After many messages, memory summarizes
summary_memory.save_context(
    {"input": "Hi, my name is John"},
    {"output": "Hello John! How can I help?"}
)

summary_memory.save_context(
    {"input": "I'm interested in learning about AI"},
    {"output": "AI is a fascinating field! What aspect interests you?"}
)

# Get summary
print(summary_memory.load_memory_variables({}))
# Returns a summary instead of all messages
```

---

## 🤖 Agents and Tools

### Understanding Agents

```
Agent = LLM + Tools + Reasoning

┌─────────────────────────────────────────────────────────────┐
│                       AGENT LOOP                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Input: "What's the weather in NYC and convert to F?"  │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────┐                │
│  │              LLM THINKS                  │                │
│  │  "I need to:                            │                │
│  │   1. Check weather (use weather tool)   │                │
│  │   2. Convert temperature (use calc)     │                │
│  │  Let me start with weather..."          │                │
│  └─────────────────────────────────────────┘                │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────┐                │
│  │          USE TOOL: Weather              │                │
│  │  Input: "NYC"                           │                │
│  │  Output: "15°C, partly cloudy"          │                │
│  └─────────────────────────────────────────┘                │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────┐                │
│  │              LLM THINKS                  │                │
│  │  "Got 15°C. Now convert to F..."        │                │
│  └─────────────────────────────────────────┘                │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────┐                │
│  │          USE TOOL: Calculator           │                │
│  │  Input: "15 * 9/5 + 32"                 │                │
│  │  Output: "59"                           │                │
│  └─────────────────────────────────────────┘                │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────┐                │
│  │           FINAL RESPONSE                 │                │
│  │  "NYC is 15°C (59°F), partly cloudy"    │                │
│  └─────────────────────────────────────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Creating Tools

```python
"""
Tools: Give LLMs Superpowers
"""

from langchain.tools import tool
from langchain_core.tools import Tool
from langchain_community.tools import DuckDuckGoSearchRun

# ============================================
# SIMPLE TOOL WITH DECORATOR
# ============================================

@tool
def get_word_length(word: str) -> int:
    """Returns the length of a word."""
    return len(word)

@tool
def multiply(a: int, b: int) -> int:
    """Multiply two numbers together."""
    return a * b

@tool
def get_current_time() -> str:
    """Get the current time."""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# ============================================
# COMPLEX TOOL
# ============================================

@tool
def search_database(query: str) -> str:
    """
    Search the company database for information.
    Use this when you need to find specific data.
    
    Args:
        query: The search query
        
    Returns:
        Search results as a string
    """
    # Simulate database search
    database = {
        "revenue": "$1.2B in 2023",
        "employees": "5000 employees worldwide",
        "products": "AI software and cloud services"
    }
    
    for key, value in database.items():
        if key in query.lower():
            return value
    
    return "No results found"

# ============================================
# TOOL FROM FUNCTION
# ============================================

def calculate_tip(bill: float, percentage: float = 15) -> float:
    """Calculate tip amount"""
    return bill * (percentage / 100)

tip_tool = Tool(
    name="tip_calculator",
    func=calculate_tip,
    description="Calculate tip. Input: bill amount. Returns tip amount."
)

# ============================================
# BUILT-IN TOOLS
# ============================================

# Web search
search = DuckDuckGoSearchRun()

# Wikipedia
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
wikipedia = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper())

# Python REPL
from langchain_experimental.tools import PythonREPLTool
python_repl = PythonREPLTool()
```

### Building Agents

```python
"""
Agents: Autonomous LLM Systems
"""

from langchain_openai import ChatOpenAI
from langchain.agents import create_openai_functions_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain import hub

# ============================================
# SETUP
# ============================================

llm = ChatOpenAI(model="gpt-4", temperature=0)

# Define tools
tools = [
    get_word_length,
    multiply,
    get_current_time,
    search_database
]

# ============================================
# CREATE AGENT
# ============================================

# Get a good prompt from LangChain Hub
prompt = hub.pull("hwchase17/openai-functions-agent")

# Or create your own
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful assistant with access to tools.
    
Use tools when needed to answer questions accurately.
Always explain your reasoning."""),
    MessagesPlaceholder(variable_name="chat_history", optional=True),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

# Create agent
agent = create_openai_functions_agent(llm, tools, prompt)

# Create executor
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,  # See agent's thinking
    max_iterations=10,
    handle_parsing_errors=True
)

# ============================================
# RUN AGENT
# ============================================

result = agent_executor.invoke({
    "input": "What's the current time and how many letters are in 'LangChain'?"
})
print(result["output"])

# Output shows agent's reasoning:
# > Entering new AgentExecutor chain...
# I need to use two tools: get_current_time and get_word_length
# 
# Invoking: `get_current_time` with ``
# 2024-01-15 14:30:00
# 
# Invoking: `get_word_length` with `LangChain`
# 9
# 
# The current time is 2024-01-15 14:30:00 and 'LangChain' has 9 letters.
```

### ReAct Agent Pattern

```python
"""
ReAct: Reasoning + Acting
The most common agent pattern
"""

from langchain.agents import create_react_agent

# ReAct prompt template
react_prompt = ChatPromptTemplate.from_template("""
Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought: {agent_scratchpad}
""")

# Create ReAct agent
react_agent = create_react_agent(llm, tools, react_prompt)

react_executor = AgentExecutor(
    agent=react_agent,
    tools=tools,
    verbose=True,
    handle_parsing_errors=True
)

result = react_executor.invoke({
    "input": "What is the revenue and multiply it by 2?"
})
```

---

## 💻 Code Implementation

### Complete Chatbot with Memory

```python
"""
Complete Chatbot Implementation
With memory, tools, and conversation management
"""

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain.tools import tool
from langchain.agents import create_openai_functions_agent, AgentExecutor
from datetime import datetime
import json

# ============================================
# SETUP
# ============================================

llm = ChatOpenAI(model="gpt-4", temperature=0.7)

# Session storage
session_store = {}

def get_session_history(session_id: str):
    if session_id not in session_store:
        session_store[session_id] = InMemoryChatMessageHistory()
    return session_store[session_id]

# ============================================
# DEFINE TOOLS
# ============================================

@tool
def get_weather(city: str) -> str:
    """Get current weather for a city."""
    # Simulated weather data
    weather_data = {
        "new york": {"temp": 72, "condition": "sunny"},
        "london": {"temp": 55, "condition": "rainy"},
        "tokyo": {"temp": 68, "condition": "cloudy"}
    }
    
    city_lower = city.lower()
    if city_lower in weather_data:
        w = weather_data[city_lower]
        return f"{city}: {w['temp']}°F, {w['condition']}"
    return f"Weather data not available for {city}"

@tool
def calculate(expression: str) -> str:
    """Evaluate a mathematical expression."""
    try:
        result = eval(expression)
        return f"{expression} = {result}"
    except:
        return "Invalid expression"

@tool
def get_date() -> str:
    """Get current date and time."""
    return datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")

@tool
def save_note(note: str) -> str:
    """Save a note for the user."""
    # In production, save to database
    with open("notes.json", "a") as f:
        json.dump({"time": str(datetime.now()), "note": note}, f)
        f.write("\n")
    return f"Note saved: {note}"

tools = [get_weather, calculate, get_date, save_note]

# ============================================
# CREATE AGENT WITH MEMORY
# ============================================

prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a friendly and helpful AI assistant named Aria.
    
You have access to tools to help users:
- get_weather: Check weather in cities
- calculate: Do math calculations  
- get_date: Get current date/time
- save_note: Save notes for users

Be conversational and remember previous messages in the conversation.
If users ask about previous messages, refer to the chat history."""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_openai_functions_agent(llm, tools, prompt)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True
)

# Wrap with memory
chatbot = RunnableWithMessageHistory(
    agent_executor,
    get_session_history,
    input_messages_key="input",
    history_messages_key="chat_history"
)

# ============================================
# CHATBOT CLASS
# ============================================

class Chatbot:
    def __init__(self):
        self.chatbot = chatbot
        
    def chat(self, message: str, session_id: str = "default"):
        config = {"configurable": {"session_id": session_id}}
        
        response = self.chatbot.invoke(
            {"input": message},
            config=config
        )
        
        return response["output"]
    
    def get_history(self, session_id: str):
        if session_id in session_store:
            return [
                {"role": m.type, "content": m.content}
                for m in session_store[session_id].messages
            ]
        return []
    
    def clear_history(self, session_id: str):
        if session_id in session_store:
            session_store[session_id].clear()

# ============================================
# USAGE
# ============================================

if __name__ == "__main__":
    bot = Chatbot()
    
    # Conversation
    print(bot.chat("Hi! My name is Alex.", "user_1"))
    print(bot.chat("What's the weather in London?", "user_1"))
    print(bot.chat("What's my name again?", "user_1"))
    print(bot.chat("Calculate 15 * 7 + 23", "user_1"))
    print(bot.chat("Save a note: Buy groceries tomorrow", "user_1"))
```

### RAG Chain (Retrieval-Augmented Generation)

```python
"""
RAG: Answer Questions from Documents
"""

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# ============================================
# 1. LOAD DOCUMENTS
# ============================================

# Load PDF
loader = PyPDFLoader("document.pdf")
documents = loader.load()

# Or load text
# loader = TextLoader("document.txt")
# documents = loader.load()

# ============================================
# 2. SPLIT INTO CHUNKS
# ============================================

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len
)

chunks = text_splitter.split_documents(documents)
print(f"Created {len(chunks)} chunks")

# ============================================
# 3. CREATE VECTOR STORE
# ============================================

embeddings = OpenAIEmbeddings()

vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)

# Create retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 4}
)

# ============================================
# 4. CREATE RAG CHAIN
# ============================================

llm = ChatOpenAI(model="gpt-4", temperature=0)

prompt = ChatPromptTemplate.from_template("""
Answer the question based only on the following context:

{context}

Question: {question}

Answer: Provide a detailed answer based on the context. If the answer is not in the context, say "I don't have enough information to answer this question."
""")

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# ============================================
# 5. ASK QUESTIONS
# ============================================

question = "What are the main points discussed in the document?"
answer = rag_chain.invoke(question)
print(answer)

# ============================================
# 6. WITH SOURCES
# ============================================

from langchain_core.runnables import RunnableParallel

rag_chain_with_sources = RunnableParallel(
    {"context": retriever, "question": RunnablePassthrough()}
) | RunnablePassthrough.assign(
    answer=lambda x: (
        prompt | llm | StrOutputParser()
    ).invoke({"context": format_docs(x["context"]), "question": x["question"]})
)

result = rag_chain_with_sources.invoke("What is the main topic?")
print(f"Answer: {result['answer']}")
print(f"Sources: {[doc.metadata for doc in result['context']]}")
```

---

## 🌍 Real World Use Cases

### 1. Customer Support Bot

```python
# Combines: Memory + RAG + Tools
# Features:
# - Remembers customer across sessions
# - Searches knowledge base
# - Can check order status
# - Escalates to human when needed
```

### 2. Research Assistant

```python
# Combines: Multiple LLMs + Web Search + Document Analysis
# Features:
# - Searches academic papers
# - Summarizes findings
# - Compares sources
# - Generates citations
```

### 3. Code Assistant

```python
# Combines: Code execution + File operations + Git
# Features:
# - Understands codebase
# - Writes and tests code
# - Creates pull requests
# - Explains code
```

### 4. Personal Assistant

```python
# Combines: Calendar + Email + Task management
# Features:
# - Schedules meetings
# - Drafts emails
# - Manages to-do lists
# - Sets reminders
```

---

## 🛠️ Mini Project: Build a Q&A Bot

```python
"""
Mini Project: Document Q&A Bot
Ask questions about uploaded documents
"""

import streamlit as st
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
import tempfile
import os

# ============================================
# STREAMLIT UI
# ============================================

st.title("📄 Document Q&A Bot")
st.write("Upload a PDF and ask questions about it!")

# Sidebar for API key
api_key = st.sidebar.text_input("OpenAI API Key", type="password")

if not api_key:
    st.warning("Please enter your OpenAI API key in the sidebar.")
    st.stop()

os.environ["OPENAI_API_KEY"] = api_key

# File upload
uploaded_file = st.file_uploader("Upload PDF", type="pdf")

if uploaded_file:
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(uploaded_file.getvalue())
        tmp_path = tmp.name
    
    # Process document
    with st.spinner("Processing document..."):
        # Load
        loader = PyPDFLoader(tmp_path)
        documents = loader.load()
        
        # Split
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = splitter.split_documents(documents)
        
        # Embed
        embeddings = OpenAIEmbeddings()
        vectorstore = Chroma.from_documents(chunks, embeddings)
        retriever = vectorstore.as_retriever()
        
        st.success(f"Processed {len(chunks)} chunks!")
    
    # Create chain
    llm = ChatOpenAI(model="gpt-4", temperature=0)
    
    prompt = ChatPromptTemplate.from_template("""
    Answer based on the context:
    
    Context: {context}
    
    Question: {question}
    
    Answer:""")
    
    def format_docs(docs):
        return "\n".join(doc.page_content for doc in docs)
    
    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    # Chat interface
    if "messages" not in st.session_state:
        st.session_state.messages = []
    
    # Display history
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.write(msg["content"])
    
    # Input
    if question := st.chat_input("Ask a question"):
        st.session_state.messages.append({"role": "user", "content": question})
        with st.chat_message("user"):
            st.write(question)
        
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                answer = chain.invoke(question)
                st.write(answer)
                st.session_state.messages.append({"role": "assistant", "content": answer})
    
    # Cleanup
    os.unlink(tmp_path)
```

---

## ❓ Interview Questions

### Beginner Level

**Q1: What is LangChain and why would you use it?**

> **A:** LangChain is a framework for building LLM-powered applications. Use it because:
> 1. **Modularity:** Pre-built components (prompts, chains, agents)
> 2. **Integrations:** Works with many LLMs and tools
> 3. **Memory:** Built-in conversation management
> 4. **Agents:** Create autonomous AI systems
> 5. **RAG:** Easy document Q&A

**Q2: What is the difference between a Chain and an Agent?**

> **A:**
> - **Chain:** Fixed sequence of steps. Input → Step 1 → Step 2 → Output
> - **Agent:** Dynamic decision-making. LLM decides which tools to use and in what order.
>
> Use chains for predictable workflows, agents for flexible problem-solving.

**Q3: What is LCEL?**

> **A:** LangChain Expression Language. The modern way to build chains using pipe syntax:
> ```python
> chain = prompt | llm | parser
> ```
> Benefits: cleaner code, streaming, async, parallel execution.

### Intermediate Level

**Q4: How does memory work in LangChain?**

> **A:** LangChain provides several memory types:
> - **ConversationBufferMemory:** Stores all messages
> - **ConversationSummaryMemory:** Summarizes long conversations
> - **VectorStoreMemory:** Semantic search over history
>
> Memory is injected into prompts via MessagesPlaceholder and managed by RunnableWithMessageHistory.

**Q5: Explain the ReAct agent pattern.**

> **A:** ReAct = Reasoning + Acting. The pattern:
> 1. **Thought:** LLM reasons about what to do
> 2. **Action:** Selects a tool to use
> 3. **Observation:** Gets result from tool
> 4. **Repeat:** Until reaching final answer
>
> This creates an interpretable chain of reasoning.

**Q6: What is RAG and how do you implement it in LangChain?**

> **A:** RAG = Retrieval-Augmented Generation
>
> Implementation:
> 1. Load documents → Split into chunks
> 2. Create embeddings → Store in vector DB
> 3. On query: Retrieve relevant chunks
> 4. Pass chunks + query to LLM
> 5. LLM answers using retrieved context
>
> ```python
> chain = retriever | prompt | llm
> ```

### Advanced Level

**Q7: How would you handle rate limiting and retries in LangChain?**

> **A:** Several approaches:
> ```python
> # Built-in retries
> llm = ChatOpenAI(max_retries=3)
> 
> # Custom retry logic
> from langchain_core.runnables import RunnableWithFallbacks
> 
> chain_with_fallback = chain.with_fallbacks([backup_chain])
> 
> # Rate limiting
> from langchain.callbacks import RateLimitHandler
> ```

**Q8: How do you handle long documents that exceed context length?**

> **A:** Strategies:
> 1. **Chunking:** Split into smaller pieces, process each
> 2. **Map-reduce:** Summarize each chunk, then summarize summaries
> 3. **Refine:** Process sequentially, refining answer
> 4. **RAG:** Only retrieve relevant chunks
>
> LangChain provides `load_summarize_chain` with these strategies built-in.

### FAANG Level

**Q9: Design a production LangChain system for a large-scale chatbot.**

> **A:** Architecture:
> ```
> Load Balancer
>      │
> API Gateway (rate limiting, auth)
>      │
> Application Servers (LangChain)
>      │
> ├── Redis (session memory)
> ├── Vector DB (document retrieval)
> ├── LLM API (OpenAI/self-hosted)
> └── Monitoring (LangSmith)
> ```
>
> Key considerations:
> - Async processing for throughput
> - Caching frequent queries
> - Fallback chains for reliability
> - Streaming for UX
> - Cost tracking per user

**Q10: How would you evaluate and improve a LangChain agent?**

> **A:** Evaluation framework:
> 1. **Task completion rate:** Does it solve the problem?
> 2. **Tool usage efficiency:** Minimal tool calls?
> 3. **Response quality:** Human evaluation
> 4. **Latency:** Time to response
> 5. **Cost:** Tokens used
>
> Improvements:
> - Better prompts (few-shot examples)
> - Better tool descriptions
> - Constrain tool choices
> - Add intermediate validation
> - Use LangSmith for debugging

---

## 📝 Homework

### Easy

1. Create a simple chain that translates text to 3 languages.
2. Build a chatbot with memory that remembers your name.
3. Create a tool that fetches weather data.

### Medium

4. Build a RAG system with your own documents.
5. Create an agent with 3+ custom tools.
6. Implement streaming responses in a Streamlit app.

### Hard

7. Build a multi-agent system where agents collaborate.
8. Implement a production-ready Q&A bot with:
   - Rate limiting
   - Error handling
   - Logging
   - Caching

### Expert

9. Design and implement a code review agent that:
   - Reads GitHub PRs
   - Analyzes code
   - Suggests improvements
   - Creates review comments

10. Build a research assistant that:
    - Searches multiple sources
    - Synthesizes information
    - Generates reports with citations

---

## 🎯 Key Takeaways

```
LangChain Essentials:
├── LCEL: prompt | llm | parser
├── Memory: RunnableWithMessageHistory
├── Tools: @tool decorator
├── Agents: LLM + Tools + Reasoning
├── RAG: Retriever + LLM
└── Chains: Sequential processing

When to Use What:
├── Simple task → Basic chain
├── Need context → Add memory
├── External data → Add tools
├── Complex reasoning → Use agent
├── Document Q&A → Use RAG
└── Production → Add all the above!

Best Practices:
├── Use LCEL (not legacy chains)
├── Add error handling
├── Implement streaming
├── Monitor with LangSmith
└── Test thoroughly
```

---

**Next: [05-LangGraph.md](./05-LangGraph.md)** - Build stateful, multi-actor AI applications! 🔄
