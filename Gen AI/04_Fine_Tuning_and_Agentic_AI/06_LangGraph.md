# 📘 LangGraph - Stateful Multi-Agent Workflows



## 📑 Table of Contents

- [**Purpose (Why this exists):**](#purpose-why-this-exists)
- [**What it is:**](#what-it-is)
- [**How it works (Intuition):**](#how-it-works-intuition)
- [**How it works (Math – simplified):**](#how-it-works-math-simplified)
- [**Visual Explanation (described):**](#visual-explanation-described)
- [**Simple Example:**](#simple-example)
- [**Real-World Applications:**](#real-world-applications)
- [**Common Misconceptions:**](#common-misconceptions)
- [**Best Practices:**](#best-practices)
- [**Key Takeaways:**](#key-takeaways)
- [✅ **Review Questions:**](#review-questions)
- [🧩 **Practice Problems:**](#practice-problems)
- [🚀 **Mini Project:**](#mini-project)

---

---

## **Purpose (Why this exists):**

### **The Limitation of Linear Chains:**

```javascript
const langchain_limitation = {
  problem: {
    chains: 'Always linear: A → B → C → Done',
    no_loops: 'Cannot revisit previous steps',
    no_conditionals: 'Cannot branch based on results',
    no_cycles: 'Cannot iterate until condition met',
    
    example_failure: {
      task: 'Research topic → If unclear, research more → Summarize',
      langchain_chain: 'Research → Summarize (no way to loop back!)',
      issue: 'Stuck with single pass, even if results are bad'
    }
  },
  
  real_world_needs: {
    agents: 'Need to try different tools until success',
    planning: 'Need to revise plans based on feedback',
    validation: 'Need to check quality and retry',
    collaboration: 'Multiple agents working together',
    
    analogy: 'Like forcing a human to make all decisions upfront, no adjustments allowed'
  }
};

const langgraph_solution = {
  vision: 'Stateful, cyclic workflows with conditional branching',
  
  capabilities: {
    cycles: 'Loop until condition met',
    conditionals: 'Branch based on state',
    state: 'Maintain context across nodes',
    human_in_loop: 'Pause for human input',
    multi_agent: 'Coordinate multiple agents',
    memory: 'Persistent state across runs'
  },
  
  breakthrough: 'Build truly agentic systems that reason, plan, and adapt!'
};
```

---

## **What it is:**

### **LangGraph Core Concepts:**

```javascript
const langgraph_architecture = {
  definition: 'Library for building stateful, multi-agent applications with LLMs using graph-based workflows',
  
  key_metaphor: 'State machine meets LLM',
  
  core_components: {
    nodes: {
      what: 'Functions that process state',
      examples: ['call_llm', 'retrieve_docs', 'use_tool', 'validate_output'],
      analogy: 'Like nodes in a flowchart'
    },
    
    edges: {
      what: 'Connections between nodes',
      types: {
        normal: 'Always go to next node',
        conditional: 'Choose next node based on state',
        end: 'Workflow complete'
      },
      analogy: 'Like arrows in flowchart'
    },
    
    state: {
      what: 'Shared data structure passed between nodes',
      example: {
        messages: ['user input', 'llm responses'],
        documents: ['retrieved docs'],
        tool_results: ['tool outputs'],
        iteration_count: 0
      },
      analogy: 'Like Redux store in React'
    },
    
    graph: {
      what: 'Compiled workflow',
      capabilities: ['Execute', 'Stream', 'Checkpoint', 'Resume'],
      analogy: 'Like state machine that can run'
    }
  }
};
```

### **Architecture Comparison:**

```
LangChain (Linear):
┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐
│  A  │ -> │  B  │ -> │  C  │ -> │ End │
└─────┘    └─────┘    └─────┘    └─────┘

Always flows left to right, no going back


LangGraph (Cyclic):
        ┌─────┐
        │Start│
        └──┬──┘
           ↓
      ┌────────┐
      │   A    │ <─────┐
      └───┬────┘        │
          ↓             │
    ┌─────┴─────┐       │
    │           │       │
    ↓           ↓       │
┌────┐      ┌────┐      │
│ B  │      │ C  │      │
└─┬──┘      └─┬──┘      │
  │           │         │
  └─────┬─────┘         │
        ↓               │
   [Condition?]         │
        ├── No ─────────┘ (Loop back)
        │
        Yes
        ↓
      ┌────┐
      │End │
      └────┘

Can loop, branch, conditional routing!
```

---

## **How it works (Intuition):**

### **State Machine Intuition:**

```javascript
// Think of a coffee machine

const coffee_machine_state = {
  current_state: 'idle',
  
  states: {
    idle: {
      on_button_press: 'brewing'
    },
    brewing: {
      on_complete: 'ready',
      on_error: 'error'
    },
    ready: {
      on_cup_removed: 'idle'
    },
    error: {
      on_reset: 'idle'
    }
  },
  
  analogy: 'Each state knows what to do next based on conditions'
};

// LangGraph is similar but for AI workflows
const langgraph_workflow = {
  current_state: {
    messages: [],
    tools_used: [],
    iteration: 0
  },
  
  nodes: {
    'plan': {
      action: 'Create plan to answer question',
      next: 'execute'
    },
    'execute': {
      action: 'Try to execute plan',
      next: decision => decision.success ? 'respond' : 'replan'
    },
    'replan': {
      action: 'Revise plan based on failure',
      next: 'execute'
    },
    'respond': {
      action: 'Generate final response',
      next: 'END'
    }
  },
  
  magic: 'Can loop execute→replan until success!'
};
```

### **ReAct Pattern Intuition:**

```javascript
// ReAct = Reasoning + Acting

const human_problem_solving = {
  task: 'What is the weather in Paris?',
  
  process: [
    {
      thought: 'I need to check current weather',  // Reasoning
      action: 'Use weather API for Paris',          // Acting
      observation: 'Weather API returns: 18°C, cloudy'
    },
    {
      thought: 'I have the information needed',     // Reasoning
      action: 'Provide answer to user',             // Acting
      observation: 'Done'
    }
  ],
  
  pattern: 'Think → Act → Observe → Think → ...'
};

// LangGraph implements this naturally
const langgraph_react = {
  nodes: {
    'agent': 'Decide what to do (Reasoning)',
    'tools': 'Execute tool (Acting)',
    'observe': 'Process results (Observation)'
  },
  
  flow: 'agent → tools → observe → agent → ... (loop until done)',
  
  conditional: {
    from: 'agent',
    check: state => state.should_continue ? 'tools' : 'END',
    allows: 'Agent decides when to stop'
  }
};
```

---

## **How it works (Math – simplified):**

### **State Transition Mathematics:**

```python
# LangGraph State Transition System

class StateGraph:
    def __init__(self):
        self.nodes = {}
        self.edges = {}
        self.state = {}
    
    def add_node(self, name, function):
        """
        Add node: s' = f(s)
        where s = current state, s' = next state
        """
        self.nodes[name] = function
    
    def add_edge(self, from_node, to_node):
        """
        Add deterministic edge: from_node → to_node
        """
        if from_node not in self.edges:
            self.edges[from_node] = []
        self.edges[from_node].append(('edge', to_node))
    
    def add_conditional_edges(self, from_node, condition_fn):
        """
        Add conditional edge: from_node → condition_fn(state) → next_node
        
        Mathematically:
          next = condition_fn(s_t)
          s_{t+1} = nodes[next](s_t)
        """
        self.edges[from_node] = [('conditional', condition_fn)]
    
    def execute(self, initial_state):
        """
        Execute graph: iteratively apply state transitions
        
        s_0 = initial_state
        s_{t+1} = f_{next}(s_t)
        
        where next = edge_function(s_t)
        """
        state = initial_state
        current_node = 'START'
        iteration = 0
        max_iterations = 100
        
        while current_node != 'END' and iteration < max_iterations:
            # Apply node function
            if current_node in self.nodes:
                state = self.nodes[current_node](state)
            
            # Determine next node
            if current_node in self.edges:
                edge_type, edge_fn = self.edges[current_node][0]
                
                if edge_type == 'edge':
                    current_node = edge_fn
                elif edge_type == 'conditional':
                    current_node = edge_fn(state)
            else:
                break
            
            iteration += 1
        
        return state


# Mathematical formulation:
"""
State Graph = (S, N, E, f, s_0)

S = State space (all possible states)
N = Set of nodes {n_1, n_2, ..., n_k}
E = Set of edges (transitions)
f: S × N → S (node function maps state to new state)
s_0 = Initial state

Execution:
  s_0 = initial_state
  n_0 = START
  
  For t = 0, 1, 2, ...:
    s_{t+1} = f(s_t, n_t)
    n_{t+1} = edge_function(s_t, n_t)
    
    Until n_t = END
"""
```

### **Agent Loop Mathematics:**

```python
# Mathematical model of agent loop

def agent_loop(question, tools, max_iterations=10):
    """
    Agent decides: continue with tool OR finish
    
    At each step t:
      1. Agent: a_t = π(s_t)  where π is policy (LLM)
      2. Execute: o_t = tool(a_t) if a_t is tool action
      3. Update: s_{t+1} = s_t + [a_t, o_t]
      4. Repeat until termination
    """
    state = {
        'messages': [{'role': 'user', 'content': question}],
        'tools_used': [],
        'observations': []
    }
    
    for t in range(max_iterations):
        # Agent policy: π(s_t) → action
        # LLM decides: [Tool, Args] OR [Finish, Answer]
        action = agent_policy(state)
        
        if action['type'] == 'finish':
            return action['answer']
        
        # Execute tool
        tool_name = action['tool']
        tool_args = action['args']
        observation = tools[tool_name](**tool_args)
        
        # Update state: s_{t+1} = s_t ∪ {action, observation}
        state['tools_used'].append(action)
        state['observations'].append(observation)
        state['messages'].append({
            'role': 'tool',
            'content': f"{tool_name}: {observation}"
        })
    
    return "Max iterations reached"


# Reinforcement Learning formulation:
"""
MDP = (S, A, P, R, γ)

S = States (conversation history + tool results)
A = Actions (use_tool_X OR finish_with_answer)
P(s'|s,a) = Transition (deterministic for tools)
R(s,a) = Reward (1 if correct answer, 0 otherwise)
γ = Discount factor

Agent learns policy π* that maximizes:
  E[Σ_{t=0}^∞ γ^t R(s_t, a_t)]

In practice, π = LLM (few-shot prompted or fine-tuned)
"""
```

---

## **Visual Explanation (described):**

### **Simple Agent Graph:**

```
┌──────────────────────────────────────────────┐
│              START                           │
│         User Question                        │
└──────────────┬───────────────────────────────┘
               ↓
         ┌────────────┐
         │   AGENT    │
         │  (Reason)  │
         └─────┬──────┘
               ↓
         [Should Continue?]
          /          \
        Yes          No
         ↓            ↓
    ┌────────┐   ┌─────────┐
    │ TOOLS  │   │ RESPOND │
    │(Action)│   │(Finish) │
    └───┬────┘   └────┬────┘
        ↓             ↓
    [Result]        [END]
        ↓
    (Loop back to AGENT)
    

Example Execution:
1. User: "What's weather in Paris?"
2. Agent: "I need weather data" → Choose WeatherTool
3. Tools: Call weather API → "18°C, cloudy"
4. Agent: "I have info" → Choose Respond
5. Respond: "Weather in Paris is 18°C and cloudy"
6. END
```

### **Multi-Agent Collaboration:**

```
┌─────────────────────────────────────────────┐
│          START: Complex Question            │
└──────────────┬──────────────────────────────┘
               ↓
        ┌──────────────┐
        │  SUPERVISOR  │ ← Coordinates agents
        │    Agent     │
        └──────┬───────┘
               ↓
        [Route to expert]
         /      |      \
        ↓       ↓       ↓
   ┌────────┐ ┌────────┐ ┌────────┐
   │Research│ │  Code  │ │Writing │
   │ Agent  │ │ Agent  │ │ Agent  │
   └───┬────┘ └────┬───┘ └───┬────┘
       ↓           ↓          ↓
       └───────────┴──────────┘
                   ↓
          ┌────────────────┐
          │   AGGREGATOR   │
          │ Combine results│
          └────────┬───────┘
                   ↓
                 [END]

Each agent is a subgraph with own tools and reasoning!
```

### **Human-in-the-Loop Pattern:**

```
┌────────────────────────────────────┐
│        START: Generate Report      │
└──────────────┬─────────────────────┘
               ↓
         ┌──────────┐
         │  DRAFT   │
         │ Generate │
         └────┬─────┘
              ↓
      ┌──────────────┐
      │   INTERRUPT  │ ← Pause here
      │ Wait for     │
      │ Human Review │
      └──────┬───────┘
             ↓
      [Human provides feedback]
             ↓
        ┌─────────┐
        │ REVISE  │
        │ Based on│
        │Feedback │
        └────┬────┘
             ↓
       [Good enough?]
         /        \
       No         Yes
        ↓          ↓
   (back to     [END]
    REVISE)

Allows human oversight at critical points!
```

---

## **Simple Example:**

### **JavaScript Conceptual Implementation:**

```javascript
// Simplified LangGraph-like State Machine

class StateGraph {
  constructor() {
    this.nodes = {};
    this.edges = {};
    this.start_node = null;
  }
  
  addNode(name, fn) {
    this.nodes[name] = fn;
  }
  
  addEdge(from, to) {
    this.edges[from] = { type: 'direct', next: to };
  }
  
  addConditionalEdge(from, conditionFn) {
    this.edges[from] = { type: 'conditional', fn: conditionFn };
  }
  
  setEntryPoint(node) {
    this.start_node = node;
  }
  
  async run(initialState) {
    let state = { ...initialState };
    let currentNode = this.start_node;
    const history = [];
    
    while (currentNode && currentNode !== 'END') {
      console.log(`\n→ Executing: ${currentNode}`);
      
      // Execute node
      if (this.nodes[currentNode]) {
        state = await this.nodes[currentNode](state);
        history.push({ node: currentNode, state: { ...state } });
      }
      
      // Determine next node
      const edge = this.edges[currentNode];
      if (!edge) break;
      
      if (edge.type === 'direct') {
        currentNode = edge.next;
      } else if (edge.type === 'conditional') {
        currentNode = edge.fn(state);
      }
      
      // Safety check
      if (history.length > 20) {
        console.log('Max iterations reached');
        break;
      }
    }
    
    return { state, history };
  }
}

// Example: Research Agent with Retry Logic
async function buildResearchAgent() {
  const graph = new StateGraph();
  
  // Node: Plan research
  graph.addNode('plan', async (state) => {
    console.log('Planning research...');
    return {
      ...state,
      plan: `Research "${state.question}" using web search`,
      attempts: 0
    };
  });
  
  // Node: Execute research
  graph.addNode('research', async (state) => {
    console.log('Executing research...');
    
    // Simulate research (sometimes fails)
    const success = Math.random() > 0.3;
    
    return {
      ...state,
      attempts: state.attempts + 1,
      results: success ? `Found: Answer to "${state.question}"` : null,
      success
    };
  });
  
  // Node: Respond
  graph.addNode('respond', async (state) => {
    console.log('Generating response...');
    return {
      ...state,
      response: `Based on research: ${state.results}`
    };
  });
  
  // Setup flow
  graph.setEntryPoint('plan');
  graph.addEdge('plan', 'research');
  
  // Conditional: retry if failed, respond if succeeded
  graph.addConditionalEdge('research', (state) => {
    if (state.success) {
      return 'respond';
    } else if (state.attempts < 3) {
      console.log('Research failed, retrying...');
      return 'research';  // Loop back!
    } else {
      console.log('Max attempts reached');
      return 'END';
    }
  });
  
  graph.addEdge('respond', 'END');
  
  return graph;
}

// Usage
async function main() {
  const agent = await buildResearchAgent();
  
  const result = await agent.run({
    question: 'What is LangGraph?'
  });
  
  console.log('\n=== Final State ===');
  console.log(result.state);
  
  console.log('\n=== Execution History ===');
  result.history.forEach((step, i) => {
    console.log(`${i + 1}. ${step.node}`);
  });
}

main();
```

### **Python Real Implementation:**

```python
# ============================================
# 1. Basic LangGraph Setup
# ============================================

from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

# Define state
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    iterations: int

# Create graph
workflow = StateGraph(AgentState)

# Add nodes
def call_model(state):
    # Simulate LLM call
    response = f"Response to: {state['messages'][-1]}"
    return {
        "messages": [response],
        "iterations": state.get("iterations", 0) + 1
    }

workflow.add_node("agent", call_model)

# Add edges
workflow.set_entry_point("agent")
workflow.add_edge("agent", END)

# Compile
app = workflow.compile()

# Run
result = app.invoke({
    "messages": ["Hello"],
    "iterations": 0
})
print(result)


# ============================================
# 2. ReAct Agent Pattern
# ============================================

from langchain_openai import ChatOpenAI
from langchain.tools import tool
from langgraph.prebuilt import ToolExecutor, ToolInvocation

# Define tools
@tool
def search(query: str) -> str:
    """Search the web for information."""
    return f"Search results for: {query}"

@tool
def calculator(expression: str) -> str:
    """Calculate mathematical expression."""
    try:
        return str(eval(expression))
    except:
        return "Error in calculation"

tools = [search, calculator]
tool_executor = ToolExecutor(tools)

# Define agent state
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    tools_used: list

# Agent node
def call_agent(state):
    llm = ChatOpenAI(temperature=0)
    llm_with_tools = llm.bind_tools(tools)
    
    response = llm_with_tools.invoke(state["messages"])
    
    return {
        "messages": [response],
        "tools_used": state.get("tools_used", [])
    }

# Tool node
def call_tools(state):
    last_message = state["messages"][-1]
    
    # Execute all tool calls
    tool_results = []
    for tool_call in last_message.tool_calls:
        tool_result = tool_executor.invoke(
            ToolInvocation(
                tool=tool_call["name"],
                tool_input=tool_call["args"]
            )
        )
        tool_results.append({
            "tool": tool_call["name"],
            "result": tool_result
        })
    
    return {
        "messages": [{"role": "tool", "content": str(tool_results)}],
        "tools_used": state.get("tools_used", []) + tool_results
    }

# Conditional routing
def should_continue(state):
    last_message = state["messages"][-1]
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"
    return "end"

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("agent", call_agent)
workflow.add_node("tools", call_tools)

workflow.set_entry_point("agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {
        "tools": "tools",
        "end": END
    }
)
workflow.add_edge("tools", "agent")

# Compile and run
app = workflow.compile()

result = app.invoke({
    "messages": [{"role": "user", "content": "What is 25 * 17?"}],
    "tools_used": []
})

print("Final result:", result["messages"][-1])
print("Tools used:", result["tools_used"])


# ============================================
# 3. Multi-Agent System
# ============================================

class SupervisorState(TypedDict):
    messages: Annotated[list, operator.add]
    next_agent: str
    results: dict

# Research agent
def research_agent(state):
    print("Research agent working...")
    return {
        "messages": ["Research: Found relevant papers"],
        "results": {**state.get("results", {}), "research": "Done"}
    }

# Code agent
def code_agent(state):
    print("Code agent working...")
    return {
        "messages": ["Code: Implemented solution"],
        "results": {**state.get("results", {}), "code": "Done"}
    }

# Writing agent
def writing_agent(state):
    print("Writing agent working...")
    return {
        "messages": ["Writing: Documented solution"],
        "results": {**state.get("results", {}), "writing": "Done"}
    }

# Supervisor decides which agent to call
def supervisor(state):
    # Simple logic: research → code → writing
    results = state.get("results", {})
    
    if "research" not in results:
        next_agent = "research"
    elif "code" not in results:
        next_agent = "code"
    elif "writing" not in results:
        next_agent = "writing"
    else:
        next_agent = "finish"
    
    return {"next_agent": next_agent}

# Router
def route(state):
    return state["next_agent"]

# Build graph
workflow = StateGraph(SupervisorState)

workflow.add_node("supervisor", supervisor)
workflow.add_node("research", research_agent)
workflow.add_node("code", code_agent)
workflow.add_node("writing", writing_agent)

workflow.set_entry_point("supervisor")
workflow.add_conditional_edges(
    "supervisor",
    route,
    {
        "research": "research",
        "code": "code",
        "writing": "writing",
        "finish": END
    }
)

# All agents return to supervisor
workflow.add_edge("research", "supervisor")
workflow.add_edge("code", "supervisor")
workflow.add_edge("writing", "supervisor")

app = workflow.compile()

result = app.invoke({
    "messages": ["Build a web scraper"],
    "results": {}
})

print("Final results:", result["results"])


# ============================================
# 4. Human-in-the-Loop
# ============================================

from langgraph.checkpoint.memory import MemorySaver

class HumanInLoopState(TypedDict):
    content: str
    feedback: str
    iterations: int

# Generate draft
def generate_draft(state):
    print("\nGenerating draft...")
    draft = f"Draft version {state.get('iterations', 0) + 1}"
    return {
        "content": draft,
        "iterations": state.get("iterations", 0) + 1
    }

# Revise based on feedback
def revise(state):
    print(f"\nRevising based on feedback: {state['feedback']}")
    revised = f"{state['content']} (revised)"
    return {"content": revised}

# Check if approved
def check_approval(state):
    # In real app, wait for human input
    # Here we simulate
    if state.get("iterations", 0) >= 2:
        return "approve"
    return "revise"

# Build graph with checkpointing
workflow = StateGraph(HumanInLoopState)

workflow.add_node("draft", generate_draft)
workflow.add_node("revise", revise)

workflow.set_entry_point("draft")
workflow.add_conditional_edges(
    "draft",
    check_approval,
    {
        "revise": "revise",
        "approve": END
    }
)
workflow.add_edge("revise", "draft")

# Use memory saver for interrupts
memory = MemorySaver()
app = workflow.compile(checkpointer=memory, interrupt_before=["revise"])

# Run with checkpoints
config = {"configurable": {"thread_id": "1"}}

# First run - will stop at interrupt
result = app.invoke(
    {"content": "", "iterations": 0},
    config=config
)
print("Interrupted:", result)

# Resume with feedback
result = app.invoke(
    {"feedback": "Make it better"},
    config=config
)
print("After feedback:", result)


# ============================================
# 5. Plan-and-Execute Pattern
# ============================================

class PlanExecuteState(TypedDict):
    input: str
    plan: list[str]
    past_steps: list[tuple]
    response: str

# Planner
def planner(state):
    print("\n=== Planning ===")
    # In real app, use LLM to create plan
    plan = [
        "Step 1: Research the topic",
        "Step 2: Analyze findings",
        "Step 3: Generate response"
    ]
    return {"plan": plan, "past_steps": []}

# Executor
def executor(state):
    task = state["plan"][len(state["past_steps"])]
    print(f"\n=== Executing: {task} ===")
    
    # Simulate execution
    result = f"Completed: {task}"
    
    return {
        "past_steps": state["past_steps"] + [(task, result)]
    }

# Replanner (optional: revise plan if needed)
def replanner(state):
    if len(state["past_steps"]) < len(state["plan"]):
        return "continue"
    return "finish"

# Responder
def responder(state):
    print("\n=== Generating Final Response ===")
    response = "Final answer based on: " + "; ".join(
        [result for _, result in state["past_steps"]]
    )
    return {"response": response}

# Build graph
workflow = StateGraph(PlanExecuteState)

workflow.add_node("planner", planner)
workflow.add_node("executor", executor)
workflow.add_node("responder", responder)

workflow.set_entry_point("planner")
workflow.add_edge("planner", "executor")
workflow.add_conditional_edges(
    "executor",
    replanner,
    {
        "continue": "executor",
        "finish": "responder"
    }
)
workflow.add_edge("responder", END)

app = workflow.compile()

result = app.invoke({"input": "Explain quantum computing"})
print("\nFinal:", result["response"])


# ============================================
# 6. Streaming and Visualization
# ============================================

# Stream execution
workflow = StateGraph(AgentState)
# ... add nodes ...
app = workflow.compile()

# Stream results
for chunk in app.stream({"messages": ["Hello"]}):
    print(chunk)

# Get graph visualization
from IPython.display import Image, display

display(Image(app.get_graph().draw_mermaid_png()))


# ============================================
# 7. Production RAG with LangGraph
# ============================================

class RAGState(TypedDict):
    question: str
    documents: list
    answer: str
    needs_more_context: bool

def retrieve_documents(state):
    print("Retrieving documents...")
    # Simulate retrieval
    docs = ["Doc 1: ...", "Doc 2: ..."]
    return {"documents": docs}

def generate_answer(state):
    print("Generating answer...")
    context = "\n".join(state["documents"])
    answer = f"Based on {len(state['documents'])} docs: Answer to {state['question']}"
    
    # Check if confident
    confident = len(state["documents"]) >= 2
    
    return {
        "answer": answer,
        "needs_more_context": not confident
    }

def retrieve_more(state):
    print("Retrieving additional context...")
    more_docs = ["Doc 3: ...", "Doc 4: ..."]
    return {"documents": state["documents"] + more_docs}

def should_retrieve_more(state):
    if state.get("needs_more_context", False):
        return "retrieve_more"
    return "finish"

# Build RAG graph
workflow = StateGraph(RAGState)
workflow.add_node("retrieve", retrieve_documents)
workflow.add_node("generate", generate_answer)
workflow.add_node("retrieve_more", retrieve_more)

workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_conditional_edges(
    "generate",
    should_retrieve_more,
    {
        "retrieve_more": "retrieve_more",
        "finish": END
    }
)
workflow.add_edge("retrieve_more", "generate")

app = workflow.compile()

result = app.invoke({"question": "What is LangGraph?"})
print("Answer:", result["answer"])
```

---

## **Real-World Applications:**

### **1. Autonomous Research Assistant:**

```python
# Agent that researches topic thoroughly

def build_research_assistant():
    class ResearchState(TypedDict):
        topic: str
        sources: list
        summary: str
        quality_score: float
    
    # Research phase
    def research(state):
        # Search, scrape, extract info
        return {"sources": [...]}
    
    # Quality check
    def validate(state):
        score = evaluate_quality(state["sources"])
        return {"quality_score": score}
    
    # Conditional: good enough or need more?
    def check_quality(state):
        return "finish" if state["quality_score"] > 0.8 else "research"
    
    # Build workflow with loop
    workflow = StateGraph(ResearchState)
    workflow.add_node("research", research)
    workflow.add_node("validate", validate)
    workflow.add_edge("research", "validate")
    workflow.add_conditional_edges("validate", check_quality, {
        "research": "research",  # Loop back!
        "finish": END
    })
    
    return workflow.compile()
```

### **2. Code Review Agent:**

```python
# Multi-agent code review system

def build_code_reviewer():
    # Agents:
    # 1. Security reviewer
    # 2. Performance reviewer
    # 3. Style reviewer
    # 4. Aggregator
    
    def security_review(state):
        issues = scan_for_security_issues(state["code"])
        return {"security_issues": issues}
    
    def performance_review(state):
        issues = analyze_performance(state["code"])
        return {"performance_issues": issues}
    
    def style_review(state):
        issues = check_style(state["code"])
        return {"style_issues": issues}
    
    def aggregate(state):
        all_issues = (
            state["security_issues"] +
            state["performance_issues"] +
            state["style_issues"]
        )
        return {"final_report": format_report(all_issues)}
    
    # Parallel execution of reviewers
    workflow = StateGraph(ReviewState)
    workflow.add_node("security", security_review)
    workflow.add_node("performance", performance_review)
    workflow.add_node("style", style_review)
    workflow.add_node("aggregate", aggregate)
    
    # All reviewers run in parallel, then aggregate
    workflow.set_entry_point("security")
    workflow.set_entry_point("performance")
    workflow.set_entry_point("style")
    
    workflow.add_edge("security", "aggregate")
    workflow.add_edge("performance", "aggregate")
    workflow.add_edge("style", "aggregate")
    workflow.add_edge("aggregate", END)
    
    return workflow.compile()
```

---

## **Common Misconceptions:**

### ❌ **Misconception 1: "LangGraph is just for agents"**

**Reality:**
```python
langgraph_use_cases = {
    'agents': True,  # Yes, great for agents
    
    'but_also': [
        'Complex workflows with branching',
        'Iterative refinement (write→review→revise)',
        'Multi-stage pipelines with validation',
        'Human-in-the-loop workflows',
        'Parallel processing with coordination',
        'State machines for any domain'
    ],
    
    'rule': 'Use LangGraph whenever you need cycles, conditions, or complex state'
}
```

### ❌ **Misconception 2: "Linear chains are always better for simple tasks"**

**Reality:**
```python
# Even "simple" tasks benefit from LangGraph

example = {
    'task': 'Answer question from docs',
    
    'linear_approach': {
        'flow': 'retrieve → generate',
        'problem': 'What if retrieved docs are irrelevant?'
    },
    
    'langgraph_approach': {
        'flow': '''
            retrieve → generate
                       ↓
                 [confident?]
                  /        \
                Yes        No
                ↓          ↓
               END    retrieve_more → generate
        ''',
        'benefit': 'Automatically handles edge cases!'
    }
}
```

---

## **Best Practices:**

### **1. State Design:**

```python
# Good: Minimal, typed state
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]  # Append-only
    context: dict
    iteration: int

# Bad: Untyped, kitchen sink
class BadState(dict):
    pass  # Anything goes!
```

### **2. Node Design:**

```python
# Good: Pure functions
def process_node(state):
    result = compute(state["input"])
    return {"output": result}  # Only return changes

# Bad: Side effects
def bad_node(state):
    global some_var
    some_var = state["input"]  # Don't mutate globals!
    state["output"] = "..."  # Don't mutate input!
    return state
```

### **3. Error Handling:**

```python
def safe_node(state):
    try:
        result = risky_operation(state)
        return {"result": result, "error": None}
    except Exception as e:
        return {"result": None, "error": str(e)}

# Conditional: handle errors gracefully
def check_error(state):
    return "retry" if state["error"] else "continue"
```

---

## **Key Takeaways:**

```javascript
const langgraph_mastery = {
  core_innovation: 'Stateful, cyclic workflows (not just linear chains)',
  
  key_patterns: {
    react: 'Think → Act → Observe → Repeat',
    plan_execute: 'Plan → Execute steps → Revise if needed',
    multi_agent: 'Supervisor coordinates specialized agents',
    human_in_loop: 'Interrupt for human feedback'
  },
  
  when_to_use_langgraph: [
    'Need loops or cycles',
    'Conditional branching',
    'Multi-agent systems',
    'Iterative refinement',
    'Human oversight required',
    'Complex state management'
  ],
  
  when_to_use_langchain: [
    'Simple linear workflows',
    'One-shot tasks',
    'No complex state',
    'Standard patterns (QA, summarization)'
  ]
};
```

---

## ✅ **Review Questions:**

1. **Conceptual:**
   - What's the difference between LangChain and LangGraph?
   - What is a state graph?
   - Why are cycles important?

2. **Technical:**
   - How do conditional edges work?
   - What's the ReAct pattern?
   - How does checkpointing enable human-in-the-loop?

3. **Practical:**
   - When to use LangGraph vs LangChain?
   - How to design good state?
   - How to handle errors in graphs?

---

## 🧩 **Practice Problems:**

### **Problem 1: Self-Improving Agent**

```python
# Build agent that:
# 1. Attempts task
# 2. Evaluates own output
# 3. If quality < threshold, revises
# 4. Repeats until good enough or max iterations

class SelfImprovingState(TypedDict):
    task: str
    output: str
    quality: float
    iterations: int
```

### **Problem 2: Debate System**

```python
# Two agents debate a topic:
# 1. Agent A makes argument
# 2. Agent B counters
# 3. Judge evaluates
# 4. If no consensus, continue debate
# 5. Max 5 rounds
```

---

## 🚀 **Mini Project:**

**Build Autonomous Content Creator:**

```python
class ContentCreatorState(TypedDict):
    topic: str
    outline: str
    draft: str
    feedback: str
    final: str

# Workflow:
# 1. Research topic (web search)
# 2. Create outline
# 3. Write draft
# 4. Self-review quality
# 5. If quality < 0.8, revise (loop back to step 3)
# 6. Generate final version

# Implement full graph with:
# - Research node
# - Outline node
# - Draft node
# - Review node
# - Conditional edge based on quality
# - Streaming support
```

---

**🎉 LangGraph Complete!**

You now understand:
- Stateful workflows
- Cyclic graphs
- Multi-agent systems
- Human-in-the-loop

**Next:** **AI Agents** - Autonomous systems! 🚀
