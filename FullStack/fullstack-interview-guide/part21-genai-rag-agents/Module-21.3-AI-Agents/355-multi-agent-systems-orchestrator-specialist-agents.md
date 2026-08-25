# Multi-Agent Systems — Orchestrator + Specialist Agents
> Part 21 — Generative AI for Full Stack Engineers · AI Agents
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The problem a single agent can't solve well**: a single agent given a very broad goal (research + write + publish a report) has too many responsibilities; its tool set gets large and unwieldy; its context fills quickly; it makes poor decisions trying to balance too many concerns; multi-agent divides the work
- **Orchestrator receives the user's goal and decomposes it** into subtasks; it routes each subtask to the appropriate specialist agent; it synthesises results; it does NOT perform the subtasks itself — it delegates
- **Specialist agents are narrow and deep**: a research agent knows only search tools; a writing agent knows only text generation patterns; a code agent knows only code tools; narrow specialisation makes each agent more reliable and easier to test
- **Communication between agents is just message passing**: an orchestrator sends a task description to a specialist; the specialist returns a result; this can be a direct function call, a message queue (Kafka), or an API call; there is no special protocol — it's delegation
- **Trust boundaries matter**: agents should not blindly pass outputs from one agent to another without validation; an output from a specialist agent that will become a tool argument for another agent must be validated just as carefully as user input; agents can hallucinate just like base LLMs
- **Start with a single agent, upgrade to multi-agent only when justified**: multi-agent adds coordination overhead, harder debugging (which agent caused the bad output?), and more failure points; the bar should be: is this task genuinely too broad or complex for one agent with a reasonable tool set?

---

## 1. One-Line Definition
A multi-agent system is an architecture where an orchestrator agent decomposes a complex goal into subtasks and delegates each subtask to a specialist agent, synthesising the results to produce a final output that no single general-purpose agent could produce reliably alone.

---

## 2. The Problem Single Agents Hit

```
SINGLE AGENT — "Plan a product launch"

Tool set required:
  - search_web (research existing competitors)
  - write_content (draft press release, blog post, emails)
  - query_crm (get customer segments)
  - schedule_email_campaign (send to segments)
  - update_website (publish landing page)
  - monitor_analytics (track launch performance)

Problems:
  - 6 very different tools; prompt gets complex
  - Context fills with research, draft content, CRM data simultaneously
  - The model makes poor trade-offs when reasoning about too many domains
  - A single error in one tool contaminates the entire workflow

MULTI-AGENT — same task:
  Orchestrator receives: "Plan a product launch"
  
  → Research Agent: "Research top 5 competitors" → returns competitive summary
  
  → Content Agent (given competitive summary): "Draft press release, 
    blog post, and 3 emails" → returns content drafts
  
  → CRM Agent: "Get customer segments interested in this product" 
    → returns segment list
  
  → Distribution Agent (given content + segments): 
    "Schedule the email campaign and publish landing page"
    → returns confirmation
  
  → Orchestrator synthesises: "Launch campaign scheduled. 
    Press release posted. 3 emails queued for [segments]."
  
  Each agent is narrow, focused, and independently testable.
```

---

## 3. The Orchestrator Pattern

```
ORCHESTRATOR RESPONSIBILITIES:
  1. Receive and understand the user's goal
  2. Decompose into ordered or parallel subtasks
  3. Determine which specialist handles each subtask
  4. Pass results between specialists as needed
  5. Handle specialist failures (retry, skip, or escalate)
  6. Synthesise final response for the user

WHAT ORCHESTRATORS DO NOT DO:
  → They do not directly call external APIs (that's specialists' job)
  → They do not generate the final content (that's specialists' job)
  → They do not hold large tool sets themselves

ORCHESTRATOR SYSTEM PROMPT (key instructions):
  "You are a task coordinator. You do not execute tasks directly.
   You break down goals and delegate to specialist agents.
   Available specialists: [list of specialists and their capabilities]
   When you receive results from specialists, synthesise them 
   into a clear final response for the user.
   If a specialist fails, note the failure and continue with 
   remaining subtasks."
```

---

## 4. Spring AI Multi-Agent Example

```java
// Specialist 1: Research Agent
@Component
public class ResearchAgent {
    
    private final ChatClient chatClient;
    private final WebSearchTools webSearchTools;
    
    public String research(String topic) {
        return chatClient.prompt()
            .system("You are a research specialist. Search for information " +
                    "and return a concise summary with cited sources.")
            .user("Research: " + topic)
            .tools(webSearchTools)
            .maxIterations(5)
            .call()
            .content();
    }
}

// Specialist 2: Writing Agent
@Component
public class ContentWritingAgent {

    private final ChatClient chatClient;

    public String writeContent(String contentType, String context, String tone) {
        return chatClient.prompt()
            .system("You are a content writing specialist. " +
                    "Write clear, professional content in the requested format.")
            .user("Write a " + contentType + " in a " + tone + " tone.\n\n" +
                  "Context:\n" + context)
            .call()
            .content();
    }
}

// Orchestrator
@Service
public class ProductLaunchOrchestrator {

    private final ResearchAgent researchAgent;
    private final ContentWritingAgent contentWritingAgent;
    private final ChatClient chatClient;

    public String planProductLaunch(String productDescription) {
        
        // Step 1: Decompose the goal
        // (in a real system, the orchestrator LLM would do this dynamically)
        
        // Step 2: Execute specialist tasks — research can be parallel
        String competitorResearch = researchAgent.research(
            "Top 5 competitors for: " + productDescription);
        
        String marketTrends = researchAgent.research(
            "Current market trends for: " + productDescription);
        
        // Step 3: Validate specialist output before passing to next agent
        // (don't blindly pass research output into content generation)
        if (competitorResearch.isBlank() || competitorResearch.contains("ERROR")) {
            competitorResearch = "Competitor research unavailable. Proceed without.";
        }
        
        // Step 4: Content generation uses research output as context
        String pressRelease = contentWritingAgent.writeContent(
            "press release",
            "Product: " + productDescription + 
            "\n\nMarket context: " + competitorResearch,
            "professional"
        );
        
        // Step 5: Orchestrator synthesises the final output
        return chatClient.prompt()
            .system("Synthesise the following components into a launch plan summary.")
            .user("""
                Product: %s
                
                Press Release:
                %s
                
                Market Research Summary:
                %s
                %s
                
                Provide a concise launch plan summary.
                """.formatted(productDescription, pressRelease, 
                             competitorResearch, marketTrends))
            .call()
            .content();
    }
}
```

---

## 5. Agent Communication Patterns

```
PATTERN 1: SEQUENTIAL (pipeline)
  Orchestrator → Agent A → result → Agent B (uses A's result) → result → Agent C...
  Use when: each step depends on the previous step's output
  Latency: sum of all agent latencies

PATTERN 2: PARALLEL (fan-out + fan-in)
  Orchestrator → [Agent A, Agent B, Agent C] simultaneously
  Orchestrator waits for all three → synthesises results
  Use when: subtasks are independent of each other
  Latency: max of individual agent latencies (fastest path)

PATTERN 3: CONDITIONAL (routing)
  Orchestrator → evaluates some criterion → routes to Agent A OR Agent B
  Use when: different specialist is appropriate for different input types
  Eg: legal question → Legal Agent; technical question → Engineering Agent

COMMUNICATION MEDIUM:
  Direct function call (simplest, same JVM)
  REST API (agent as a separate service)
  Kafka message queue (async, agents run at their own pace)
  
  Kafka is preferred for long-running tasks (research + writing)
  where synchronous waiting would time out HTTP connections.
```

---

## 6. The Pattern in Practice

### Wrong Way — Orchestrator doing the work itself

```
❌ Orchestrator has 12 tools and does everything inline:

  "Plan a product launch, research competitors, write the content,
   update the CRM, schedule the email campaign, post on LinkedIn..."
  
  Problems:
  - 12 tools → massive prompt → model gets confused about which tool first
  - Context fills with a mix of research, CRM data, and content drafts
  - A single tool error mid-workflow fails the entire task
  - Impossible to test individual components
```

```
✅ Orchestrator only coordinates:

  System prompt makes it explicit:
  "You are an orchestrator ONLY. You do not use tools directly.
   You determine which specialist to call and in what order.
   You pass results between specialists as needed.
   You are responsible for the final synthesis only."
  
  This keeps the orchestrator's reasoning task narrow and focused.
  Each specialist can be tested with unit tests.
  Failures are isolated to the responsible specialist.
```

---

## 7. Interview Questions & Model Answers

### Q1 — Architecture justification
**Interviewer:** "When would you use a multi-agent architecture over a single agent?"

**Hruday:**
> "When the task is genuinely too broad for an agent with a reasonable tool set. I apply three tests: First, are there more than 8-10 tools needed? Larger tool sets cause the model to make poor selection decisions — specialist decomposition helps. Second, can the task phases run independently? If research can run while content prep begins, parallel agents improve throughput. Third, are there different 'domains' that need different reasoning profiles? A legal review agent should be deeply conservative and citation-heavy; a creative writing agent should be flexible. Combining them in one agent means compromising both. If I answer yes to more than one of these, I'll design a multi-agent system. Before that point, a well-designed single agent with a clear max_iterations guardrail is simpler and easier to debug."

---

## 8. Scale Evolution

**Prototype →** Single orchestrator calls multiple specialised functions in sequence (not even agents); simple to debug.

**Production →** Defined specialist agents with narrow tool sets; orchestrator prompts tuned to delegate, not execute; validation on inter-agent inputs.

**High complexity →** Async multi-agent via Kafka; LangGraph for explicit state machine; agent output caching; distributed tracing across agent calls.

---

## 9. Company Relevance

| Company | Multi-agent scenario | Interview signal |
|---------|---------------------|-----------------|
| Razorpay / PhonePe | Dispute resolution: Research Agent (transaction data) + Rules Agent (eligibility check) + Communication Agent (draft resolution email) | Parallel research + rules agents; orchestrator synthesises recommendation |
| Swiggy / Meesho | Product launch planning: Research + Content + CRM + Distribution (described in examples above) | Parallel fan-out for research; sequential for content+distribution |
| Adobe / Microsoft | GitHub Copilot auto-PR workflow: Investigation Agent + Coding Agent + Review Agent + PR Creation Agent | Sequential pipeline with validation between agents; large-scale agent infrastructure |
| SAP Labs | Business process automation: Data Extract Agent (SAP queries) + Analysis Agent + Workflow Execution Agent | Audit requirement: all agent decisions logged; human approval gate before workflow execution |

---

## 10. Related Topics — What to Study Next

- **Topic 351 — What an AI Agent Is** — single-agent foundation
- **Topic 353 — ReAct Pattern** — the internal loop each specialist agent uses
- **Topic 356 — Agentic Frameworks** — LangGraph for stateful multi-agent coordination
- **Topic 358 — When Agents Go Wrong** — multi-agent adds additional failure modes

---

*Part 21 · Multi-Agent Systems — Orchestrator + Specialist Agents · Full Stack Interview Guide · Hruday D · 2026*
