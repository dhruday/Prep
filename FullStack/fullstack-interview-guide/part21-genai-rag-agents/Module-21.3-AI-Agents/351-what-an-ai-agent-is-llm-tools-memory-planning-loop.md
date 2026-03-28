# What an AI Agent Is — LLM + Tools + Memory + Planning Loop
> Part 21 — Generative AI for Full Stack Engineers · AI Agents
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **An agent is an LLM that can act**: a plain LLM only generates text; an agent has tools it can call (APIs, database queries, code execution), a loop that lets it reason → act → observe → reason again, and optionally memory to persist state across turns
- **The four components**: LLM (the reasoning engine), Tools (functions the agent can call), Memory (state that persists across iterations), Planning (strategy for decomposing a goal into steps and deciding which tool to call next)
- **The ReAct loop**: Reason (think about the next step) → Act (call a tool) → Observe (read the tool output) → Reason again (decide what to do with the result); repeat until goal achieved or max iterations reached; this is the core loop in every agent
- **Tools are just functions with descriptions**: an agent "knows" about tools through natural language descriptions in the system prompt; the LLM decides which tool to call, what arguments to pass, and how to interpret the result; tool execution runs on your infrastructure, not inside the model
- **Agents can fail in loops**: without a max-iteration safeguard, an agent that hits an error can loop indefinitely; always set a maximum step count and a fallback "I cannot complete this task" response; this is not optional in production
- **Start without agents**: most tasks that seem to need an agent can be solved with a well-designed RAG pipeline or a multi-step prompt chain; agents add significant complexity (non-determinism, hard-to-test loops, debugging difficulty); only use them when the task genuinely requires adaptive multi-step decisions where the next step depends on the previous step's result

---

## 1. One-Line Definition
An AI agent is a system where an LLM iterates through a reason-act-observe loop, selecting and calling external tools at each step, to complete a goal that cannot be solved in a single LLM invocation.

---

## 2. Why Agents Exist

```
SINGLE LLM CALL (sufficient for most tasks):
  Question: "What is the refund policy?"
  → Retrieve from docs + generate answer
  → ONE call to the LLM
  → Done

MULTI-STEP TASK NEEDING AN AGENT:
  Goal: "Book a meeting with Ankit next Tuesday at 2pm, 
         then send him the agenda from last week's notes."
  
  Steps required:
  1. Check Ankit's calendar for Tuesday 2pm availability → API call
  2. If not available, find the next available slot → reason + API call
  3. Create the calendar event → API call
  4. Search meeting notes for last week's agenda → search tool
  5. Draft an email with the agenda → LLM generation
  6. Send the email → email API call
  
  Each step's output determines the next step.
  This cannot be done in one LLM call.
  Each step requires calling an external system.
  This is what agents are built for.
```

---

## 3. The Four Components

### Component 1 — Tools (Functions)

```java
// Tools are plain Java methods annotated for the agent to discover.
// Spring AI @Tool annotation registers them as callable functions.

@Component
public class CalendarTools {

    @Tool(description = "Check availability for a user on a specific date and time. " +
                         "Returns 'available', 'busy', or list of free slots.")
    public String checkAvailability(
            @ToolParam(description = "User email address") String userEmail,
            @ToolParam(description = "ISO-8601 date-time to check") String dateTime) {
        
        // Real calendar API call would go here
        return calendarService.checkAvailability(userEmail, dateTime);
    }

    @Tool(description = "Create a calendar event for a user.")
    public String createEvent(
            @ToolParam(description = "User email") String userEmail,
            @ToolParam(description = "Event title") String title,
            @ToolParam(description = "ISO-8601 start time") String startTime,
            @ToolParam(description = "Duration in minutes") int durationMinutes) {
        
        return calendarService.createEvent(userEmail, title, startTime, durationMinutes);
    }
}
```

### Component 2 — Memory

```
IN-CONTEXT MEMORY (within one session):
  The conversation history is the memory.
  Everything said in this session is in the context window.
  Lost when the session ends.
  
EXTERNAL MEMORY (persists across sessions):
  Stored in a database or vector store.
  Retrieved at start of each session ("load user preferences").
  Can recall facts from previous conversations.
  
EPISODIC MEMORY (remembering past actions):
  "Last time I ran this workflow for this user, step 3 failed."
  Requires explicit storage of past agent runs.
  Enables the agent to avoid repeating past mistakes.
```

### Component 3 — Planning

```
REACTIVE (no upfront plan):
  React loop: reason → tool call → observe → reason...
  No explicit plan; the agent figures out the next step reactively.
  Simple, works well for short chains.
  Downside: can get stuck or loop on unexpected tool output.

EXPLICIT PLAN-THEN-EXECUTE:
  Step 1: Ask the LLM to produce a plan as structured JSON.
          {"steps": ["check calendar", "find notes", "send email"]}
  Step 2: Execute each step in order.
  Advantage: predictable, debuggable, easier to interrupt or resume.
  Downside: plan may not be optimal; rigid when steps fail.
```

### Component 4 — The Reasoning LLM

```
The LLM must decide:
  - Which tool to call next
  - What arguments to pass to the tool
  - How to interpret the tool's output
  - When the goal is complete
  - When to stop and return a result

Model requirements for agents:
  - Strong instruction following
  - Good reasoning about tool descriptions
  - Reliable JSON output for tool calls
  - GPT-4o and Claude Sonnet 3.5 are the current standard choices
  - Smaller models (GPT-4o-mini) are less reliable in agentic loops
```

---

## 4. The ReAct Loop in Detail

```
────────────────────────────────────────────────────────────────────────
Goal: "What is the weather in Bangalore and should I carry an umbrella?"
Tools available: [get_weather(city, date), get_forecast(city, days)]
────────────────────────────────────────────────────────────────────────

ITERATION 1:
  REASON: I need the current weather in Bangalore.
          I should call get_weather with city="Bangalore".
  ACT:    get_weather("Bangalore", today)
  OBSERVE: {"temp": 28, "humidity": 85, "condition": "partly_cloudy"}

ITERATION 2:
  REASON: Current condition is partly cloudy. Humidity is high (85%).
          I should check the forecast to assess rain probability.
  ACT:    get_forecast("Bangalore", 1)
  OBSERVE: {"tomorrow": {"rain_prob": 0.70, "description": "likely_rain"}}

ITERATION 3:
  REASON: Rain probability is 70% today. With humidity at 85% 
          and likely_rain forecast, an umbrella is advisable.
          I have enough information. No more tool calls needed.
  RESULT: "Current temperature in Bangalore is 28°C with high humidity (85%).
           Rain is quite likely (70%) today, so I'd recommend carrying 
           an umbrella."

COMPLETE ✅ Returned in 3 iterations, 2 tool calls.
```

---

## 5. Spring AI Agent Example

```java
@Service
public class BookingAgentService {

    private final ChatClient chatClient;

    // Spring AI agent: tools registered via Spring beans, 
    // agent loop managed by the framework.
    
    public String runAgent(String userGoal) {
        return chatClient.prompt()
            .system("""
                You are a scheduling assistant.
                To complete tasks, use only the tools provided.
                Always check availability before creating an event.
                Stop and return a clear summary when the task is complete.
                If you cannot complete a step after 2 attempts, explain why and stop.
                """)
            .user(userGoal)
            .tools(calendarTools, emailTools)   // Spring beans with @Tool methods
            .maxIterations(8)   // safety limit — never loop indefinitely
            .call()
            .content();
    }
}
```

---

## 6. The Pattern in Practice

### Wrong Way — No max iteration limit

```
❌ No safeguard on the agent loop:

  Tool call fails (calendar API timeout).
  Agent reasons: "I should retry the API call."
  Second call fails.
  Agent reasons: "I should try a different approach to the same goal."
  Calls the tool with slightly different parameters.
  Fails again.
  Agent loops... 20 iterations... 50 iterations...
  
  Cost: 50 LLM calls at $0.01 each = $0.50 for one user request.
  At 1,000 users/day with stuck agents: $500/day in failed loops.
```

```
✅ Always set max iterations + explicit stop condition:

  .maxIterations(8)   // hard limit; no infinite loops
  
  System prompt addition:
  "If you cannot complete a task step after 2 tool attempts,
   stop and return: 'I was unable to complete this step: [reason].'"
   
  The agent self-limits via the instruction.
  The framework enforces the hard limit.
  Both are necessary.
```

---

## 7. Interview Questions & Model Answers

### Q1 — Definition
**Interviewer:** "What is an AI agent?"

**Hruday:**
> "An AI agent is a system that lets an LLM interact with the real world through tools. Instead of generating text once and stopping, the agent runs a loop: it reasons about what to do next, calls an external tool (API, database, search), observes the result, and reasons again. This loop continues until the goal is completed. The key components are the LLM as the reasoning engine, tools as the action functions, memory to track state, and an explicit iteration limit to prevent runaway loops. Agents are the right choice when the task requires multiple steps where each step's action depends on the previous step's output — like booking a meeting, investigating a bug across multiple systems, or researching and summarising a topic from multiple sources."

---

## 8. When NOT to Use an Agent

```
Simple question answering → single LLM call with RAG is enough
Static multi-step where steps are known → prompt chaining (not a loop)
Structured extraction → LLM call with JSON mode
Classification → single LLM call with few-shot

USE AGENTS for:
  - Tasks genuinely requiring adaptive decision-making between steps
  - Use of multiple external APIs in sequence
  - Goal completion that is unpredictable a priori
  - Long-horizon tasks (5+ steps)
```

---

## 9. Scale Evolution

**Prototype →** Direct `chatClient` with `tools()` + simple ReAct via prompt instructions; manual iteration tracking.

**Production →** Framework-managed loop (Spring AI or LangChain); max_iterations enforcement; full audit log of each tool call and result; error handling per tool.

**High complexity →** Multi-agent: orchestrator agent + specialised sub-agents; LangGraph for stateful agent workflows; checkpointing for pause/resume.

---

## 10. Company Relevance

| Company | Agent use case | Interview signal |
|---------|---------------|-----------------|
| Razorpay / PhonePe | Automated dispute resolution agent: query transaction DB + rule engine + send resolution email | Multi-tool agent; max_iterations safety; audit log for every agent action |
| Swiggy / Meesho | Order support agent: check order status + initiate refund if eligible + notify user | Sequential tool calls; conditional tool selection based on tool output |
| Adobe / Microsoft | GitHub Copilot agent (reads code, runs tests, suggests fixes); Adobe Firefly creative agent | Complex multi-step technical agents; LangGraph for workflow state management |
| SAP Labs | Joule agent: query SAP data + trigger SAP workflow + confirm action via chat | SAP-specific tools (BTP APIs, workflow triggers); Spring AI @Tool annotations |

---

## 11. Related Topics — What to Study Next

- **Topic 352 — Tool Use and Function Calling** — the mechanism by which agents call external functions
- **Topic 353 — ReAct Pattern** — the Reasoning + Acting loop in depth
- **Topic 356 — Agentic Frameworks** — LangChain, LangGraph, Spring AI comparison
- **Topic 358 — When Agents go Wrong** — guardrails and failure modes

---

*Part 21 · What an AI Agent Is — LLM + Tools + Memory + Planning Loop · Full Stack Interview Guide · Hruday D · 2026*
