# When Agents Go Wrong — Loops, Hallucinated Tool Calls, Guardrails
> Part 21 — Generative AI for Full Stack Engineers · AI Agents
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Four failures that kill agents in production**: (1) infinite loops — no `maxIterations` guard, agent retries forever, cost spirals; (2) hallucinated tool names — model invents a function that doesn't exist; (3) hallucinated arguments — correct tool, wrong/unexpected/malicious args; (4) confident wrong reasoning — agent reaches a decision with flawed logic and no human sanity check
- **Infinite loop fix**: always set `maxIterations(5-10)`; add loop detection (same tool + same args called twice → break and return partial result to user); set hard timeout at the request level; monitor for iteration counts > 3 via Micrometer
- **Hallucinated tool calls**: Spring AI throws `ToolNotFoundException` at call time; catch it, log the attempted tool name, return a structured error response; never let the exception propagate unhandled to the user
- **Argument validation is mandatory**: the LLM produces tool arguments — treat them as untrusted user input; validate before every DB query, API call, or file operation; parameterised queries for SQL; never concatenate LLM output into a command
- **Human-in-the-loop for irreversible actions**: refund, delete, deploy, send email — require explicit confirmation before execution; add a `confirmAction(actionId)` tool that unlocks the irreversible call; log every approval
- **Output validation before returning to user**: check response doesn't contain hallucinated order numbers, PII from context window, or model-name leakage; apply output guardrails before the response reaches the API layer

---

## 1. One-Line Definition
Agent guardrails are the defensive controls — iteration limits, argument validation, loop detection, human checkpoints, and output filtering — that prevent agent failures from turning into runaway costs, data corruption, or security incidents in production.

---

## 2. Failure Mode Map

```
AGENT FAILURE MODES
│
├── LOOP FAILURES
│   ├── Infinite retry loop (no maxIterations)
│   ├── Circular dependency loop (AgentA calls AgentB calls AgentA)
│   └── No-progress loop (correct tool, wrong args, same error every turn)
│
├── HALLUCINATION FAILURES
│   ├── Hallucinated tool name (invents function that doesn't exist)
│   ├── Hallucinated tool arguments (correct name, fabricated values)
│   └── Hallucinated observations (model reasons from invented tool outputs)
│
├── SECURITY FAILURES
│   ├── Prompt injection via tool output (malicious data poisons agent reasoning)
│   ├── Privilege escalation (agent calls admin tool outside its scope)
│   └── PII leakage in tool call arguments
│
└── REASONING FAILURES
    ├── Confident wrong decision (high confidence, wrong logic)
    ├── Irreversible action without confirmation (sends email, deletes record)
    └── Context window overflow (forgetting earlier observations)
```

---

## 3. Detailed Failure Scenarios

### Scenario 1 — Infinite Loop

The model calls `searchOrders("ORD-123")`, gets "Order not found", then calls `searchOrders("ORD-123")` again in the next iteration because it didn't update its internal state. Without a hard iteration limit, this runs until the API rate limit is hit and you receive a $500 AWS bill.

### Scenario 2 — Hallucinated Tool Name

Model was told about tool `getCustomerProfile`. In iteration 3, under cognitive pressure to resolve a user query, it calls `getCustomerFullProfile` — a name it invented. Spring AI raises `ToolNotFoundException`. If unhandled, the entire agent request fails with a 500 error.

### Scenario 3 — Argument Injection

User message: "Find orders for: ORD-999'; DROP TABLE orders;--"  
The model, without sanitisation, passes this directly to a `findOrder(orderId)` tool. If the tool concatenates the argument into raw SQL, this is a classic SQL injection attack. The LLM cannot be trusted to sanitise its own arguments.

### Scenario 4 — Irreversible Unconfirmed Action

An agent is given tools including `processRefund(orderId, amount)`. The user asks "can you refund my last order?". The agent reasons: orderId=ORD-456, amount=2999.00, and calls `processRefund` directly. But the user might have been asking hypothetically, or the agent got the order wrong. Without a confirmation step, the refund fires.

---

## 4. Guardrail Patterns

### Wrong Way — Agent with No Guards

```java
// ❌ No iteration limit, no argument validation, no loop detection
public String runAgent(String userMessage) {
    return chatClient.prompt()
        .user(userMessage)
        .tools(orderTools, paymentTools)
        // No maxIterations — model can loop forever
        // No argument validation in tools — SQL injection possible
        // No approved-action check — refund fires without confirmation
        .call()
        .content();
}
```

```java
// ❌ Tool with no argument validation
@Tool(description = "Find order by ID")
public Order findOrder(@ToolParam(description = "Order ID") String orderId) {
    // Direct concatenation — SQL injection attack vector
    String sql = "SELECT * FROM orders WHERE id = '" + orderId + "'";
    return jdbcTemplate.queryForObject(sql, orderRowMapper);
}
```

### Right Way — Agent with Full Guardrails

```java
// ✅ Agent entrypoint with all safety controls
@Service
public class SafeOrderAssistant {

    private final ChatClient chatClient;
    private final OrderTools orderTools;
    private final AgentGuardrailService guardrails;

    public AgentResponse assist(String userId, String userMessage) {
        // GUARDRAIL 1: Input validation before entering agent
        guardrails.validateInput(userMessage);
        
        try {
            String rawResponse = chatClient.prompt()
                .system(buildSystemPrompt())
                .user(userMessage)
                .tools(orderTools)
                .maxIterations(6)       // GUARDRAIL 2: Hard iteration limit
                .call()
                .content();
            
            // GUARDRAIL 3: Output validation before returning
            return guardrails.validateAndWrap(rawResponse);
            
        } catch (ToolNotFoundException e) {
            // GUARDRAIL 4: Hallucinated tool name
            log.warn("Agent attempted unknown tool: {}", e.getToolName());
            return AgentResponse.toolError("I couldn't complete that request.");
            
        } catch (MaxIterationsExceededException e) {
            // GUARDRAIL 5: Loop guard triggered
            log.warn("Agent exceeded max iterations for userId={}", userId);
            return AgentResponse.partial("I couldn't fully resolve this. Please contact support.");
        }
    }
}

// ✅ Tool with parameterised query (no injection possible)
@Tool(description = "Find order by ID. Returns order details or null if not found.")
public OrderSummary findOrder(@ToolParam(description = "Order ID in format ORD-NNNNNN") String orderId) {
    // Validate format before hitting DB
    if (!orderId.matches("ORD-\\d{6}")) {
        return null; // Structured null — tool returns, agent decides next step
    }
    // Parameterised — SQL injection not possible
    return orderRepository.findById(orderId).map(this::toSummary).orElse(null);
}

// ✅ Irreversible action with confirmation gate
@Component
public class RefundTools {

    private final PendingActionStore pendingActions;
    
    @Tool(description = """
        Request a refund for an order.
        This STAGES the refund for confirmation — it does NOT execute immediately.
        Returns an actionId that the user must confirm before the refund is processed.
        """)
    public RefundRequest stageRefund(
        @ToolParam(description = "Order ID to refund") String orderId,
        @ToolParam(description = "Amount in INR to refund") double amount
    ) {
        // Validate + stage, NOT execute
        String actionId = UUID.randomUUID().toString();
        pendingActions.stage(actionId, new PendingRefund(orderId, amount));
        return new RefundRequest(actionId, orderId, amount, "AWAITING_CONFIRMATION");
    }
    
    @Tool(description = "Confirm a staged action by its actionId. User must explicitly approve.")
    public String confirmAction(@ToolParam(description = "Action ID to confirm") String actionId) {
        PendingRefund pending = pendingActions.get(actionId);
        if (pending == null) return "Action not found or already completed.";
        
        paymentService.processRefund(pending.orderId(), pending.amount());
        pendingActions.remove(actionId);
        log.info("Refund confirmed: orderId={} amount={}", pending.orderId(), pending.amount());
        return "Refund of ₹" + pending.amount() + " processed for order " + pending.orderId();
    }
}
```

---

## 5. Loop Detection

```java
// Detect repeated tool calls with identical arguments
@Component
public class LoopDetector {

    // Per-request call history: toolName + argsHash → call count
    public boolean isLoop(String toolName, String argsJson, Map<String, Integer> callHistory) {
        String key = toolName + ":" + argsJson.hashCode();
        int count = callHistory.merge(key, 1, Integer::sum);
        return count >= 2; // Same tool + same args twice = loop
    }
}
```

---

## 6. Prompt Injection Defence

```java
// Never place untrusted data directly in the system prompt 
// where it can modify agent behaviour

// ❌ Injection risk — tool output placed in system prompt
String systemPrompt = "You are an assistant. Context: " + untrustedToolOutput;

// ✅ Tool outputs always go in the conversation history as TOOL messages
// Spring AI does this correctly by default — tool results are
// MessageType.TOOL entries, structurally separate from the system prompt

// Add a validation step on tool output before it enters the agent context
public String sanitiseToolOutput(String rawOutput) {
    // Strip potential injection phrases
    return rawOutput
        .replaceAll("(?i)ignore (all )?previous instructions?.*", "[FILTERED]")
        .replaceAll("(?i)system:\\s*", "[FILTERED]:");
}
```

---

## 7. Observability for Agent Failures

```java
@Component
public class AgentMetrics {

    private final MeterRegistry meterRegistry;
    
    public void recordIteration(String agentName, int iterationCount) {
        meterRegistry.summary("agent.iterations", "agent", agentName)
            .record(iterationCount);
        
        if (iterationCount > 4) {
            Counter.builder("agent.high_iterations")
                .tag("agent", agentName)
                .register(meterRegistry)
                .increment();
        }
    }
    
    public void recordToolCallFailure(String agentName, String toolName, String reason) {
        Counter.builder("agent.tool_failure")
            .tag("agent", agentName)
            .tag("tool", toolName)
            .tag("reason", reason)         // hallucinated, validation_failed, timeout
            .register(meterRegistry)
            .increment();
    }
}
```

---

## 8. Scale Evolution

**Prototype →** `maxIterations(5)` set on every `chatClient.call()`; parameterised queries in all tools; log every tool call.

**Production →** Separate `AgentGuardrailService` for input + output validation; loop detector per-request; ToolNotFoundException caught globally; Micrometer counters on iteration counts and tool failures.

**High scale →** Rate limit per userId for agent requests (agents are 5-10× more expensive than single LLM calls); circuit breaker around the entire agent execution; human-in-the-loop queue (Redis + websocket notification) for irreversible actions; agent audit log (request, tools called, arguments, outputs) persisted to audit table for security review.

---

## 9. Company Relevance

| Company | How this applies | Interview signal |
|---------|-----------------|-----------------|
| Razorpay / PhonePe | Agents that touch payment or refund APIs — irreversible action confirmation is critical | Describe human-in-the-loop confirmation gate for financial agents |
| Swiggy / Meesho | Order cancellation, delivery reassignment — SQL injection via tool args is real | Parameterised queries, input validation before every tool DB call |
| Adobe / Microsoft | Enterprise agents with broad tool access — privilege + injection risks are top of mind | Principle of least privilege for agent tool access; output filtering |
| SAP Labs | Finance document agents — hallucinated amounts, wrong GL codes would be critical failures | Structured output validation with confidence thresholds; audit logging every tool call |

---

## 10. Interview Questions & Model Answers

### Q1 — How do you prevent an agent from running forever?
**Hruday:**
> "First line of defence is `maxIterations` — I always set it, never let it default to unlimited. I also add a loop detector: if the same tool is called twice with identical arguments, the agent is stuck and the loop detector breaks execution and returns a partial answer with an explanation. At the request level, I set a hard timeout via a virtual thread with a deadline. For observability, I send iteration counts to Micrometer; an alert fires if p95 iterations > 4, which gives advance warning before a pathological case hits the rate limit."

### Q2 — How do you defend against prompt injection via tool outputs?
**Hruday:**
> "The key structural defence is that Spring AI places tool results in `MessageType.TOOL` messages, not the system prompt. They can't override the system instructions by design. Additionally, I sanitise tool outputs before they re-enter the agent loop — strip common injection phrases like 'ignore previous instructions'. For high-risk tools like web scrapers or user-generated content readers, I apply output length limits and run the output through a content-safety check before it's fed back to the LLM."

---

*Part 21 · When Agents Go Wrong — Loops, Hallucinated Tool Calls, Guardrails · Full Stack Interview Guide · Hruday D · 2026*
