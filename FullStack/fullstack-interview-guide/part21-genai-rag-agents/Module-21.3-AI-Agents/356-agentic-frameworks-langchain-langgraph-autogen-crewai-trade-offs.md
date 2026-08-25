# Agentic Frameworks — LangChain, LangGraph, AutoGen, CrewAI Trade-offs
> Part 21 — Generative AI for Full Stack Engineers · AI Agents
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Spring AI is the right default for Java/Spring Boot engineers**: native Java, Spring ecosystem integration, `@Tool` annotation for function calling, `ChatClient` + `VectorStore` abstractions, maintained by VMware Broadcom — use this first before adopting Python-first frameworks
- **LangChain is the most widely known but the most over-engineered**: it has an abstraction for everything; for simple use cases the abstraction adds complexity without value; it shines for Python teams that need a large community and many integrations, but its Java support is not native
- **LangGraph is LangChain's answer to stateful agent workflows**: models the agent as a directed graph where nodes are actions and edges are transitions; handles state, branching, cycles, and human-in-the-loop approval gates; the right choice when your workflow is genuinely complex and needs explicit state management
- **AutoGen is best for developer-productivity and code-generation agents**: Microsoft's framework optimised for multi-agent systems where agents converse to solve problems; code execution in sandboxed environments; strongest for technical tasks like automated code review, debugging, test generation
- **CrewAI is simplest to learn**: role-based multi-agent framework; easy to read YAML-defined agents with roles, goals, and backstories; good for prototyping multi-agent scenarios quickly; limited production tooling compared to LangGraph
- **The practical Java answer**: Spring AI for most production Java agent work; LangGraph (Python) if you need complex stateful workflows and are comfortable with Python in the stack; avoid adopting LangChain just for its abstraction layers unless you need a specific integration it provides

---

## 1. One-Line Definition
Agentic frameworks provide the scaffolding for building, running, and deploying AI agents — handling the ReAct loop, tool management, state machine, memory, and multi-agent coordination — so engineers focus on business logic rather than infrastructure.

---

## 2. Framework Comparison Table

| Framework | Language | Strength | Weakness | When to Use |
|-----------|----------|----------|----------|-------------|
| **Spring AI** | Java | Spring ecosystem native, production-grade, managed lifecycle | Smaller community vs Python frameworks; less ecosystem breadth | Default for Java/Spring Boot teams |
| **LangChain** | Python (Java poor) | Huge community; 300+ integrations; chain + agent primitives | Over-abstracted; verbose; breaking changes frequent; Java not first-class | Python teams needing many integrations |
| **LangGraph** | Python | Stateful graph-based workflows; cycles/branching; interrupts for human approval | Python-only; steeper learning curve; requires understanding graph model | Complex multi-agent workflows in Python |
| **AutoGen** | Python | Multi-agent conversation; code execution sandbox; developer tooling | Opinionated about agent conversation protocol; less production hardening | Code review, test gen, debugging agents |
| **CrewAI** | Python | Simple role-based agents; YAML config; beginner-friendly | Limited production tooling; less control over internals | Quick prototyping of multi-agent scenarios |

---

## 3. Spring AI — Java-Native Agent Building

```java
// Spring AI — the Java engineer's primary tool

// Simple agent with tools
@Service
public class CustomerSupportAgent {

    private final ChatClient chatClient;
    private final OrderTools orderTools;       // @Tool annotated bean
    private final RefundTools refundTools;     // @Tool annotated bean

    public String handleQuery(String userMessage) {
        return chatClient.prompt()
            .system("""
                You are a customer support assistant.
                Use tools to check order status and process eligible refunds.
                Always confirm intent before initiating a refund.
                """)
            .user(userMessage)
            .tools(orderTools, refundTools)     // tool registration
            .maxIterations(6)
            .call()
            .content();
    }
}

// STRENGTHS OF SPRING AI:
//  ✅ Java-native — no Python dependency
//  ✅ Spring Boot autoconfiguration — zero manual wiring
//  ✅ Same abstraction interface across OpenAI/Anthropic/Azure/Ollama
//  ✅ VectorStore + EmbeddingModel + ChatClient compose naturally
//  ✅ Production-grade exception handling in Spring Boot context
//  ✅ Spring Security integrates naturally with agent endpoints
```

---

## 4. LangGraph — When You Need a State Machine

```python
# LangGraph (Python) — use when workflow requires:
#   - Explicit state (current step, user preferences, conversation phase)
#   - Branching (different paths based on conditions)
#   - Cycles (agent can re-enter a state)
#   - Human-in-the-loop interrupts (pause for human approval)

from langgraph.graph import StateGraph, END
from typing import TypedDict, List

class AgentState(TypedDict):
    messages: List
    retrieved_docs: List
    answer: str
    needs_human_approval: bool

# Define nodes (states)
def retrieve_documents(state: AgentState) -> AgentState:
    # vector search...
    return {**state, "retrieved_docs": retrieved}

def generate_answer(state: AgentState) -> AgentState:
    # LLM call...
    return {**state, "answer": answer}

def check_requires_approval(state: AgentState) -> str:
    # Routing function: return next node name
    if state["needs_human_approval"]:
        return "human_approval"
    return END

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("retrieve", retrieve_documents)
workflow.add_node("generate", generate_answer)
workflow.add_conditional_edges("generate", check_requires_approval)
workflow.set_entry_point("retrieve")
app = workflow.compile(checkpointer=MemorySaver())

# WHEN TO USE LANGGRAPH vs SPRING AI:
#   Use LangGraph when:
#   - Workflow has genuine branching (different paths for different inputs)
#   - Human-in-the-loop approval is required before irreversible actions
#   - You need explicit state persistence for pause + resume
#   - Your team is Python-first
#
#   Stay with Spring AI when:
#   - Linear or simple sequential agent flow
#   - Java team, Spring stack
#   - Fewer than ~5 distinct agent states
```

---

## 5. AutoGen — Code-Execution Multi-Agent

```python
# AutoGen (Python) — optimised for developer/coding agents
# Multi-agent "conversation" approach: agents discuss a problem until solved

import autogen

config_list = [{"model": "gpt-4o", "api_key": os.environ["OPENAI_API_KEY"]}]

# Two-agent system: Coder + Reviewer
coder = autogen.AssistantAgent(
    name="CodingAssistant",
    llm_config={"config_list": config_list},
    system_message="You are a senior software engineer. "
                   "Write clean, tested Java code for the given task."
)

reviewer = autogen.AssistantAgent(
    name="CodeReviewer",
    llm_config={"config_list": config_list},
    system_message="You are a code reviewer. "
                   "Check for security issues, correctness, and code quality."
)

# Code execution happens in a sandboxed Docker container
user_proxy = autogen.UserProxyAgent(
    name="UserProxy",
    code_execution_config={"work_dir": "sandbox", "use_docker": True}
)

# Run multi-agent conversation
user_proxy.initiate_chat(
    coder,
    message="Write a Spring Boot service that validates Indian mobile numbers"
)

# WHEN TO USE AUTOGEN:
#   - Code generation where execution verification is needed
#   - Automated testing workflows
#   - Developer productivity tools (test writing, doc generation)
#   - Research prototyping
#
# NOT IDEAL FOR:
#   - Production customer-facing agents (conversation model is less predictable)
#   - Java natively (Python-first)
```

---

## 6. CrewAI — Role-Based Agent Prototyping

```python
# CrewAI — simplest way to prototype a multi-agent scenario

from crewai import Agent, Task, Crew

researcher = Agent(
    role="Research Analyst",
    goal="Find the latest trends and competitive insights",
    backstory="Expert at analysing market data and competitor strategies",
    tools=[web_search_tool],
    llm="gpt-4o"
)

writer = Agent(
    role="Content Writer",
    goal="Write compelling product launch content",
    backstory="Experienced B2B technical writer",
    llm="gpt-4o"
)

task1 = Task(
    description="Research competitors for {product}",
    agent=researcher,
    expected_output="Competitive analysis summary"
)

task2 = Task(
    description="Write a press release for {product}",
    agent=writer,
    context=[task1],   # writer uses researcher's output as context
    expected_output="Press release draft"
)

crew = Crew(agents=[researcher, writer], tasks=[task1, task2])
result = crew.kickoff(inputs={"product": "Razorpay Smart Collect V2"})

# WHEN TO USE CREWAI:
#   - Quick prototype of a multi-agent scenario
#   - Non-engineer stakeholders need to read/understand the agent config
#   - Evaluating whether multi-agent is the right approach before building
#
# NOT RECOMMENDED FOR:
#   - Production systems (limited error handling, observability)
#   - Complex stateful workflows (use LangGraph instead)
```

---

## 7. Framework Selection Decision Tree

```
Are you building in Java/Spring Boot?
  YES → Spring AI (default choice)
  
Do you need complex stateful workflows (branching, cycles, human approval)?
  YES → LangGraph if Python is acceptable
  NO  → Spring AI (linear agent flow is fine)

Is the core task automated code generation + execution + review?
  YES → AutoGen
  
Do you need to quickly prototype a multi-agent scenario for evaluation?
  YES → CrewAI (then rebuild in Spring AI / LangGraph for production)
  
Is your team Python-first with many external integrations needed?
  YES → LangChain + LangGraph
```

---

## 8. Interview Questions & Model Answers

### Q1 — Framework choice
**Interviewer:** "Which agentic framework would you use and why?"

**Hruday:**
> "For our Java/Spring Boot stack, Spring AI is the natural choice — it integrates natively with our existing Spring context, uses the same dependency injection we're already familiar with, and the `@Tool` annotation makes function registration clean. I don't need a Python framework and a cross-language boundary just to build an agent. For a task that requires complex stateful workflows with explicit branching and human-in-the-loop approval — for example, a change management agent that requires manager sign-off before deploying infrastructure — I'd evaluate LangGraph. But I'd try to solve it with explicit conditional logic in Spring AI first before adding a full graph framework. My general approach: start simple, add complexity only when the simpler approach demonstrably fails."

---

## 9. Scale Evolution

**Prototype →** Spring AI direct `ChatClient` with `tools()` — no framework; minimal code; fast iteration.

**Production →** Spring AI for production agent endpoints; proper error handling, max_iterations, and audit logging; LangGraph (Python sidecar) if stateful workflow complexity demands it.

**Large-scale →** Multi-agent via Kafka message queue; LangGraph with Redis checkpointer for state persistence; distributed tracing (Micrometer on Java side, LangSmith for Python agent traces).

---

## 10. Company Relevance

| Company | Framework relevance | Interview signal |
|---------|-------------------|-----------------|
| Razorpay / PhonePe | Java-first shops; Spring Boot is the standard backend stack | Spring AI is the obvious answer for Java teams; defend this choice confidently |
| Swiggy / Meesho | High-volume, production-grade agents | Production Spring AI with Resilience4j wrapping tool calls |
| Adobe / Microsoft | Microsoft contributes to Semantic Kernel (C#/Python alternative to Spring AI); MCP protocol for tool definitions | Awareness of Model Context Protocol (MCP) as an emerging tool standard across frameworks |
| SAP Labs | SAP AI Core integrates with multiple frameworks; Spring AI + SAP BTP is the SAP-native path | SAP AI SDK for Java complements Spring AI for SAP-specific service bindings |

---

## 11. Related Topics — What to Study Next

- **Topic 351 — What an AI Agent Is** — framework-agnostic agent concepts
- **Topic 357 — Spring AI** — in-depth Spring AI agent implementation
- **Topic 355 — Multi-Agent Systems** — the architecture that LangGraph orchestrates

---

*Part 21 · Agentic Frameworks — LangChain, LangGraph, AutoGen, CrewAI Trade-offs · Full Stack Interview Guide · Hruday D · 2026*
