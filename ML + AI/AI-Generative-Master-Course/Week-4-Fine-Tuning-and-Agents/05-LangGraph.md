# 🔄 LangGraph: Stateful AI Applications

## 📚 Table of Contents
1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [LangGraph Architecture](#-langgraph-architecture)
3. [Core Concepts](#-core-concepts)
4. [Building Graphs](#-building-graphs)
5. [State Management](#-state-management)
6. [Advanced Patterns](#-advanced-patterns)
7. [Code Implementation](#-code-implementation)
8. [Real World Use Cases](#-real-world-use-cases)
9. [Mini Project](#-mini-project)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🔰 Beginner Friendly Explanation

### What is LangGraph? (The Assembly Line Analogy)

```
Think of building a car on an assembly line:

Traditional LangChain (Linear):
┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐
│Frame│ → │Engine│ → │Paint│ → │Done │
└─────┘   └─────┘   └─────┘   └─────┘

Problem: What if paint fails? What if we need to add custom parts?

LangGraph (Graph-based):
                    ┌──────────┐
                    │ Add Roof │
                    └────┬─────┘
                         │
┌─────┐   ┌─────┐   ┌────▼────┐   ┌─────┐
│Frame│ → │Engine│ → │Assembly │ → │Paint│
└─────┘   └─────┘   └────┬────┘   └──┬──┘
                         │           │
                    ┌────▼────┐      │ (if fails)
                    │Add Extras│     │
                    └────┬────┘      │
                         │           │
                         ▼           │
                    ┌─────────┐      │
                    │  Done   │ ◄────┘
                    └─────────┘

LangGraph = Build AI workflows as GRAPHS, not lines!
```

### Why LangGraph?

```
LangChain Chains:
├── Linear flow (A → B → C)
├── Limited branching
├── Hard to manage complex state
└── Difficult to loop/retry

LangGraph:
├── Graph flow (any path possible)
├── Easy branching and loops
├── Built-in state management
├── Human-in-the-loop support
├── Checkpointing and resume
└── Multi-agent coordination
```

### Key Insight

```
LangGraph is to LangChain what:
├── React is to vanilla JavaScript
├── State machines are to if-else chains
└── Workflows are to scripts

It's about CONTROL FLOW and STATE MANAGEMENT
for complex AI applications.
```

---

## 🎯 LangGraph Architecture

### High-Level Overview

```
┌───────────────────────────────────────────────────────────────┐
│                    LangGraph Application                       │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                        STATE                             │  │
│  │  (Shared data passed between nodes)                     │  │
│  │  { messages: [], documents: [], status: "running" }     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                             │                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                        GRAPH                             │  │
│  │                                                          │  │
│  │    ┌──────┐        ┌──────┐        ┌──────┐            │  │
│  │    │ Node │  ───▶  │ Node │  ───▶  │ Node │            │  │
│  │    │  A   │        │  B   │        │  C   │            │  │
│  │    └──────┘        └──┬───┘        └──────┘            │  │
│  │                       │                                  │  │
│  │                       │ (conditional)                    │  │
│  │                       ▼                                  │  │
│  │                   ┌──────┐                               │  │
│  │                   │ Node │                               │  │
│  │                   │  D   │                               │  │
│  │                   └──────┘                               │  │
│  │                                                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                             │                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    CHECKPOINTING                         │  │
│  │  (Save/restore state for human-in-the-loop)             │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Concept | Description | Example |
|---------|-------------|---------|
| **State** | Shared data structure | `{"messages": [], "context": ""}` |
| **Node** | Function that processes state | `def chatbot(state): ...` |
| **Edge** | Connection between nodes | `graph.add_edge("A", "B")` |
| **Conditional Edge** | Dynamic routing | `if error: goto "retry"` |
| **Checkpoint** | Saved state | Resume after human input |

---

## 🧩 Core Concepts

### 1. State Definition

```python
"""
State: The Data Container
All nodes read from and write to state
"""

from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

# ============================================
# SIMPLE STATE
# ============================================

class SimpleState(TypedDict):
    """Basic state with just messages"""
    messages: Annotated[Sequence[BaseMessage], add_messages]

# ============================================
# COMPLEX STATE
# ============================================

class AgentState(TypedDict):
    """Full agent state"""
    # Messages (auto-append with add_messages)
    messages: Annotated[Sequence[BaseMessage], add_messages]
    
    # Current step
    current_step: str
    
    # Retrieved documents
    documents: list[str]
    
    # Tool results
    tool_results: dict
    
    # Error tracking
    error: str | None
    
    # Iteration count (for loops)
    iteration: int

# ============================================
# WHY ANNOTATED?
# ============================================

# add_messages tells LangGraph HOW to update messages
# Instead of replacing, it APPENDS new messages

# Without add_messages:
# state["messages"] = new_messages  # Replaces!

# With add_messages:
# state["messages"] += new_messages  # Appends!
```

### 2. Nodes

```python
"""
Nodes: The Processing Units
Each node is a function that takes state and returns updates
"""

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage

llm = ChatOpenAI(model="gpt-4")

# ============================================
# SIMPLE NODE
# ============================================

def chatbot_node(state: AgentState) -> dict:
    """Process messages and generate response"""
    
    # Get current messages
    messages = state["messages"]
    
    # Call LLM
    response = llm.invoke(messages)
    
    # Return state update (only what changes)
    return {"messages": [response]}

# ============================================
# TOOL-CALLING NODE
# ============================================

def tool_node(state: AgentState) -> dict:
    """Execute tools based on last message"""
    
    last_message = state["messages"][-1]
    
    results = {}
    if hasattr(last_message, "tool_calls"):
        for tool_call in last_message.tool_calls:
            # Execute tool
            result = execute_tool(tool_call)
            results[tool_call["name"]] = result
    
    return {
        "tool_results": results,
        "messages": [AIMessage(content=str(results))]
    }

# ============================================
# RETRIEVAL NODE
# ============================================

def retrieve_node(state: AgentState) -> dict:
    """Retrieve relevant documents"""
    
    query = state["messages"][-1].content
    
    # Search vector store
    docs = vectorstore.similarity_search(query, k=4)
    
    return {
        "documents": [doc.page_content for doc in docs]
    }

# ============================================
# CONDITIONAL NODE
# ============================================

def grade_documents(state: AgentState) -> dict:
    """Grade retrieved documents for relevance"""
    
    documents = state["documents"]
    query = state["messages"][-1].content
    
    # Grade each document
    graded = []
    for doc in documents:
        if is_relevant(doc, query):
            graded.append(doc)
    
    return {
        "documents": graded,
        "current_step": "generate" if graded else "websearch"
    }
```

### 3. Edges

```python
"""
Edges: The Connections
Define how nodes connect to each other
"""

from langgraph.graph import StateGraph, END

# Create graph
graph = StateGraph(AgentState)

# ============================================
# ADD NODES
# ============================================

graph.add_node("chatbot", chatbot_node)
graph.add_node("tools", tool_node)
graph.add_node("retrieve", retrieve_node)

# ============================================
# SIMPLE EDGES (Always go this way)
# ============================================

# chatbot → tools (always)
graph.add_edge("chatbot", "tools")

# ============================================
# CONDITIONAL EDGES (Choose based on state)
# ============================================

def should_continue(state: AgentState) -> str:
    """Decide what to do next"""
    
    last_message = state["messages"][-1]
    
    # If LLM wants to use tools
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    
    # Otherwise, end
    return "end"

graph.add_conditional_edges(
    "chatbot",  # From node
    should_continue,  # Decision function
    {
        "tools": "tools",  # If "tools" → go to tools node
        "end": END  # If "end" → finish
    }
)

# ============================================
# SET ENTRY POINT
# ============================================

graph.set_entry_point("chatbot")

# ============================================
# COMPILE
# ============================================

app = graph.compile()
```

---

## 🔨 Building Graphs

### Simple Chatbot Graph

```python
"""
Simple Chatbot with LangGraph
Basic example to understand the pattern
"""

from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

# ============================================
# 1. DEFINE STATE
# ============================================

class State(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

# ============================================
# 2. DEFINE NODES
# ============================================

llm = ChatOpenAI(model="gpt-4")

def chatbot(state: State) -> dict:
    """The chatbot node"""
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

# ============================================
# 3. BUILD GRAPH
# ============================================

# Create graph builder
graph_builder = StateGraph(State)

# Add node
graph_builder.add_node("chatbot", chatbot)

# Set entry point
graph_builder.set_entry_point("chatbot")

# Set exit
graph_builder.add_edge("chatbot", END)

# Compile
graph = graph_builder.compile()

# ============================================
# 4. RUN
# ============================================

# Single turn
result = graph.invoke({
    "messages": [HumanMessage(content="Hello! How are you?")]
})

print(result["messages"][-1].content)

# ============================================
# 5. VISUALIZE (Optional)
# ============================================

# Requires graphviz
# print(graph.get_graph().draw_mermaid())
```

### Chatbot with Tools

```python
"""
Chatbot with Tool Calling
The Agent pattern in LangGraph
"""

from typing import TypedDict, Annotated, Sequence, Literal
from langchain_core.messages import BaseMessage, HumanMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

# ============================================
# 1. DEFINE TOOLS
# ============================================

@tool
def get_weather(city: str) -> str:
    """Get weather for a city"""
    weather_data = {
        "london": "15°C, rainy",
        "paris": "18°C, sunny",
        "tokyo": "22°C, cloudy"
    }
    return weather_data.get(city.lower(), "Unknown city")

@tool
def calculate(expression: str) -> str:
    """Calculate a math expression"""
    try:
        return str(eval(expression))
    except:
        return "Error"

tools = [get_weather, calculate]

# ============================================
# 2. DEFINE STATE
# ============================================

class State(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

# ============================================
# 3. DEFINE NODES
# ============================================

# LLM with tools bound
llm = ChatOpenAI(model="gpt-4").bind_tools(tools)

def agent(state: State) -> dict:
    """The agent node - calls LLM"""
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

# Use prebuilt ToolNode
tool_node = ToolNode(tools)

# ============================================
# 4. DEFINE ROUTING
# ============================================

def should_continue(state: State) -> Literal["tools", "end"]:
    """Decide: use tools or end"""
    last_message = state["messages"][-1]
    
    if last_message.tool_calls:
        return "tools"
    return "end"

# ============================================
# 5. BUILD GRAPH
# ============================================

graph_builder = StateGraph(State)

# Add nodes
graph_builder.add_node("agent", agent)
graph_builder.add_node("tools", tool_node)

# Set entry point
graph_builder.set_entry_point("agent")

# Add conditional edge from agent
graph_builder.add_conditional_edges(
    "agent",
    should_continue,
    {
        "tools": "tools",
        "end": END
    }
)

# After tools, go back to agent
graph_builder.add_edge("tools", "agent")

# Compile
graph = graph_builder.compile()

# ============================================
# 6. RUN
# ============================================

result = graph.invoke({
    "messages": [HumanMessage(
        content="What's the weather in London and calculate 15 + 27"
    )]
})

for message in result["messages"]:
    print(f"{message.type}: {message.content[:100]}...")
```

---

## 🗄️ State Management

### Checkpointing (Persistence)

```python
"""
Checkpointing: Save and Resume State
Essential for human-in-the-loop
"""

from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.sqlite import SqliteSaver

# ============================================
# IN-MEMORY CHECKPOINTING
# ============================================

memory = MemorySaver()

graph = graph_builder.compile(checkpointer=memory)

# Run with thread_id
config = {"configurable": {"thread_id": "conversation_1"}}

result1 = graph.invoke(
    {"messages": [HumanMessage(content="My name is Alice")]},
    config=config
)

# Continue same conversation
result2 = graph.invoke(
    {"messages": [HumanMessage(content="What's my name?")]},
    config=config
)

print(result2["messages"][-1].content)
# "Your name is Alice"

# ============================================
# SQLITE CHECKPOINTING (Persistent)
# ============================================

with SqliteSaver.from_conn_string("checkpoints.db") as checkpointer:
    graph = graph_builder.compile(checkpointer=checkpointer)
    
    # Runs are saved to database
    result = graph.invoke(
        {"messages": [HumanMessage(content="Hello")]},
        config={"configurable": {"thread_id": "user_123"}}
    )
    
# Can resume later, even after restart!

# ============================================
# LIST CHECKPOINTS
# ============================================

# Get all checkpoints for a thread
checkpoints = list(memory.list(config))
for cp in checkpoints:
    print(f"Checkpoint: {cp.checkpoint_id}")
    print(f"State: {cp.checkpoint}")
```

### Human-in-the-Loop

```python
"""
Human-in-the-Loop: Pause for Human Input
Critical for production AI systems
"""

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

# ============================================
# DEFINE INTERRUPT POINTS
# ============================================

class State(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    requires_approval: bool

def generate_action(state: State) -> dict:
    """Generate an action that needs approval"""
    # Generate something that needs human review
    return {
        "messages": [AIMessage(content="I want to delete all files.")],
        "requires_approval": True
    }

def execute_action(state: State) -> dict:
    """Execute after approval"""
    return {
        "messages": [AIMessage(content="Action executed!")],
        "requires_approval": False
    }

# Build graph
graph_builder = StateGraph(State)
graph_builder.add_node("generate", generate_action)
graph_builder.add_node("execute", execute_action)

graph_builder.set_entry_point("generate")

# ============================================
# ADD INTERRUPT
# ============================================

# Compile with interrupt BEFORE execute
graph = graph_builder.compile(
    checkpointer=MemorySaver(),
    interrupt_before=["execute"]  # Pause here!
)

# ============================================
# RUN WITH INTERRUPT
# ============================================

config = {"configurable": {"thread_id": "approval_flow"}}

# First run - will pause before execute
result = graph.invoke(
    {"messages": [HumanMessage(content="Do the dangerous thing")]},
    config=config
)

print("Paused for approval!")
print(f"Pending action: {result['messages'][-1].content}")

# Human reviews...
human_approved = True

if human_approved:
    # Continue from checkpoint
    final_result = graph.invoke(None, config=config)
    print(f"Final: {final_result['messages'][-1].content}")
else:
    # Could modify state or cancel
    pass
```

---

## 🔧 Advanced Patterns

### Multi-Agent System

```python
"""
Multi-Agent System
Multiple specialized agents working together
"""

from typing import TypedDict, Annotated, Sequence, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

# ============================================
# STATE
# ============================================

class MultiAgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    current_agent: str
    task_complete: bool

# ============================================
# SPECIALIZED AGENTS
# ============================================

researcher_llm = ChatOpenAI(model="gpt-4").bind(
    system_message="You are a research specialist. Find and analyze information."
)

writer_llm = ChatOpenAI(model="gpt-4").bind(
    system_message="You are a writing specialist. Create clear, engaging content."
)

reviewer_llm = ChatOpenAI(model="gpt-4").bind(
    system_message="You are a review specialist. Check for errors and improve quality."
)

def researcher(state: MultiAgentState) -> dict:
    """Research agent"""
    response = researcher_llm.invoke(state["messages"])
    return {
        "messages": [AIMessage(content=f"[RESEARCHER] {response.content}")],
        "current_agent": "writer"
    }

def writer(state: MultiAgentState) -> dict:
    """Writing agent"""
    response = writer_llm.invoke(state["messages"])
    return {
        "messages": [AIMessage(content=f"[WRITER] {response.content}")],
        "current_agent": "reviewer"
    }

def reviewer(state: MultiAgentState) -> dict:
    """Review agent"""
    response = reviewer_llm.invoke(state["messages"])
    
    # Check if revision needed
    needs_revision = "revision needed" in response.content.lower()
    
    return {
        "messages": [AIMessage(content=f"[REVIEWER] {response.content}")],
        "current_agent": "writer" if needs_revision else "done",
        "task_complete": not needs_revision
    }

# ============================================
# ROUTER
# ============================================

def route_agent(state: MultiAgentState) -> Literal["researcher", "writer", "reviewer", "end"]:
    """Route to next agent"""
    if state.get("task_complete"):
        return "end"
    return state.get("current_agent", "researcher")

# ============================================
# BUILD GRAPH
# ============================================

graph_builder = StateGraph(MultiAgentState)

# Add agent nodes
graph_builder.add_node("researcher", researcher)
graph_builder.add_node("writer", writer)
graph_builder.add_node("reviewer", reviewer)

# Set entry and routing
graph_builder.set_entry_point("researcher")

graph_builder.add_conditional_edges(
    "researcher",
    route_agent,
    {"writer": "writer", "end": END}
)

graph_builder.add_conditional_edges(
    "writer",
    route_agent,
    {"reviewer": "reviewer", "end": END}
)

graph_builder.add_conditional_edges(
    "reviewer",
    route_agent,
    {"writer": "writer", "end": END}  # Can loop back!
)

graph = graph_builder.compile()

# ============================================
# RUN
# ============================================

result = graph.invoke({
    "messages": [HumanMessage(content="Write an article about quantum computing")],
    "current_agent": "researcher",
    "task_complete": False
})

for msg in result["messages"]:
    print(f"{msg.content}\n")
```

### Self-Correcting Agent

```python
"""
Self-Correcting Agent
Validate outputs and retry on failure
"""

from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END

class State(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    attempts: int
    last_error: str | None
    validated: bool

MAX_ATTEMPTS = 3

def generate(state: State) -> dict:
    """Generate response"""
    # Include error feedback if retrying
    messages = state["messages"]
    if state.get("last_error"):
        messages = messages + [
            HumanMessage(content=f"Previous attempt failed: {state['last_error']}. Try again.")
        ]
    
    response = llm.invoke(messages)
    
    return {
        "messages": [response],
        "attempts": state.get("attempts", 0) + 1
    }

def validate(state: State) -> dict:
    """Validate the response"""
    last_response = state["messages"][-1].content
    
    # Validation logic
    is_valid, error = validate_response(last_response)
    
    return {
        "validated": is_valid,
        "last_error": None if is_valid else error
    }

def should_retry(state: State) -> str:
    """Decide: accept, retry, or give up"""
    if state["validated"]:
        return "accept"
    if state["attempts"] >= MAX_ATTEMPTS:
        return "give_up"
    return "retry"

# Build graph
graph_builder = StateGraph(State)

graph_builder.add_node("generate", generate)
graph_builder.add_node("validate", validate)

graph_builder.set_entry_point("generate")
graph_builder.add_edge("generate", "validate")

graph_builder.add_conditional_edges(
    "validate",
    should_retry,
    {
        "accept": END,
        "retry": "generate",  # Loop back!
        "give_up": END
    }
)

graph = graph_builder.compile()
```

### RAG with Self-Reflection

```python
"""
RAG with Self-Reflection
Check if retrieved docs are relevant, search more if needed
"""

class RAGState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    question: str
    documents: list[str]
    generation: str
    search_count: int

def retrieve(state: RAGState) -> dict:
    """Retrieve documents"""
    docs = retriever.invoke(state["question"])
    return {"documents": [d.page_content for d in docs]}

def grade_documents(state: RAGState) -> dict:
    """Grade document relevance"""
    question = state["question"]
    documents = state["documents"]
    
    graded = []
    for doc in documents:
        # Use LLM to grade
        grade = grade_with_llm(question, doc)
        if grade == "relevant":
            graded.append(doc)
    
    return {"documents": graded}

def decide_to_generate(state: RAGState) -> str:
    """Check if we have enough relevant docs"""
    if state["documents"]:
        return "generate"
    if state["search_count"] < 3:
        return "websearch"
    return "generate"  # Give up and try anyway

def websearch(state: RAGState) -> dict:
    """Fallback to web search"""
    results = web_search(state["question"])
    return {
        "documents": state["documents"] + results,
        "search_count": state["search_count"] + 1
    }

def generate(state: RAGState) -> dict:
    """Generate answer"""
    context = "\n".join(state["documents"])
    
    prompt = f"""Answer based on context:
    Context: {context}
    Question: {state['question']}
    """
    
    response = llm.invoke(prompt)
    return {"generation": response.content}

def grade_generation(state: RAGState) -> str:
    """Check if generation is grounded in documents"""
    is_grounded = check_grounding(state["generation"], state["documents"])
    is_useful = check_usefulness(state["generation"], state["question"])
    
    if is_grounded and is_useful:
        return "accept"
    if not is_grounded:
        return "regenerate"
    return "websearch"  # Not useful, need more info

# Build the graph...
```

---

## 💻 Code Implementation

### Production-Ready Agent

```python
"""
Production-Ready LangGraph Agent
With error handling, logging, and best practices
"""

import logging
from typing import TypedDict, Annotated, Sequence, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================
# STATE
# ============================================

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    error_count: int
    last_error: str | None

# ============================================
# TOOLS
# ============================================

@tool
def search_knowledge_base(query: str) -> str:
    """Search internal knowledge base for information"""
    logger.info(f"Searching KB for: {query}")
    # Simulated search
    return f"Found information about: {query}"

@tool
def create_ticket(title: str, description: str, priority: str = "medium") -> str:
    """Create a support ticket"""
    logger.info(f"Creating ticket: {title}")
    ticket_id = f"TKT-{hash(title) % 10000}"
    return f"Created ticket {ticket_id}: {title}"

@tool
def get_user_info(user_id: str) -> str:
    """Get user information"""
    logger.info(f"Getting user info: {user_id}")
    return json.dumps({
        "user_id": user_id,
        "name": "John Doe",
        "plan": "premium",
        "tickets": 3
    })

tools = [search_knowledge_base, create_ticket, get_user_info]

# ============================================
# LLM
# ============================================

llm = ChatOpenAI(
    model="gpt-4",
    temperature=0,
    max_retries=3
).bind_tools(tools)

# System prompt
SYSTEM_PROMPT = """You are a helpful customer support agent.

You have access to the following tools:
- search_knowledge_base: Search for information
- create_ticket: Create support tickets
- get_user_info: Get user details

Always be helpful, professional, and thorough.
If you're unsure, use the search tool first."""

# ============================================
# NODES
# ============================================

def agent(state: AgentState) -> dict:
    """Main agent node"""
    try:
        # Add system message if not present
        messages = list(state["messages"])
        if not any(isinstance(m, SystemMessage) for m in messages):
            messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
        
        # Call LLM
        response = llm.invoke(messages)
        
        logger.info(f"Agent response: {response.content[:100]}...")
        
        return {
            "messages": [response],
            "error_count": 0,
            "last_error": None
        }
    except Exception as e:
        logger.error(f"Agent error: {e}")
        return {
            "error_count": state.get("error_count", 0) + 1,
            "last_error": str(e)
        }

def handle_error(state: AgentState) -> dict:
    """Handle errors gracefully"""
    error_msg = f"I encountered an error: {state['last_error']}. Let me try again."
    return {
        "messages": [AIMessage(content=error_msg)]
    }

# Tool node with error handling
tool_node = ToolNode(tools)

# ============================================
# ROUTING
# ============================================

def should_continue(state: AgentState) -> Literal["tools", "error", "end"]:
    """Decide next step"""
    
    # Check for errors
    if state.get("error_count", 0) >= 3:
        return "error"
    
    if state.get("last_error"):
        return "error"
    
    # Check for tool calls
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    
    return "end"

# ============================================
# BUILD GRAPH
# ============================================

def build_agent():
    """Build the agent graph"""
    
    graph_builder = StateGraph(AgentState)
    
    # Add nodes
    graph_builder.add_node("agent", agent)
    graph_builder.add_node("tools", tool_node)
    graph_builder.add_node("error_handler", handle_error)
    
    # Set entry
    graph_builder.set_entry_point("agent")
    
    # Add edges
    graph_builder.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            "error": "error_handler",
            "end": END
        }
    )
    
    graph_builder.add_edge("tools", "agent")
    graph_builder.add_edge("error_handler", "agent")
    
    # Compile with checkpointer
    checkpointer = MemorySaver()
    
    return graph_builder.compile(checkpointer=checkpointer)

# ============================================
# AGENT CLASS
# ============================================

class SupportAgent:
    """Production support agent wrapper"""
    
    def __init__(self):
        self.graph = build_agent()
        self.sessions = {}
    
    def chat(self, message: str, session_id: str = "default") -> str:
        """Send a message and get response"""
        
        config = {"configurable": {"thread_id": session_id}}
        
        try:
            result = self.graph.invoke(
                {"messages": [HumanMessage(content=message)]},
                config=config
            )
            
            # Get last AI message
            for msg in reversed(result["messages"]):
                if isinstance(msg, AIMessage):
                    return msg.content
            
            return "I apologize, but I couldn't generate a response."
            
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return f"An error occurred: {e}"
    
    def get_history(self, session_id: str) -> list:
        """Get conversation history"""
        config = {"configurable": {"thread_id": session_id}}
        
        try:
            state = self.graph.get_state(config)
            return [
                {"role": msg.type, "content": msg.content}
                for msg in state.values.get("messages", [])
            ]
        except:
            return []
    
    def clear_session(self, session_id: str):
        """Clear a session"""
        # With proper checkpointer, would delete from storage
        pass

# ============================================
# USAGE
# ============================================

if __name__ == "__main__":
    agent = SupportAgent()
    
    # Chat
    print(agent.chat("Hi, I need help with my account", "user_123"))
    print(agent.chat("Can you look up user U12345?", "user_123"))
    print(agent.chat("Create a ticket about login issues", "user_123"))
```

---

## 🌍 Real World Use Cases

### 1. Customer Support Workflow

```
Receive Query → Classify → Route to Specialist
     ↓              ↓              ↓
  Billing    →   Billing Agent  → Resolve
  Technical  →   Tech Agent     → Resolve or Escalate
  General    →   General Agent  → Resolve
     ↓
  Log & Follow Up
```

### 2. Content Creation Pipeline

```
Topic → Research → Outline → Draft → Review → Edit → Publish
           ↓          ↓        ↓         ↓
       Web Search   LLM      LLM     Human    LLM
```

### 3. Code Review System

```
PR Submitted → Analyze Changes → Check Style → Check Logic → Security Scan
      ↓              ↓                ↓             ↓             ↓
  Summarize    List Changes     Run Linter    LLM Review    Run Scanner
      ↓                                            ↓
      └─────────────── Compile Report ────────────────┘
                            ↓
                     Human Review (interrupt)
                            ↓
                    Approve/Request Changes
```

---

## 🛠️ Mini Project: Research Assistant

```python
"""
Mini Project: Research Assistant
Search → Analyze → Synthesize → Report
"""

from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langchain_community.tools import DuckDuckGoSearchRun
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

# ============================================
# STATE
# ============================================

class ResearchState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    topic: str
    search_results: list[str]
    analysis: str
    report: str
    step: str

# ============================================
# TOOLS & LLM
# ============================================

search = DuckDuckGoSearchRun()
llm = ChatOpenAI(model="gpt-4")

# ============================================
# NODES
# ============================================

def receive_topic(state: ResearchState) -> dict:
    """Extract research topic"""
    topic = state["messages"][-1].content
    return {
        "topic": topic,
        "step": "search"
    }

def search_web(state: ResearchState) -> dict:
    """Search for information"""
    topic = state["topic"]
    
    # Multiple searches
    queries = [topic, f"{topic} latest news", f"{topic} research"]
    results = []
    
    for query in queries:
        try:
            result = search.run(query)
            results.append(result)
        except:
            pass
    
    return {
        "search_results": results,
        "messages": [AIMessage(content=f"Found {len(results)} search results")],
        "step": "analyze"
    }

def analyze_results(state: ResearchState) -> dict:
    """Analyze search results"""
    results = "\n\n".join(state["search_results"])
    topic = state["topic"]
    
    prompt = f"""Analyze these search results about "{topic}":

{results}

Provide:
1. Key findings
2. Common themes
3. Conflicting information
4. Knowledge gaps
"""
    
    response = llm.invoke(prompt)
    
    return {
        "analysis": response.content,
        "messages": [AIMessage(content="Analysis complete")],
        "step": "report"
    }

def generate_report(state: ResearchState) -> dict:
    """Generate final report"""
    topic = state["topic"]
    analysis = state["analysis"]
    
    prompt = f"""Create a comprehensive research report about "{topic}".

Based on this analysis:
{analysis}

Format:
# Research Report: {topic}

## Executive Summary
...

## Key Findings
...

## Detailed Analysis
...

## Conclusions
...

## Recommendations for Further Research
...
"""
    
    response = llm.invoke(prompt)
    
    return {
        "report": response.content,
        "messages": [AIMessage(content=response.content)],
        "step": "done"
    }

# ============================================
# BUILD GRAPH
# ============================================

graph_builder = StateGraph(ResearchState)

graph_builder.add_node("receive", receive_topic)
graph_builder.add_node("search", search_web)
graph_builder.add_node("analyze", analyze_results)
graph_builder.add_node("report", generate_report)

graph_builder.set_entry_point("receive")
graph_builder.add_edge("receive", "search")
graph_builder.add_edge("search", "analyze")
graph_builder.add_edge("analyze", "report")
graph_builder.add_edge("report", END)

graph = graph_builder.compile()

# ============================================
# USAGE
# ============================================

if __name__ == "__main__":
    result = graph.invoke({
        "messages": [HumanMessage(content="Quantum computing advancements in 2024")],
        "search_results": [],
        "step": "start"
    })
    
    print(result["report"])
```

---

## ❓ Interview Questions

### Beginner Level

**Q1: What is LangGraph and how does it differ from LangChain?**

> **A:** LangGraph is a library for building stateful, multi-actor applications. Differences:
> - **LangChain:** Linear chains, simple agent loops
> - **LangGraph:** Graph-based workflows, complex control flow, built-in state management, checkpointing
>
> Use LangGraph when you need cycles, conditional logic, or human-in-the-loop.

**Q2: What are the core components of a LangGraph application?**

> **A:**
> 1. **State:** Shared data structure (TypedDict)
> 2. **Nodes:** Functions that process state
> 3. **Edges:** Connections between nodes
> 4. **Graph:** The compiled workflow
> 5. **Checkpointer:** Saves state for persistence

**Q3: What is `add_messages` and why is it used?**

> **A:** `add_messages` is a reducer that tells LangGraph to **append** new messages instead of replacing. Without it, returning `{"messages": [new_msg]}` would replace all messages. With it, new messages are added to the list.

### Intermediate Level

**Q4: How does human-in-the-loop work in LangGraph?**

> **A:** Using `interrupt_before` or `interrupt_after`:
> ```python
> graph = builder.compile(
>     checkpointer=MemorySaver(),
>     interrupt_before=["sensitive_action"]
> )
> ```
>
> Graph pauses at specified nodes. State is saved. Human reviews. Then invoke with `None` to continue.

**Q5: Explain conditional edges and when to use them.**

> **A:** Conditional edges route to different nodes based on state:
> ```python
> def router(state):
>     if state["error"]:
>         return "error_handler"
>     return "continue"
> 
> graph.add_conditional_edges("node", router, {...})
> ```
>
> Use for: branching logic, error handling, loops, decision points.

**Q6: How would you implement retry logic in LangGraph?**

> **A:** Create a loop with attempt counting:
> ```python
> def should_retry(state):
>     if state["success"]:
>         return "end"
>     if state["attempts"] < MAX:
>         return "retry"
>     return "fail"
> 
> graph.add_conditional_edges("validate", should_retry, {
>     "retry": "generate",  # Loop back
>     "end": END,
>     "fail": "error_handler"
> })
> ```

### Advanced Level

**Q7: Design a multi-agent system for document processing.**

> **A:** Architecture:
> ```
> Coordinator Agent
>      ├── Classifier Agent → Route by type
>      ├── Extractor Agent → Pull key data
>      ├── Validator Agent → Check accuracy
>      └── Summarizer Agent → Final output
> ```
>
> State includes: document, extracted_data, validation_status, routing_decisions
>
> Use subgraphs for each agent, main graph for coordination.

**Q8: How do you handle long-running tasks in LangGraph?**

> **A:** Strategies:
> 1. **Checkpointing:** Save progress, resume later
> 2. **Async execution:** Don't block
> 3. **Task queuing:** Break into subtasks
> 4. **Streaming:** Return partial results
>
> ```python
> async for event in graph.astream(input, config):
>     yield event  # Stream progress
> ```

### FAANG Level

**Q9: Design a production LangGraph system with fault tolerance.**

> **A:** Architecture:
> ```
> Load Balancer
>      │
> API Servers (stateless)
>      │
> LangGraph Executors
>      │
> ├── Redis (checkpoints)
> ├── Postgres (audit log)
> ├── Kafka (events)
> └── Monitoring
> ```
>
> Fault tolerance:
> 1. **Checkpoint everything:** Resume from any point
> 2. **Idempotent nodes:** Safe to retry
> 3. **Dead letter queue:** Failed executions
> 4. **Health checks:** Automatic recovery
> 5. **Circuit breakers:** Prevent cascade failures

**Q10: Compare LangGraph to other orchestration frameworks.**

> **A:**
> 
> | Feature | LangGraph | Airflow | Temporal |
> |---------|-----------|---------|----------|
> | Use Case | AI workflows | Data pipelines | General workflows |
> | State | Built-in | Limited | Built-in |
> | LLM Support | Native | Via operators | Via activities |
> | Human-in-loop | Built-in | Manual | Via signals |
> | Complexity | Medium | High | High |
>
> LangGraph is optimal for AI/LLM workflows. Use Airflow for data pipelines, Temporal for complex business logic.

---

## 📝 Homework

### Easy

1. Build a simple chatbot with LangGraph (3 nodes: input, process, output)
2. Add memory using MemorySaver
3. Create a graph that branches based on user input

### Medium

4. Build a tool-calling agent with 3+ tools
5. Implement retry logic with max 3 attempts
6. Create a human-in-the-loop approval workflow

### Hard

7. Build a multi-agent system with 3 specialized agents
8. Implement RAG with self-reflection (grade and retry)
9. Create a persistent system using SQLite checkpoint

### Expert

10. Design and implement a code review agent that:
    - Analyzes code changes
    - Runs tests (simulated)
    - Generates review comments
    - Pauses for human approval

11. Build a research assistant with:
    - Web search
    - Document analysis
    - Report generation
    - Citation tracking

---

## 🎯 Key Takeaways

```
LangGraph Essentials:
├── State: TypedDict with Annotated fields
├── Nodes: Functions that update state
├── Edges: Connections (simple or conditional)
├── Checkpoints: Save/resume state
└── Compile: Build executable graph

When to Use LangGraph:
├── Complex workflows with branches
├── Loops and retries
├── Human-in-the-loop
├── Multi-agent systems
├── Stateful applications
└── Production AI systems

Best Practices:
├── Keep nodes focused (single responsibility)
├── Use conditional edges for flexibility
├── Always implement error handling
├── Checkpoint for reliability
├── Log everything
└── Test each node independently
```

---

**Next: [06-AI-Agents.md](./06-AI-Agents.md)** - Deep dive into autonomous AI systems! 🤖
