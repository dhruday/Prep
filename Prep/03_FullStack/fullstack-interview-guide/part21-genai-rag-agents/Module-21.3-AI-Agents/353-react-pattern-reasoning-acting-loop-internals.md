# ReAct Pattern — Reasoning + Acting Loop Internals
> Part 21 — Generative AI for Full Stack Engineers · AI Agents
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **ReAct = Reason + Act**: the model alternates between "Thought" (reasoning about what to do next) and "Action" (calling a tool or producing a final answer); after each Action, the model observes the result and produces the next Thought; this alternation is what makes agents more capable than a single LLM call
- **ReAct improves accuracy over chain-of-thought alone**: CoT reasons without acting (the model still hallucinates facts it doesn't know); ReAct grounds reasoning in real-world tool output — the model's "facts" come from actual API calls, not training data
- **The scratchpad**: in the original ReAct paper, the model's Thought→Action→Observation traces form a "scratchpad" that is kept in context for subsequent reasoning; the scratchpad is essentially the agent's working memory for the current task
- **ReAct naturally handles errors**: if a tool returns an error, it becomes an Observation; the model reads it and either retries (different arguments), uses a different tool, or concludes the task is not completable; this graceful error handling is a key production advantage
- **How to read a ReAct trace in debugging**: Thought lines tell you what the model was trying to do; Action lines tell you what it called; Observation lines contain actual API results; if the answer is wrong, check which Observation contained bad data or which Thought had faulty reasoning
- **Keeping the trace in context is expensive**: every Thought + Action + Observation adds tokens to the context window; a 10-step ReAct trace might consume 3,000-5,000 tokens before the final answer; at GPT-4o pricing this is noticeable at scale; summarise completed steps when the trace grows long

---

## 1. One-Line Definition
ReAct (Reasoning + Acting) is the pattern where an LLM alternates between generating a reasoning trace (Thought) and invoking an external tool (Action), using each tool's output (Observation) as input to the next reasoning step, until the task goal is achieved.

---

## 2. The Paper and the Insight

```
YAO ET AL., 2022 ("ReAct: Synergizing Reasoning and Acting in Language Models")

KEY FINDING:
  Models that only reason (CoT) hallucinate facts.
  Models that only act (tool calls with no reasoning) 
    make uninformed decisions about which tool to use.
  
  Combining Thought + Action:
  - Reasoning improves action selection
  - Action output grounds reasoning in real data
  - The combination outperforms either alone on multi-step tasks

WHY IT MATTERS FOR ENGINEERS:
  When you build an agent, you're implementing the ReAct pattern.
  Understanding the Thought→Action→Observation loop explains:
  - Why agent traces look the way they do
  - Why max_iterations prevents runaway loops
  - How to debug a failing agent (inspect the Thought trace)
  - Why the scratchpad grows and what to do when it fills context
```

---

## 3. Full ReAct Trace Example

```
TASK: "Book a meeting with Priya on the first available 30-minute 
       slot on January 15th between 10am and 4pm"

─────────────────────────────────────────────────────────────────────────
ITERATION 1

Thought: I need to find Priya's available slots on January 15th.
         I'll check her calendar from 10am to 4pm.

Action: check_calendar_availability
Arguments: {
  "userEmail": "priya@company.com",
  "date": "2025-01-15",
  "startTime": "10:00",
  "endTime": "16:00"
}

Observation: {
  "availableSlots": ["10:00-11:00", "13:30-15:00"],
  "busySlots": ["11:00-13:30", "15:00-16:00"]
}

─────────────────────────────────────────────────────────────────────────
ITERATION 2

Thought: Priya is available from 10:00-11:00 (first slot).
         That's more than 30 minutes. I'll book the 10:00-10:30 slot.
         Now I'll create the calendar event.

Action: create_calendar_event
Arguments: {
  "attendees": ["priya@company.com", "hruday@company.com"],
  "title": "Meeting",
  "date": "2025-01-15",
  "startTime": "10:00",
  "durationMinutes": 30
}

Observation: {
  "status": "CREATED",
  "eventId": "evt_89xyz",
  "confirmationUrl": "https://calendar.company.com/evt_89xyz"
}

─────────────────────────────────────────────────────────────────────────
ITERATION 3

Thought: The meeting has been created successfully.
         Event ID is evt_89xyz. I have enough information for a complete answer.
         No more tools needed.

Final Answer: "I've booked a 30-minute meeting with Priya on January 15th 
              from 10:00am to 10:30am. Event confirmation: 
              https://calendar.company.com/evt_89xyz"

─────────────────────────────────────────────────────────────────────────
COMPLETE ✅ — 3 iterations, 2 tool calls, 1 naturally stated final answer
```

---

## 4. ReAct with Error Recovery

```
─────────────────────────────────────────────────────────────────────────
ITERATION 1

Thought: I need to get the order status for ORD-12X.

Action: get_order_status
Arguments: {"orderId": "ORD-12X"}

Observation: {"error": "ORDER_NOT_FOUND", 
              "message": "No order found with ID ORD-12X"}

─────────────────────────────────────────────────────────────────────────
ITERATION 2

Thought: The order ID ORD-12X was not found. 
         This might be a typo — "12X" looks unusual for an order ID.
         I should ask the user to confirm the order ID rather than 
         guessing or calling more tools.

Final Answer: "I couldn't find an order with ID ORD-12X. 
              Order IDs are usually all digits (eg. ORD-128).
              Could you double-check the order number from your 
              confirmation email?"

─────────────────────────────────────────────────────────────────────────
The ReAct loop handled an API error gracefully:
  - Iteration 1: made a reasonable first attempt
  - Observation: received a clear error
  - Iteration 2: reasoned about the error → chose to ask the user rather 
    than blindly retry or make up an answer
  - Did not loop indefinitely on the error
```

---

## 5. Implementation: Prompting the Model for ReAct Format

```
SYSTEM PROMPT (enables ReAct trace format):

"You have access to the following tools:
 [tool descriptions]
 
 To complete the user's request, follow this format:
 
 Thought: [Reason about the current situation and what to do next]
 Action: [tool_name]
 Action Input: [JSON arguments for the tool]
 
 After receiving a tool result:
 
 Observation: [Result from the tool — DO NOT generate this yourself; 
               it will be provided to you]
 
 Continue Thought → Action cycles until you can provide a final answer.
 When you have enough information, write:
 
 Final Answer: [Your response to the user]
 
 Rules:
 - Maximum 8 reasoning cycles
 - If a tool fails twice, explain the failure to the user and stop
 - Never generate an Observation yourself — only write Thought and Action"
```

---

## 6. ReAct vs Direct Tool Call (No Reasoning)

```
DIRECT TOOL CALL (no thought trace):
  User: "What's the stock price of INFY today?"
  → Model immediately calls get_stock_price(ticker="INFY")
  → Returns result
  
  ✅ Fine for simple, single-tool tasks
  ❌ Poor for multi-step tasks where tool selection depends on prior observations

REACT (with thought trace):
  User: "Should I buy INFY today based on its moving average?"
  
  Thought: I need both current price and 50-day moving average to advise.
  Action: get_stock_price(ticker="INFY")
  Observation: {"price": 1847, "change": -0.8%}
  
  Thought: Current price is 1847. Now I need the 50-day moving average.
  Action: get_moving_average(ticker="INFY", days=50)
  Observation: {"ma50": 1920}
  
  Thought: Price (1847) is below 50-day MA (1920). 
            This is a bearish signal. I have enough to answer.
  Final Answer: "INFY is trading at ₹1,847, which is 3.8% below its 
                 50-day moving average of ₹1,920 — a bearish signal in 
                 technical analysis. This is data only; please consult 
                 a financial advisor before making investment decisions."
  
  ✅ Multi-step; the Thought guided which tool to call next and why
```

---

## 7. Debugging a ReAct Agent

```
DEBUGGING GUIDE:

1. If the Final Answer is WRONG:
   → Read the Observations: did the tool return correct data?
   → Read the Thoughts: did the model reason correctly about the data?
   → Wrong answer = either bad tool output OR bad reasoning once tool output is correct

2. If the agent LOOPS without finishing:
   → Check if any tool is returning an output the model interprets as "keep going"
   → Add explicit stop conditions in the system prompt
   → Ensure max_iterations is set
   
3. If the agent HALLUCINATES:
   → Check if the model generated an Observation (instead of waiting for the tool)
   → System prompt must say "Only the system provides Observations"
   
4. If the agent calls WRONG TOOLS:
   → Tool descriptions are likely ambiguous
   → Improve the "Use when:" and "Do NOT use for:" clauses in tool descriptions
```

---

## 8. Interview Questions & Model Answers

### Q1 — ReAct explanation
**Interviewer:** "How does the ReAct pattern work and why is it better than just using chain-of-thought?"

**Hruday:**
> "ReAct alternates between reasoning (Thought) and action (calling a tool), using each tool's real-world output to ground the next reasoning step. Chain-of-thought alone has the model reason through a problem using only its training knowledge — which means it can reason correctly about things it knows but hallucinate about things it doesn't. ReAct patches this by making the model act on real data: when it needs a fact, it calls a tool; the tool returns ground truth; the model reasons from that. The combination is more accurate on multi-step factual tasks than either CoT or direct tool calls alone. The practical implication: in any agent I build, I include explicit Thought formatting in the system prompt and log the full ReAct trace per request for debugging."

---

## 9. Scale Evolution

**Prototype →** ReAct trace via system prompt instructions; log the full trace to console; test with simple 2-3 step tasks.

**Production →** Parse and persist Thought/Action/Observation traces per request ID; max_iterations enforced; structured trace format in logs for debugging.

**High scale →** Trace stored in separate audit table (not just logs); trace sampling for high-volume (log 100% when error, 5% otherwise); trace → metrics pipeline (average iterations per task, tool error rates).

---

## 10. Company Relevance

| Company | ReAct use case | Interview signal |
|---------|---------------|-----------------|
| Razorpay / PhonePe | ReAct agent for dispute resolution: reason about transaction data + call multiple status APIs | Audit log of full ReAct trace for regulatory compliance |
| Swiggy / Meesho | Delivery exception agent: reason about order delay + call carrier API + decide whether to proactively notify | Error recovery in ReAct loop for unreliable carrier APIs |
| Adobe / Microsoft | Code review agent: reason about PR → read file → run test → reason about output → suggest fix | Multi-step technical ReAct with dev tool integrations |
| SAP Labs | Joule workflow agent: reason about user intent → query SAP data → trigger SAP workflow → confirm result | ReAct trace as audit evidence for SAP workflow execution |

---

## 11. Related Topics — What to Study Next

- **Topic 352 — Tool Use and Function Calling** — the Action step in ReAct
- **Topic 354 — Agent Memory Types** — the scratchpad is one form of memory
- **Topic 358 — When Agents Go Wrong** — loop failures, hallucinated observations, and guardrails

---

*Part 21 · ReAct Pattern — Reasoning + Acting Loop Internals · Full Stack Interview Guide · Hruday D · 2026*
