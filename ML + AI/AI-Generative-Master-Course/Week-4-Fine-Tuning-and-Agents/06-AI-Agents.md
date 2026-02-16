# 🤖 AI Agents: Autonomous Intelligence

## 📚 Table of Contents
1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Agent Architecture](#-agent-architecture)
3. [Types of Agents](#-types-of-agents)
4. [Building Blocks](#-building-blocks)
5. [Agent Patterns](#-agent-patterns)
6. [Code Implementation](#-code-implementation)
7. [Advanced Topics](#-advanced-topics)
8. [Real World Use Cases](#-real-world-use-cases)
9. [Mini Project](#-mini-project)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🔰 Beginner Friendly Explanation

### What is an AI Agent?

```
Think of an AI Agent like a Smart Assistant:

Regular LLM (ChatGPT, etc.):
├── You ask a question
├── It gives an answer
├── Done!
│
└── Like asking a librarian for information

AI Agent:
├── You give it a GOAL
├── It PLANS how to achieve it
├── It EXECUTES steps (using tools)
├── It OBSERVES results
├── It ADJUSTS based on feedback
├── It COMPLETES the task
│
└── Like hiring a personal assistant who DOES things for you

Key Difference:
├── LLM: "Here's how to book a flight..." (tells you)
└── Agent: *Actually books the flight* (does it)
```

### The Agent Mental Model

```
Human Brain → AI Agent:

┌────────────────────────────────────────────────────────────┐
│                        HUMAN BRAIN                          │
├────────────────────────────────────────────────────────────┤
│ Perception → Thinking → Planning → Action → Learning       │
│     👀          🧠          📋        🖐️         📚         │
└────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────┐
│                         AI AGENT                            │
├────────────────────────────────────────────────────────────┤
│ Observation → Reasoning → Planning → Tools → Memory        │
│  (input)       (LLM)      (LLM)    (APIs)   (Storage)      │
└────────────────────────────────────────────────────────────┘
```

### Why Agents Matter

```
Evolution of AI Interaction:

2020: "Write me an email"
      └── LLM writes email, you send it

2022: "Write and format this email"
      └── LLM helps more, you still do work

2024: "Send an email to John about tomorrow's meeting"
      └── Agent writes, formats, finds John's email, sends it

2025+: "Manage my professional communication"
      └── Agent handles your entire email workflow

Agents = AI that ACTS, not just ADVISES
```

---

## 🎯 Agent Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI AGENT ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                         BRAIN (LLM)                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │ │
│  │  │Reasoning │  │Planning  │  │Decision  │  │Language  │   │ │
│  │  │          │  │          │  │Making    │  │Understand│   │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│          ┌───────────────────┼───────────────────┐              │
│          │                   │                   │              │
│          ▼                   ▼                   ▼              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   MEMORY     │   │    TOOLS     │   │   PLANNING   │        │
│  │              │   │              │   │              │        │
│  │ Short-term   │   │ Web Search   │   │ Task Decomp  │        │
│  │ Long-term    │   │ Calculator   │   │ Prioritize   │        │
│  │ Episodic     │   │ APIs         │   │ Schedule     │        │
│  │ Semantic     │   │ Code Exec    │   │ Delegate     │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     ACTION EXECUTOR                         │ │
│  │  Execute tools, APIs, code, and interact with the world   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      ENVIRONMENT                            │ │
│  │  Web, Databases, Files, Other Systems, Real World         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### The Agent Loop

```
┌──────────────────────────────────────────────────────────────┐
│                      THE AGENT LOOP                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│     START                                                     │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────┐                                                  │
│  │ PERCEIVE │ ← Get input, observe environment               │
│  └────┬────┘                                                  │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────┐                                                  │
│  │  THINK  │ ← Analyze situation, consider options           │
│  └────┬────┘                                                  │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────┐                                                  │
│  │  PLAN   │ ← Create/update action plan                     │
│  └────┬────┘                                                  │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────┐                                                  │
│  │   ACT   │ ← Execute action (use tools)                    │
│  └────┬────┘                                                  │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────┐                                                  │
│  │ OBSERVE │ ← See results of action                         │
│  └────┬────┘                                                  │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────┐       No                                         │
│  │ DONE?   │ ──────────────┐                                  │
│  └────┬────┘               │                                  │
│       │ Yes                │                                  │
│       ▼                    │                                  │
│    FINISH             Back to THINK                           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 Types of Agents

### 1. ReAct Agent (Reasoning + Acting)

```
ReAct Pattern:
├── Most common agent type
├── Interleaves thinking and acting
├── Transparent reasoning

Flow:
Thought → Action → Observation → Thought → Action → ... → Answer

Example:
Q: "What's the capital of the country where the Eiffel Tower is?"

Thought: I need to find where the Eiffel Tower is located.
Action: search("Eiffel Tower location")
Observation: The Eiffel Tower is located in Paris, France.
Thought: Now I know it's in France. I need the capital of France.
Action: search("capital of France")
Observation: The capital of France is Paris.
Thought: I now have the answer.
Answer: The capital of the country where the Eiffel Tower is located is Paris.
```

### 2. Plan-and-Execute Agent

```
Plan-and-Execute Pattern:
├── Creates full plan FIRST
├── Then executes each step
├── Good for complex tasks

Flow:
Plan All Steps → Execute Step 1 → Execute Step 2 → ... → Done

Example:
Task: "Research and write an article about quantum computing"

PLANNING PHASE:
Step 1: Search for quantum computing basics
Step 2: Search for recent breakthroughs
Step 3: Search for applications
Step 4: Outline article
Step 5: Write introduction
Step 6: Write body sections
Step 7: Write conclusion
Step 8: Review and edit

EXECUTION PHASE:
[Executes each step, may replan if needed]
```

### 3. MRKL Agent (Modular Reasoning, Knowledge, and Language)

```
MRKL Pattern:
├── Routes to specialized modules
├── Expert systems for different tasks
├── Scalable architecture

         Question
             │
             ▼
     ┌───────────────┐
     │    Router     │
     └───────────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
┌──────┐ ┌──────┐ ┌──────┐
│ Math │ │Search│ │ Code │
│Expert│ │Expert│ │Expert│
└──────┘ └──────┘ └──────┘
```

### 4. Multi-Agent Systems

```
Multi-Agent Pattern:
├── Multiple specialized agents
├── Collaboration or competition
├── Complex problem solving

         Supervisor Agent
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│Research│ │Writing │ │Review  │
│ Agent  │ │ Agent  │ │ Agent  │
└────────┘ └────────┘ └────────┘
```

---

## 🧱 Building Blocks

### 1. Tools

```python
"""
Tools: How Agents Interact with the World
"""

from langchain.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun

# ============================================
# SIMPLE TOOLS
# ============================================

@tool
def calculator(expression: str) -> str:
    """Calculate a mathematical expression"""
    try:
        return str(eval(expression))
    except:
        return "Error: Invalid expression"

@tool
def get_current_weather(city: str) -> str:
    """Get current weather for a city"""
    # In real app, call weather API
    return f"Weather in {city}: 72°F, sunny"

@tool
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email"""
    # In real app, use email service
    return f"Email sent to {to}"

# ============================================
# COMPLEX TOOLS
# ============================================

@tool
def search_database(query: str, table: str = "users") -> str:
    """
    Search the database for records.
    
    Args:
        query: Search query
        table: Table to search (users, products, orders)
    
    Returns:
        Matching records as JSON
    """
    # Simulated database search
    return '{"results": [{"id": 1, "name": "John"}]}'

# ============================================
# TOOL CATEGORIES
# ============================================

"""
Common Tool Types:
├── Information Retrieval
│   ├── Web search
│   ├── Database queries
│   ├── API calls
│   └── File reading
│
├── Computation
│   ├── Calculator
│   ├── Code execution
│   ├── Data analysis
│   └── Math solvers
│
├── Communication
│   ├── Email
│   ├── Messaging
│   ├── Notifications
│   └── API webhooks
│
├── File Operations
│   ├── Read/write files
│   ├── Create documents
│   ├── Image processing
│   └── Data export
│
└── External Services
    ├── Calendar
    ├── CRM
    ├── Project management
    └── Custom APIs
"""
```

### 2. Memory Systems

```python
"""
Memory: How Agents Remember
"""

# ============================================
# SHORT-TERM MEMORY (Conversation)
# ============================================

class ShortTermMemory:
    """Holds recent conversation context"""
    
    def __init__(self, max_messages: int = 10):
        self.messages = []
        self.max_messages = max_messages
    
    def add(self, message):
        self.messages.append(message)
        if len(self.messages) > self.max_messages:
            self.messages.pop(0)
    
    def get_context(self):
        return self.messages

# ============================================
# LONG-TERM MEMORY (Vector Store)
# ============================================

class LongTermMemory:
    """Stores facts and information permanently"""
    
    def __init__(self, vectorstore):
        self.vectorstore = vectorstore
    
    def store(self, text: str, metadata: dict = None):
        """Store information for later retrieval"""
        self.vectorstore.add_texts([text], [metadata])
    
    def retrieve(self, query: str, k: int = 5):
        """Retrieve relevant information"""
        return self.vectorstore.similarity_search(query, k=k)

# ============================================
# EPISODIC MEMORY (Experiences)
# ============================================

class EpisodicMemory:
    """Remembers specific events and outcomes"""
    
    def __init__(self):
        self.episodes = []
    
    def record_episode(self, task, actions, outcome):
        """Record a complete task execution"""
        self.episodes.append({
            "task": task,
            "actions": actions,
            "outcome": outcome,
            "success": self._evaluate_success(outcome)
        })
    
    def get_similar_episodes(self, task):
        """Find similar past experiences"""
        # Use embedding similarity
        pass

# ============================================
# WORKING MEMORY (Current Task)
# ============================================

class WorkingMemory:
    """Holds current task state"""
    
    def __init__(self):
        self.current_task = None
        self.plan = []
        self.completed_steps = []
        self.pending_steps = []
        self.observations = []
```

### 3. Planning

```python
"""
Planning: How Agents Create Action Plans
"""

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

llm = ChatOpenAI(model="gpt-4")

# ============================================
# SIMPLE PLANNING
# ============================================

plan_prompt = ChatPromptTemplate.from_template("""
Given this task: {task}

Create a step-by-step plan to accomplish it.
Return as a numbered list.

Available tools: {tools}

Plan:
""")

def create_plan(task: str, tools: list[str]) -> list[str]:
    """Generate a plan for the task"""
    response = llm.invoke(
        plan_prompt.format(task=task, tools=", ".join(tools))
    )
    
    # Parse numbered list
    lines = response.content.strip().split("\n")
    steps = [line.split(". ", 1)[1] for line in lines if ". " in line]
    
    return steps

# ============================================
# HIERARCHICAL PLANNING
# ============================================

def hierarchical_plan(task: str) -> dict:
    """Create multi-level plan"""
    
    # High-level plan
    high_level = create_plan(task, ["research", "analyze", "execute", "report"])
    
    # Detail each high-level step
    detailed_plan = {}
    for step in high_level:
        sub_steps = create_plan(step, available_tools)
        detailed_plan[step] = sub_steps
    
    return detailed_plan

# ============================================
# REPLANNING
# ============================================

def replan_on_failure(original_plan: list, failed_step: int, error: str) -> list:
    """Create new plan when step fails"""
    
    completed = original_plan[:failed_step]
    remaining_goal = "Continue after: " + original_plan[failed_step]
    
    replan_prompt = f"""
    Original task steps completed: {completed}
    
    Step that failed: {original_plan[failed_step]}
    Error: {error}
    
    Create a new plan to complete the task, avoiding the error.
    """
    
    new_steps = create_plan(replan_prompt, available_tools)
    return completed + new_steps
```

---

## 🎨 Agent Patterns

### ReAct Implementation

```python
"""
ReAct Agent: Reasoning and Acting
"""

from langchain_openai import ChatOpenAI
from langchain.agents import create_react_agent, AgentExecutor
from langchain_core.prompts import PromptTemplate
from langchain.tools import tool

# ============================================
# TOOLS
# ============================================

@tool
def search(query: str) -> str:
    """Search the web for information"""
    return f"Search results for: {query}"

@tool
def calculator(expression: str) -> str:
    """Calculate math expressions"""
    return str(eval(expression))

tools = [search, calculator]

# ============================================
# REACT PROMPT
# ============================================

react_prompt = PromptTemplate.from_template("""
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

# ============================================
# CREATE AGENT
# ============================================

llm = ChatOpenAI(model="gpt-4", temperature=0)

agent = create_react_agent(llm, tools, react_prompt)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    max_iterations=10,
    handle_parsing_errors=True
)

# ============================================
# RUN
# ============================================

result = agent_executor.invoke({
    "input": "What is 25 * 4 + 100?"
})

print(result["output"])
```

### Plan-and-Execute Implementation

```python
"""
Plan-and-Execute Agent
Creates plan first, then executes
"""

from langchain_openai import ChatOpenAI
from langchain_experimental.plan_and_execute import (
    PlanAndExecute,
    load_agent_executor,
    load_chat_planner
)

# ============================================
# SETUP
# ============================================

llm = ChatOpenAI(model="gpt-4", temperature=0)

# Planner: Creates the plan
planner = load_chat_planner(llm)

# Executor: Executes each step
executor = load_agent_executor(llm, tools, verbose=True)

# ============================================
# CREATE AGENT
# ============================================

agent = PlanAndExecute(
    planner=planner,
    executor=executor,
    verbose=True
)

# ============================================
# RUN
# ============================================

result = agent.run(
    "Research the latest AI news and summarize the top 3 stories"
)
```

### Multi-Agent System

```python
"""
Multi-Agent System
Specialized agents working together
"""

from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph.message import add_messages

# ============================================
# STATE
# ============================================

class MultiAgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    task: str
    research: str
    draft: str
    review: str
    final: str
    next_agent: str

# ============================================
# SPECIALIZED AGENTS
# ============================================

researcher_llm = ChatOpenAI(model="gpt-4").bind(
    system="You are a research specialist. Find accurate information."
)

writer_llm = ChatOpenAI(model="gpt-4").bind(
    system="You are a skilled writer. Create clear, engaging content."
)

reviewer_llm = ChatOpenAI(model="gpt-4").bind(
    system="You are an editor. Review for quality and suggest improvements."
)

def researcher_agent(state: MultiAgentState) -> dict:
    """Research agent node"""
    task = state["task"]
    response = researcher_llm.invoke(f"Research this topic: {task}")
    
    return {
        "research": response.content,
        "messages": [AIMessage(content=f"[Research] {response.content}")],
        "next_agent": "writer"
    }

def writer_agent(state: MultiAgentState) -> dict:
    """Writer agent node"""
    research = state["research"]
    response = writer_llm.invoke(
        f"Write content based on this research:\n{research}"
    )
    
    return {
        "draft": response.content,
        "messages": [AIMessage(content=f"[Writer] {response.content}")],
        "next_agent": "reviewer"
    }

def reviewer_agent(state: MultiAgentState) -> dict:
    """Reviewer agent node"""
    draft = state["draft"]
    response = reviewer_llm.invoke(f"Review and improve:\n{draft}")
    
    needs_revision = "revision needed" in response.content.lower()
    
    return {
        "review": response.content,
        "final": response.content if not needs_revision else None,
        "messages": [AIMessage(content=f"[Reviewer] {response.content}")],
        "next_agent": "writer" if needs_revision else "done"
    }

# ============================================
# ROUTER
# ============================================

def route_next(state: MultiAgentState) -> str:
    return state.get("next_agent", "researcher")

# ============================================
# BUILD GRAPH
# ============================================

graph = StateGraph(MultiAgentState)

graph.add_node("researcher", researcher_agent)
graph.add_node("writer", writer_agent)
graph.add_node("reviewer", reviewer_agent)

graph.set_entry_point("researcher")

graph.add_conditional_edges("researcher", route_next, {
    "writer": "writer"
})

graph.add_conditional_edges("writer", route_next, {
    "reviewer": "reviewer"
})

graph.add_conditional_edges("reviewer", route_next, {
    "writer": "writer",  # Revision loop
    "done": END
})

multi_agent = graph.compile()

# ============================================
# RUN
# ============================================

result = multi_agent.invoke({
    "messages": [],
    "task": "Write an article about machine learning",
    "next_agent": "researcher"
})

print(result["final"])
```

---

## 💻 Code Implementation

### Production-Ready Agent

```python
"""
Production-Ready AI Agent
With error handling, logging, and best practices
"""

import logging
from typing import TypedDict, Annotated, Sequence, Optional, Literal
from datetime import datetime
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
import json

# ============================================
# SETUP LOGGING
# ============================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Agent")

# ============================================
# STATE DEFINITION
# ============================================

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    task: str
    plan: list[str]
    current_step: int
    completed_steps: list[str]
    tool_results: dict
    error: Optional[str]
    retry_count: int
    status: str  # planning, executing, completed, failed

# ============================================
# TOOLS
# ============================================

@tool
def web_search(query: str) -> str:
    """Search the web for current information."""
    logger.info(f"Web search: {query}")
    # Simulated search
    return f"Search results for '{query}': Found relevant information..."

@tool
def read_file(filepath: str) -> str:
    """Read contents of a file."""
    logger.info(f"Reading file: {filepath}")
    try:
        with open(filepath, 'r') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {e}"

@tool
def write_file(filepath: str, content: str) -> str:
    """Write content to a file."""
    logger.info(f"Writing file: {filepath}")
    try:
        with open(filepath, 'w') as f:
            f.write(content)
        return f"Successfully wrote to {filepath}"
    except Exception as e:
        return f"Error writing file: {e}"

@tool
def execute_code(code: str) -> str:
    """Execute Python code and return output."""
    logger.info("Executing code")
    try:
        # CAUTION: In production, use sandboxed execution
        exec_globals = {}
        exec(code, exec_globals)
        return str(exec_globals.get('result', 'Code executed successfully'))
    except Exception as e:
        return f"Error: {e}"

@tool
def send_notification(message: str, channel: str = "default") -> str:
    """Send a notification."""
    logger.info(f"Notification to {channel}: {message}")
    return f"Notification sent to {channel}"

tools = [web_search, read_file, write_file, execute_code, send_notification]

# ============================================
# LLM SETUP
# ============================================

llm = ChatOpenAI(model="gpt-4", temperature=0).bind_tools(tools)

SYSTEM_PROMPT = """You are a capable AI agent that can complete complex tasks.

You have access to these tools:
- web_search: Search the internet
- read_file: Read file contents
- write_file: Write to files
- execute_code: Run Python code
- send_notification: Send notifications

For each task:
1. Understand the goal
2. Break it into steps
3. Execute each step using appropriate tools
4. Verify results
5. Handle errors gracefully

Be thorough, precise, and safe. Always verify before destructive actions."""

# ============================================
# NODES
# ============================================

def planner(state: AgentState) -> dict:
    """Create execution plan"""
    logger.info("Planning phase")
    
    task = state["task"]
    
    plan_prompt = f"""Create a step-by-step plan for this task:
Task: {task}

Available tools: web_search, read_file, write_file, execute_code, send_notification

Return a numbered list of specific, actionable steps.
"""
    
    response = ChatOpenAI(model="gpt-4").invoke(plan_prompt)
    
    # Parse plan
    lines = response.content.strip().split("\n")
    plan = [line.strip() for line in lines if line.strip() and line[0].isdigit()]
    
    logger.info(f"Created plan with {len(plan)} steps")
    
    return {
        "plan": plan,
        "current_step": 0,
        "status": "executing",
        "messages": [AIMessage(content=f"Plan created:\n" + "\n".join(plan))]
    }

def executor(state: AgentState) -> dict:
    """Execute current step"""
    plan = state["plan"]
    step_idx = state["current_step"]
    
    if step_idx >= len(plan):
        return {"status": "completed"}
    
    current_step = plan[step_idx]
    logger.info(f"Executing step {step_idx + 1}: {current_step}")
    
    # Build context
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"""Execute this step: {current_step}

Previous completed steps: {state.get('completed_steps', [])}
Tool results so far: {state.get('tool_results', {})}

Use the appropriate tool to complete this step.""")
    ]
    
    try:
        response = llm.invoke(messages)
        
        return {
            "messages": [response],
            "error": None
        }
    except Exception as e:
        logger.error(f"Execution error: {e}")
        return {
            "error": str(e),
            "retry_count": state.get("retry_count", 0) + 1
        }

def process_result(state: AgentState) -> dict:
    """Process tool results and update state"""
    messages = state["messages"]
    last_message = messages[-1]
    
    step_idx = state["current_step"]
    current_step = state["plan"][step_idx]
    
    # Record completion
    completed = state.get("completed_steps", []) + [current_step]
    
    return {
        "completed_steps": completed,
        "current_step": step_idx + 1,
        "messages": [AIMessage(content=f"Completed step {step_idx + 1}")]
    }

def error_handler(state: AgentState) -> dict:
    """Handle errors"""
    error = state.get("error", "Unknown error")
    retry_count = state.get("retry_count", 0)
    
    logger.warning(f"Handling error (attempt {retry_count}): {error}")
    
    if retry_count >= 3:
        return {
            "status": "failed",
            "messages": [AIMessage(content=f"Task failed after 3 attempts: {error}")]
        }
    
    return {
        "messages": [AIMessage(content=f"Error occurred: {error}. Retrying...")]
    }

def finalizer(state: AgentState) -> dict:
    """Finalize and summarize"""
    completed = state.get("completed_steps", [])
    
    summary = f"""Task completed!
    
Steps completed: {len(completed)}
{chr(10).join(f'✓ {step}' for step in completed)}

Status: {state.get('status', 'completed')}
"""
    
    logger.info("Task finalized")
    
    return {
        "messages": [AIMessage(content=summary)],
        "status": "completed"
    }

# ============================================
# ROUTING
# ============================================

def should_continue(state: AgentState) -> Literal["execute", "process", "error", "finalize", "end"]:
    """Decide next step"""
    
    # Check for errors
    if state.get("error"):
        return "error"
    
    # Check if all steps done
    if state.get("current_step", 0) >= len(state.get("plan", [])):
        return "finalize"
    
    # Check for tool calls
    if state.get("messages"):
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "process"
    
    return "execute"

def after_error(state: AgentState) -> Literal["execute", "end"]:
    """Decide after error handling"""
    if state.get("status") == "failed":
        return "end"
    return "execute"

# ============================================
# BUILD GRAPH
# ============================================

def build_agent():
    graph = StateGraph(AgentState)
    
    # Add nodes
    graph.add_node("planner", planner)
    graph.add_node("executor", executor)
    graph.add_node("tools", ToolNode(tools))
    graph.add_node("process_result", process_result)
    graph.add_node("error_handler", error_handler)
    graph.add_node("finalizer", finalizer)
    
    # Entry point
    graph.set_entry_point("planner")
    
    # Edges
    graph.add_edge("planner", "executor")
    
    graph.add_conditional_edges(
        "executor",
        should_continue,
        {
            "process": "tools",
            "error": "error_handler",
            "finalize": "finalizer",
            "execute": "executor"
        }
    )
    
    graph.add_edge("tools", "process_result")
    graph.add_edge("process_result", "executor")
    
    graph.add_conditional_edges(
        "error_handler",
        after_error,
        {
            "execute": "executor",
            "end": END
        }
    )
    
    graph.add_edge("finalizer", END)
    
    # Compile with checkpointing
    return graph.compile(checkpointer=MemorySaver())

# ============================================
# AGENT CLASS
# ============================================

class ProductionAgent:
    """Production-ready agent wrapper"""
    
    def __init__(self):
        self.agent = build_agent()
        self.sessions = {}
    
    def run(self, task: str, session_id: str = "default") -> dict:
        """Execute a task"""
        
        config = {"configurable": {"thread_id": session_id}}
        
        initial_state = {
            "messages": [],
            "task": task,
            "plan": [],
            "current_step": 0,
            "completed_steps": [],
            "tool_results": {},
            "error": None,
            "retry_count": 0,
            "status": "planning"
        }
        
        logger.info(f"Starting task: {task}")
        
        try:
            result = self.agent.invoke(initial_state, config=config)
            return {
                "success": result.get("status") == "completed",
                "result": result.get("messages", [])[-1].content if result.get("messages") else "",
                "steps_completed": len(result.get("completed_steps", []))
            }
        except Exception as e:
            logger.error(f"Agent error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_status(self, session_id: str) -> dict:
        """Get current task status"""
        config = {"configurable": {"thread_id": session_id}}
        try:
            state = self.agent.get_state(config)
            return {
                "status": state.values.get("status", "unknown"),
                "current_step": state.values.get("current_step", 0),
                "total_steps": len(state.values.get("plan", []))
            }
        except:
            return {"status": "unknown"}

# ============================================
# USAGE
# ============================================

if __name__ == "__main__":
    agent = ProductionAgent()
    
    result = agent.run(
        "Research the latest developments in quantum computing and create a summary",
        session_id="task_001"
    )
    
    print(f"Success: {result['success']}")
    print(f"Result: {result.get('result', result.get('error'))}")
```

---

## 🔥 Advanced Topics

### Tool Use Optimization

```python
"""
Optimizing Tool Selection and Use
"""

# ============================================
# TOOL ROUTING
# ============================================

def create_tool_router(tools: list):
    """Create a router that selects optimal tool"""
    
    tool_descriptions = "\n".join([
        f"- {t.name}: {t.description}"
        for t in tools
    ])
    
    router_prompt = f"""Given a task, select the best tool.
    
Available tools:
{tool_descriptions}

Task: {{task}}

Return just the tool name, nothing else."""
    
    def route(task: str) -> str:
        response = llm.invoke(router_prompt.format(task=task))
        return response.content.strip()
    
    return route

# ============================================
# PARALLEL TOOL EXECUTION
# ============================================

import asyncio

async def execute_tools_parallel(tool_calls: list):
    """Execute multiple tools in parallel"""
    tasks = [
        execute_tool_async(call)
        for call in tool_calls
    ]
    return await asyncio.gather(*tasks)

# ============================================
# TOOL FALLBACKS
# ============================================

def tool_with_fallback(primary_tool, fallback_tool):
    """Create tool with automatic fallback"""
    
    @tool
    def combined_tool(input: str) -> str:
        try:
            result = primary_tool.invoke(input)
            if "error" in result.lower():
                raise Exception(result)
            return result
        except:
            return fallback_tool.invoke(input)
    
    return combined_tool
```

### Agent Evaluation

```python
"""
Evaluating Agent Performance
"""

class AgentEvaluator:
    """Evaluate agent performance"""
    
    def __init__(self, agent):
        self.agent = agent
        self.metrics = []
    
    def run_benchmark(self, tasks: list[dict]) -> dict:
        """Run benchmark suite"""
        
        results = []
        
        for task in tasks:
            start_time = time.time()
            
            try:
                result = self.agent.run(task["input"])
                
                # Evaluate
                score = self.evaluate_output(
                    result["result"],
                    task["expected"]
                )
                
                results.append({
                    "task": task["name"],
                    "success": score > 0.8,
                    "score": score,
                    "time": time.time() - start_time,
                    "tool_calls": result.get("steps_completed", 0)
                })
                
            except Exception as e:
                results.append({
                    "task": task["name"],
                    "success": False,
                    "error": str(e)
                })
        
        return self.aggregate_results(results)
    
    def evaluate_output(self, actual: str, expected: str) -> float:
        """Score output quality"""
        # Use LLM as judge
        prompt = f"""Rate how well the actual output matches expected.
        
Expected: {expected}
Actual: {actual}

Score from 0.0 to 1.0:"""
        
        response = llm.invoke(prompt)
        try:
            return float(response.content.strip())
        except:
            return 0.0
    
    def aggregate_results(self, results: list) -> dict:
        """Aggregate benchmark results"""
        successful = [r for r in results if r.get("success")]
        
        return {
            "total_tasks": len(results),
            "successful": len(successful),
            "success_rate": len(successful) / len(results),
            "avg_time": sum(r.get("time", 0) for r in results) / len(results),
            "avg_score": sum(r.get("score", 0) for r in successful) / len(successful) if successful else 0
        }
```

---

## 🌍 Real World Use Cases

### 1. Data Analysis Agent

```
Task: "Analyze sales data and create a report"

Agent Actions:
1. Read sales CSV file
2. Execute Python code to analyze trends
3. Generate visualizations
4. Write report to file
5. Send notification when done
```

### 2. Customer Support Agent

```
Task: "Handle customer inquiry about order status"

Agent Actions:
1. Extract order ID from query
2. Query database for order status
3. Check shipping information
4. Generate personalized response
5. Log interaction
```

### 3. Research Agent

```
Task: "Research competitors and create analysis"

Agent Actions:
1. Search for competitor information
2. Visit company websites
3. Extract key data points
4. Analyze and compare
5. Generate report
```

### 4. DevOps Agent

```
Task: "Investigate production error"

Agent Actions:
1. Query error logs
2. Analyze stack traces
3. Search documentation
4. Suggest fixes
5. Create issue ticket
```

---

## 🛠️ Mini Project: Personal Assistant Agent

```python
"""
Mini Project: Personal Assistant Agent
A helpful agent for daily tasks
"""

from typing import TypedDict, Annotated, Sequence, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from datetime import datetime
import json

# ============================================
# TOOLS
# ============================================

@tool
def get_calendar_events(date: str = "today") -> str:
    """Get calendar events for a date"""
    events = {
        "today": [
            {"time": "09:00", "event": "Team standup"},
            {"time": "14:00", "event": "Project review"},
            {"time": "16:00", "event": "Client call"}
        ]
    }
    return json.dumps(events.get(date, []))

@tool
def add_calendar_event(title: str, time: str, date: str = "today") -> str:
    """Add a calendar event"""
    return f"Added: {title} at {time} on {date}"

@tool
def check_weather(location: str = "current") -> str:
    """Check weather for location"""
    return f"Weather in {location}: 72°F, Sunny, 20% chance of rain"

@tool
def send_message(recipient: str, message: str) -> str:
    """Send a message to someone"""
    return f"Message sent to {recipient}: {message}"

@tool
def create_reminder(text: str, time: str) -> str:
    """Create a reminder"""
    return f"Reminder set for {time}: {text}"

@tool
def search_contacts(name: str) -> str:
    """Search contacts by name"""
    contacts = {
        "john": {"email": "john@example.com", "phone": "555-1234"},
        "sarah": {"email": "sarah@example.com", "phone": "555-5678"}
    }
    contact = contacts.get(name.lower(), {})
    return json.dumps(contact) if contact else f"No contact found: {name}"

@tool
def get_current_time() -> str:
    """Get current date and time"""
    return datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")

tools = [
    get_calendar_events, add_calendar_event, check_weather,
    send_message, create_reminder, search_contacts, get_current_time
]

# ============================================
# STATE
# ============================================

class AssistantState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

# ============================================
# AGENT
# ============================================

llm = ChatOpenAI(model="gpt-4", temperature=0.7).bind_tools(tools)

SYSTEM_MESSAGE = """You are a helpful personal assistant named Aria.

You help users with:
- Calendar management (viewing and adding events)
- Weather information
- Sending messages
- Setting reminders
- Finding contact information
- General questions

Be friendly, concise, and proactive in offering help.
Always confirm actions before executing them.
If unsure, ask clarifying questions."""

def assistant(state: AssistantState) -> dict:
    """Main assistant node"""
    messages = [SystemMessage(content=SYSTEM_MESSAGE)] + list(state["messages"])
    response = llm.invoke(messages)
    return {"messages": [response]}

def should_continue(state: AssistantState) -> Literal["tools", "end"]:
    """Check if tools need to be called"""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "end"

# ============================================
# BUILD GRAPH
# ============================================

graph_builder = StateGraph(AssistantState)

graph_builder.add_node("assistant", assistant)
graph_builder.add_node("tools", ToolNode(tools))

graph_builder.set_entry_point("assistant")

graph_builder.add_conditional_edges(
    "assistant",
    should_continue,
    {"tools": "tools", "end": END}
)

graph_builder.add_edge("tools", "assistant")

assistant_agent = graph_builder.compile()

# ============================================
# CHAT INTERFACE
# ============================================

class PersonalAssistant:
    def __init__(self):
        self.agent = assistant_agent
        self.history = []
    
    def chat(self, message: str) -> str:
        """Send a message and get response"""
        self.history.append(HumanMessage(content=message))
        
        result = self.agent.invoke({"messages": self.history})
        
        # Get last AI message
        for msg in reversed(result["messages"]):
            if isinstance(msg, AIMessage):
                self.history.append(msg)
                return msg.content
        
        return "I'm not sure how to help with that."
    
    def reset(self):
        """Clear conversation history"""
        self.history = []

# ============================================
# USAGE
# ============================================

if __name__ == "__main__":
    assistant = PersonalAssistant()
    
    print("Personal Assistant Aria")
    print("=" * 40)
    print("Type 'quit' to exit, 'reset' to clear history\n")
    
    while True:
        user_input = input("You: ").strip()
        
        if user_input.lower() == 'quit':
            print("Goodbye!")
            break
        elif user_input.lower() == 'reset':
            assistant.reset()
            print("History cleared.\n")
            continue
        elif not user_input:
            continue
        
        response = assistant.chat(user_input)
        print(f"Aria: {response}\n")
```

---

## ❓ Interview Questions

### Beginner Level

**Q1: What is an AI Agent and how is it different from a chatbot?**

> **A:** An AI Agent is an autonomous system that can:
> - Take actions to achieve goals
> - Use tools to interact with the environment
> - Make decisions based on observations
> - Learn from outcomes
>
> A chatbot typically just responds to queries. An agent acts on them.

**Q2: What are the core components of an AI Agent?**

> **A:**
> 1. **Brain (LLM):** Reasoning and decision-making
> 2. **Memory:** Short-term and long-term storage
> 3. **Tools:** Actions the agent can take
> 4. **Planning:** Strategy for achieving goals
> 5. **Action executor:** Runs the decided actions

**Q3: Explain the ReAct pattern.**

> **A:** ReAct = Reasoning + Acting
>
> Pattern: Thought → Action → Observation → Thought → ...
>
> The agent:
> 1. **Thinks** about what to do
> 2. **Acts** using a tool
> 3. **Observes** the result
> 4. Repeats until done

### Intermediate Level

**Q4: How do you handle tool failures in an agent?**

> **A:** Strategies:
> 1. **Retry logic:** Attempt again with modified parameters
> 2. **Fallback tools:** Use alternative tool
> 3. **Error recovery:** Ask for clarification
> 4. **Graceful degradation:** Provide partial results
> 5. **Replanning:** Create new plan avoiding failed approach

**Q5: What is the difference between Plan-and-Execute vs ReAct agents?**

> **A:**
> | Aspect | ReAct | Plan-and-Execute |
> |--------|-------|------------------|
> | Planning | Incremental | Upfront |
> | Flexibility | High | Medium |
> | Efficiency | May waste steps | More direct |
> | Complex tasks | Can struggle | Better suited |
> | Simple tasks | Overkill | Overkill |

**Q6: How do you evaluate agent performance?**

> **A:** Metrics:
> 1. **Task completion rate:** Did it finish?
> 2. **Correctness:** Is the result accurate?
> 3. **Efficiency:** Tool calls, time taken
> 4. **Cost:** Tokens/API calls used
> 5. **Safety:** Did it avoid harmful actions?

### Advanced Level

**Q7: Design a multi-agent system for software development.**

> **A:** Architecture:
> ```
> Product Manager Agent
>       │
> ├── Requirements → Spec Writer Agent
> ├── Design → Architect Agent
> ├── Implementation → Coder Agent
> ├── Testing → QA Agent
> └── Documentation → Doc Writer Agent
> ```
>
> Each agent specializes in their domain and hands off to the next.

**Q8: How do you prevent agent infinite loops?**

> **A:** Prevention strategies:
> 1. **Max iterations:** Hard limit on steps
> 2. **Cycle detection:** Track state history
> 3. **Timeout:** Time-based limits
> 4. **Progress checks:** Verify forward movement
> 5. **Human intervention:** Escalate when stuck
>
> ```python
> agent = AgentExecutor(
>     max_iterations=10,
>     max_execution_time=60
> )
> ```

### FAANG Level

**Q9: Design a production agent system that handles 10K concurrent users.**

> **A:** Architecture:
> ```
> Load Balancer (AWS ALB)
>       │
> API Gateway (rate limiting, auth)
>       │
> Agent Pool (K8s, auto-scaling)
>       │
> ├── Redis (state, caching)
> ├── Postgres (persistence)
> ├── Vector DB (memory)
> ├── Tool APIs (microservices)
> └── LLM API (with fallbacks)
> ```
>
> Key considerations:
> - Async processing for long tasks
> - Queue-based execution
> - Cost optimization (caching, smaller models)
> - Observability (tracing, metrics)
> - Security (sandboxing, permissions)

**Q10: How would you implement agent safety and alignment?**

> **A:** Multi-layer approach:
> 1. **Input filtering:** Block harmful requests
> 2. **Tool permissions:** Restrict dangerous actions
> 3. **Output monitoring:** Check for harmful outputs
> 4. **Human oversight:** Require approval for critical actions
> 5. **Guardrails:** Constitutional AI principles
> 6. **Audit logging:** Track all actions
> 7. **Kill switch:** Emergency stop capability

---

## 📝 Homework

### Easy

1. Create a simple ReAct agent with 2 tools
2. Implement conversation memory for an agent
3. Build an agent that can do math and search

### Medium

4. Create a Plan-and-Execute agent
5. Build an agent with error handling and retries
6. Implement an agent with multiple specialized tools

### Hard

7. Build a multi-agent research system
8. Create an agent with persistent memory (vector store)
9. Implement human-in-the-loop for sensitive actions

### Expert

10. Design and build a software development agent that can:
    - Understand requirements
    - Write code
    - Test code
    - Debug issues

11. Create a production-ready agent system with:
    - Load balancing
    - Caching
    - Monitoring
    - Error recovery

---

## 🎯 Key Takeaways

```
Agent Essentials:
├── Agent = LLM + Tools + Memory + Planning
├── Core loop: Perceive → Think → Plan → Act → Observe
├── Tools enable real-world interaction
├── Memory provides context and learning
└── Planning enables complex task completion

Patterns:
├── ReAct: Interleaved reasoning and acting
├── Plan-and-Execute: Upfront planning
├── Multi-Agent: Specialized collaboration
└── Human-in-the-Loop: Safety and oversight

Best Practices:
├── Clear tool descriptions
├── Robust error handling
├── Resource limits (iterations, time)
├── Comprehensive logging
├── Security considerations
└── Evaluation and testing
```

---

**Next: [07-QA-Application.md](./07-QA-Application.md)** - Build a complete Question-Answering application! ❓
