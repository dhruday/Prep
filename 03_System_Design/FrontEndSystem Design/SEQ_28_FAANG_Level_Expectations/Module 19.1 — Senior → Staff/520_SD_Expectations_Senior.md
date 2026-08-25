# 520. System Design Expectations — Senior Engineer (L5/E5/SDE-3)

────────────────────────────────────
## 1. What "Senior" Means in System Design
────────────────────────────────────

At Google L5, Meta E5, Amazon SDE-3, Microsoft L63, the system design interview evaluates whether you can **own the end-to-end architecture** of a product feature. You are NOT expected to design infrastructure from scratch — you ARE expected to compose existing systems (CDN, load balancer, database, cache) into a coherent architecture with clear trade-offs.

**The senior bar**: You can take an ambiguous product requirement, break it into technical components, make defensible trade-off decisions, and explain why alternatives were rejected.

────────────────────────────────────
## 2. Rubric — What Interviewers Score
────────────────────────────────────

| Dimension                  | Junior (Fails)                     | Senior (Passes)                                  | Staff (Exceeds)                                      |
|----------------------------|-------------------------------------|--------------------------------------------------|------------------------------------------------------|
| **Requirements**           | Takes problem at face value         | Asks 5-10 clarifying questions, defines scope    | Identifies hidden requirements, defines non-goals     |
| **API Design**             | No API discussion                   | RESTful endpoints with schemas                   | API versioning, pagination, rate limiting             |
| **Data Model**             | Vague "we'll store it in a DB"      | Tables/collections with relationships            | Sharding strategy, partition key selection             |
| **Component Design**       | Monolithic blob                     | 4-6 services with clear responsibilities         | Service boundaries aligned with team boundaries       |
| **Scalability**            | "We'll add more servers"            | Horizontal scaling with specific bottlenecks     | Capacity estimation, back-of-envelope math            |
| **Trade-offs**             | "Use Redis because it's fast"       | "Redis for reads <10ms but adds cache invalidation complexity" | "Here's when I'd choose Redis vs Memcached vs DynamoDB DAX" |
| **Deep Dive**              | Surface-level for all components    | Deep on 1-2 critical paths                       | Deep on 2-3 AND anticipates interviewer follow-ups    |
| **Communication**          | Codes silently                      | Structured walkthrough, checks in with interviewer | Drives the conversation, adjusts detail level         |

────────────────────────────────────
## 3. The Senior SD Framework (45-Minute Round)
────────────────────────────────────

### Phase 1: Requirements (5 min)

**Functional Requirements:**
- "What are the core user actions?" (e.g., post, like, comment, share)
- "What's the read/write ratio?" (read-heavy → caching; write-heavy → queue + async)
- "Real-time or eventual consistency?"

**Non-Functional Requirements (NFRs):**
- Latency: "What's the acceptable P99 latency?" (Usually <200ms for reads)
- Availability: "Is this 99.9% or 99.99%?" (Determines replication strategy)
- Scale: "How many DAU? QPS?"
- Consistency: "Strong or eventual?"

**Must-Ask at Senior Level:**
- "Who are the consumers of this API — web, mobile, third-party?"
- "What's the data retention policy?"
- "Any compliance requirements (GDPR, HIPAA)?"

---

### Phase 2: High-Level Design (10 min)

Draw the system as **5-7 boxes** with clear data flow:

```
┌──────────┐    ┌──────────┐    ┌──────────────┐
│  Client   │───▶│   CDN    │───▶│  API Gateway │
│ (Web/App) │    │(CloudFront)│   │ (Rate Limit) │
└──────────┘    └──────────┘    └──────┬───────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                   │
              ┌─────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
              │  Service A │    │  Service B  │    │  Service C  │
              │  (Reads)   │    │  (Writes)   │    │  (Async)    │
              └─────┬─────┘    └──────┬──────┘    └──────┬──────┘
                    │                  │                   │
              ┌─────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
              │   Cache    │    │  Database   │    │   Queue     │
              │  (Redis)   │    │ (Postgres)  │    │  (SQS/Kafka)│
              └───────────┘    └─────────────┘    └─────────────┘
```

**Senior-level signals:**
- CQRS pattern (separate read/write services) when read/write ratio > 10:1
- Message queue for async operations (notifications, analytics)
- CDN for static assets
- API Gateway for rate limiting, auth

---

### Phase 3: Deep Dive (20 min)

Pick the **2 most critical components** and go deep. The interviewer will often guide you.

**For each deep dive, cover:**
1. Data model (tables, indexes, partition keys)
2. API contract (request/response schemas)
3. Failure modes (what happens when this component fails?)
4. Scaling bottleneck (what breaks at 10x traffic?)
5. Trade-off (why this approach vs. alternatives?)

**Example deep dives by system type:**

| System Type     | Likely Deep Dive 1              | Likely Deep Dive 2              |
|-----------------|----------------------------------|---------------------------------|
| Social Feed     | Feed generation (fan-out)       | Ranking algorithm               |
| Chat System     | Message delivery (WebSocket)    | Offline/online status           |
| URL Shortener   | Key generation (collision)      | Analytics at scale              |
| File Storage    | Chunking + deduplication        | Metadata service                |
| Search          | Inverted index                  | Ranking + relevance             |

---

### Phase 4: Wrap-Up (5 min)

- Summarize the architecture in one sentence
- List 2-3 things you'd improve with more time
- Mention monitoring/observability: "I'd add distributed tracing (Jaeger), metrics (Prometheus + Grafana), and alerting on P99 latency"

────────────────────────────────────
## 4. Back-of-Envelope Math (Expected at Senior)
────────────────────────────────────

**You MUST be able to estimate:**

| Metric              | Formula                                          | Example (Twitter-scale)        |
|---------------------|--------------------------------------------------|--------------------------------|
| QPS (reads)         | DAU × actions/day ÷ 86400                        | 200M × 10 ÷ 86400 ≈ 23K QPS  |
| QPS (writes)        | DAU × writes/day ÷ 86400                         | 200M × 0.5 ÷ 86400 ≈ 1.2K QPS|
| Storage/year        | writes/day × avg_size × 365                      | 100M × 1KB × 365 ≈ 36.5 TB   |
| Bandwidth           | peak_QPS × avg_response_size                     | 50K × 10KB ≈ 500 MB/s         |
| Cache size          | hot_data × avg_size                              | 20% of 36.5TB ≈ 7.3TB         |

**Quick reference — sizes:**
- 1 character = 1 byte (ASCII) / 2 bytes (UTF-16)
- 1 tweet = ~1 KB, 1 image = ~200 KB, 1 video minute = ~50 MB
- 1 million seconds ≈ 12 days, 1 billion seconds ≈ 32 years

────────────────────────────────────
## 5. Common Senior-Level Mistakes
────────────────────────────────────

| Mistake                                  | Why It Hurts                                | Fix                                          |
|------------------------------------------|---------------------------------------------|----------------------------------------------|
| Jumping to database before requirements  | Shows solution-first thinking               | Always start with functional + NFR           |
| Choosing tech without justification      | "Use Kafka" — but why not SQS?             | Compare 2 options, pick with reasoning        |
| No numbers                               | Can't validate if design works at scale     | Do back-of-envelope for QPS + storage         |
| All breadth, no depth                    | Looks like GPT-generated answer             | Pick 2 components, go 3 levels deep           |
| Ignoring failure modes                   | Production systems fail constantly          | "What if Redis goes down?" → fallback to DB   |
| Not mentioning monitoring                | Senior engineers think about operability     | Add observability in wrap-up                  |

────────────────────────────────────
## 6. Company-Specific Expectations
────────────────────────────────────

### Google (L5)
- Expects strong **API design** (proto-style definitions)
- Values **consistency vs. availability** trade-off discussion
- Will ask about **sharding** and **replication**
- Prefers **whiteboard-style** (draw and explain, less code)

### Meta (E5)
- Heavy emphasis on **scale** (billions of users)
- Expects **fan-out on write vs. fan-out on read** discussion for feeds
- Values **real-time** systems (WebSocket, SSE)
- Will deep-dive on **caching strategy**

### Amazon (SDE-3)
- Strong emphasis on **operational excellence** (how do you monitor this?)
- Will ask about **DynamoDB** patterns (partition key selection)
- Values **async processing** (SQS + Lambda)
- Leadership Principles infused: "How would this design earn trust with customers?"

### Microsoft (L63)
- Balanced approach: design + some pseudocode
- Values **extensibility** (how would you add feature X later?)
- Will discuss **Azure services** — map to generic equivalents if unsure
- Focus on **user-facing latency**

────────────────────────────────────
## 7. Memory Aid
────────────────────────────────────

**"Senior SD = RNDD" (Requirements → NFRs → Design → Deep-dive)**

**If you go blank:** "Start with functional requirements, then non-functional (latency, availability, scale, consistency). Draw 5-7 boxes. Deep dive on 2 components. Do back-of-envelope math. Mention monitoring."
