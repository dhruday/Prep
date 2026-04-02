# Agent Memory Types — In-Context, External Vector Store, Episodic
> Part 21 — Generative AI for Full Stack Engineers · AI Agents
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Memory is what makes agents persistent**: without memory, every conversation starts from zero; the agent has no idea what you discussed yesterday, what decisions you made last week, or what its previous attempts at a task looked like
- **Three types to know**: in-context (everything in the current context window — fast, limited, lost on session end), external vector store (semantic search over persisted past interactions — survives sessions, scales to millions of memories), episodic (structured log of what the agent did and what happened — enables learning from past failures)
- **In-context memory fills up**: at 128K tokens, a long conversation fills the entire context; the LLM then either truncates older messages (losing early context) or errors out; for long agent runs, you must compress or summarise older turns to free space
- **External memory enables personalisation at scale**: store user preferences, past decisions, and conversation summaries in a vector DB; retrieve the 3-5 most relevant memories per query; the agent behaves as if it has known the user for months
- **Episodic memory enables agents to improve**: "The last time I ran the database migration tool, it failed because the DB was in read-only mode" — if this is stored and retrieved, the agent can avoid the same mistake next time; this is the simplest form of agent self-improvement
- **Never store PII in external memory without consent and encryption**: if you're storing conversation summaries or user preferences, treat them as PII; implement retention policies, user opt-out, and encryption at rest (covered in depth in Topics 383-384)

---

## 1. One-Line Definition
Agent memory is the mechanism by which an agent retains and retrieves information across reasoning steps (in-context), across sessions (external vector store), and across past task attempts (episodic), enabling consistent, personalised, and improving behaviour over time.

---

## 2. The Three Types Side-by-Side

| Type | Storage | Scope | Retrieval | Persists? |
|------|---------|-------|-----------|-----------|
| In-context | LLM context window | Current session | All content visible to model | No (lost on session end) |
| External vector store | Vector DB (pgvector / Pinecone) | Multi-session | Top-k semantic search | Yes |
| Episodic | Structured DB or vector store | Multi-session | Exact or semantic lookup | Yes |

---

## 3. In-Context Memory

```
WHAT IT IS:
  Everything in the current context window.
  - System prompt
  - Conversation history (all previous messages)
  - ReAct trace (Thought/Action/Observation)
  - Retrieved documents (RAG context)
  
THE LIMIT:
  GPT-4o: 128K tokens
  A 10-turn conversation with detailed tool outputs: ~8,000-15,000 tokens
  A 50-turn conversation: potentially near or at context limit
  
WHEN IT FILLS:
  Older messages are dropped (sliding window in most chat APIs).
  The model loses early context:
  → "Earlier you said you prefer formal responses" — forgotten
  → "We already established X is not true" — forgotten
  
MANAGEMENT STRATEGIES:
  
  1. Conversation summarisation:
     After N turns, replace [message 1...N] with a 200-token summary:
     "User asked about order ORD-123. Agent confirmed it was shipped.
      User then asked about return eligibility..."
     
     Code:
     if (messages.size() > MAX_TURNS_BEFORE_COMPRESS) {
         String summary = chatClient.prompt()
             .user("Summarize this conversation in 200 words: " + messages)
             .call().content();
         messages = List.of(systemMessage, new Message("assistant", summary));
     }
  
  2. Selective retention:
     Keep only the last N turns verbatim.
     Always keep the system prompt.
     Drop the middle of the conversation when compressing.
  
  3. External memory extraction (transition to vector store):
     At session end, extract key facts from the conversation and 
     store them in the external memory for future sessions.
```

---

## 4. External Vector Store Memory

```
WHAT IT IS:
  User preferences, past decisions, conversation summaries, and 
  domain facts stored in a vector database and retrieved by 
  semantic similarity at the start of each session.
  
WRITE PATH (end of session or on important events):
  Extract memory → Embed → Store in vector DB
  
  Memory examples stored:
  {
    "userId": "user_123",
    "content": "User prefers concise responses under 3 sentences. 
                Had a poor experience with long technical explanations.",
    "type": "preference",
    "createdAt": "2025-01-10"
  }
  
  {
    "userId": "user_123",
    "content": "User's main project is a payment reconciliation system 
                using Spring Boot + PostgreSQL. They own the backend team.",
    "type": "context",
    "createdAt": "2025-01-12"
  }

READ PATH (start of each session):
  1. Embed current query
  2. Retrieve top-k memories for this user, semantically related
  3. Inject into system prompt as background context

SYSTEM PROMPT INJECTION:
  "BACKGROUND CONTEXT (from previous sessions):
   [Memory 1: User prefers concise responses...]
   [Memory 2: User's project is a payment reconciliation system...]
   
   Use this context to personalise your responses."

RESULT:
  Agent behaves as if it knows the user's preferences and project 
  context from day one — even in a fresh session with no prior context.
```

### Spring AI + pgvector for External Memory

```java
@Service
public class AgentMemoryService {

    private final VectorStore vectorStore;

    // STORE a new memory for a user
    public void storeMemory(String userId, String content, String memoryType) {
        Document memory = new Document(content, 
            Map.of("userId", userId, "memoryType", memoryType, 
                   "createdAt", Instant.now().toString()));
        vectorStore.add(List.of(memory));
    }

    // RETRIEVE relevant memories for a user + current context
    public List<String> retrieveRelevantMemories(String userId, String currentContext) {
        List<Document> memories = vectorStore.similaritySearch(
            SearchRequest.query(currentContext)
                .withTopK(5)
                .withSimilarityThreshold(0.60)
                .withFilterExpression("metadata['userId'] == '" + userId + "'")
        );
        
        return memories.stream()
            .map(Document::getContent)
            .toList();
    }
    
    // BUILD the memory context block for injection into system prompt
    public String buildMemoryContext(String userId, String currentContext) {
        List<String> memories = retrieveRelevantMemories(userId, currentContext);
        if (memories.isEmpty()) return "";
        
        return "BACKGROUND CONTEXT (from previous sessions):\n" +
            String.join("\n", memories.stream()
                .map(m -> "• " + m)
                .toList());
    }
}
```

---

## 5. Episodic Memory

```
WHAT IT IS:
  Structured records of what the agent DID in past task executions —
  the inputs, the tool calls made, whether they succeeded, and the outcomes.
  
  Used to enable agents to:
  - Avoid repeating past failures
  - Recognise similar tasks and reuse successful strategies
  - Self-improve over many executions

EPISODIC MEMORY SCHEMA:
  {
    "episodeId": "ep_789",
    "userId": "user_123",
    "taskDescription": "Migrate database schema for payments table",
    "toolCalls": [
      {"tool": "run_migration", "args": {...}, "result": "SUCCESS"},
      {"tool": "verify_schema", "args": {...}, "result": "VERIFIED"}
    ],
    "outcome": "COMPLETED",
    "iterations": 3,
    "notes": "Migration to payments_v2 succeeded. 
               Prerequisite: ensure DB is not in read-only mode before running."
  }
  
RETRIEVAL:
  At task start, retrieve similar past episodes:
  "Have I done something like this before? What worked?"
  
  Vector search on taskDescription finds semantically similar past episodes.
  The agent's system prompt includes:
  "RELEVANT PAST EXPERIENCE:
   • 2025-01-10: Similar migration task. 
     Key lesson: Verify DB is in read-write mode before starting."

BENEFIT:
  The agent avoids past mistakes and converges faster on future similar tasks.
  At scale, this is how agents get "better" without fine-tuning the model.
```

---

## 6. The Pattern in Practice

### Wrong Way — Accumulating the full conversation in context indefinitely

```
❌ Problem:
  50-turn conversation about a long project.
  Context grows to 80,000 tokens.
  "Earlier you mentioned..." → LLM replies "I don't have that context."
  
  Why: early messages were dropped by the sliding window.
  The user explicitly stated a preference in turn 3.
  Turn 3 was dropped after 40 turns.
```

```
✅ At session end: extract and store important facts externally.
   At session start: inject relevant stored memories.
   Mid-session: compress old turns into a summary.
   
   The user's preferences and project context persist across sessions.
   The in-context window is kept efficient.
   "Earlier you mentioned" is answered from external memory, not context.
```

---

## 7. Interview Questions & Model Answers

### Q1 — Memory design
**Interviewer:** "How would you implement memory for an AI assistant that should remember a user's preferences and past interactions?"

**Hruday:**
> "Three layers. In-context memory for the current session — the conversation history in the context window. External vector store for cross-session memory — at session end, I extract key preferences and context from the conversation, embed them, and store in pgvector with userId metadata. At the start of each new session, I retrieve the 3-5 most semantically relevant memories given the current query and inject them into the system prompt as background context. Episodic memory for task history — if the assistant runs repeatable tasks (like scheduled reports), I store the task execution history so it can reference past successes and failures. The key design decision is memory TTL and privacy — stored memories are user-specific, encrypted, and have configurable retention periods."

---

## 8. Scale Evolution

**Prototype →** In-context only; works for sessions under 20 turns; no persistence.

**Production →** External vector store per user; conversation summarisation at 30+ turns; preference extraction at session end; retention policy enforced.

**Personalisation at scale →** Memory service as a separate microservice; memory retrieval latency < 50ms (HNSW index on userId + embedding); memory privacy compliance (user opt-out, data export API, automatic deletion on user account deletion).

---

## 9. Company Relevance

| Company | Memory use case | Interview signal |
|---------|----------------|-----------------|
| Razorpay / PhonePe | Merchant assistant that remembers merchant's industry, volume, and past support issues | External vector memory per merchant; episodic memory of past compliance support incidents |
| Swiggy / Meesho | Shopping assistant that remembers order preferences, dietary restrictions, past reviews | User preference memory; high privacy requirements for dietary/health preferences |
| Adobe / Microsoft | Copilot assistant that remembers project context, code style preferences, team conventions | Episodic memory for coding agent; SharePoint-like context persistence at Microsoft |
| SAP Labs | Joule that remembers customer's SAP configuration specifics, past work orders, team preferences | Multi-tenant memory isolation critical; no cross-customer memory leakage |

---

## 10. Related Topics — What to Study Next

- **Topic 351 — What an AI Agent Is** — memory is the fourth component of the agent's architecture
- **Topic 355 — Multi-Agent Systems** — shared memory coordination between multiple agents
- **Topic 384 — PII Handling** — stored memories often contain personal data; privacy design is mandatory

---

*Part 21 · Agent Memory Types — In-Context, External Vector Store, Episodic · Full Stack Interview Guide · Hruday D · 2026*
