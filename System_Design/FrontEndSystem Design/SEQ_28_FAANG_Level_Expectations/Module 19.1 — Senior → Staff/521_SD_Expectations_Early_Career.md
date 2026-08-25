# 521. System Design Expectations — Early Career (L3-L4 / E3-E4 / SDE-1/2)

────────────────────────────────────
## 1. What "Early Career" Means in System Design
────────────────────────────────────

At Google L3-L4, Meta E3-E4, Amazon SDE-1/2, Microsoft L59-L61, the system design round (when given) focuses on whether you can **reason about components and trade-offs** at a basic level. You are NOT expected to design distributed systems from scratch. You ARE expected to demonstrate structured thinking and awareness of basic building blocks.

**Key difference from Senior:** At early career, interviewers evaluate your POTENTIAL to grow into system design. Structured thinking + correct fundamentals > perfect architecture.

**When you get SD rounds (early career):**
- Google: L4 gets a "system design lite" or "Googleyness + Leadership"
- Meta: E4 gets a full SD round
- Amazon: SDE-2 gets a full SD round
- Microsoft: L61+ gets SD round

────────────────────────────────────
## 2. Rubric — What Interviewers Expect
────────────────────────────────────

| Dimension                  | Fails                              | Passes (Early Career)                             |
|----------------------------|-------------------------------------|--------------------------------------------------|
| **Requirements**           | Starts coding immediately           | Asks 3-5 clarifying questions                    |
| **API Design**             | No API discussion                   | Basic REST endpoints (GET, POST)                 |
| **Data Model**             | "Store in database"                 | Names tables and key columns                     |
| **Architecture**           | Monolith with no reasoning          | Client → Server → DB with caching awareness      |
| **Scalability**            | No mention                          | Knows WHERE bottlenecks occur (not HOW to fix all)|
| **Trade-offs**             | None articulated                    | 1-2 trade-offs articulated per decision          |
| **Communication**          | Silent coding                       | Structured walkthrough, asks for feedback         |

────────────────────────────────────
## 3. The Early Career SD Framework (35-45 min)
────────────────────────────────────

### Step 1: Clarify (3-5 min)

Ask these EVERY time:
- "What are the core features?" (Prioritize 2-3)
- "How many users?" (Thousands vs. millions changes everything)
- "Read-heavy or write-heavy?"
- "Real-time needed?"

**Don't ask:** Overly specific questions about infrastructure choices — that's senior territory.

---

### Step 2: High-Level Design (10 min)

Draw 3-5 boxes:

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client   │────▶│  Server  │────▶│ Database │
│ (Browser) │     │ (API)    │     │ (SQL/    │
│           │◀────│          │◀────│  NoSQL)  │
└──────────┘     └──────────┘     └──────────┘
                       │
                 ┌─────▼─────┐
                 │   Cache   │
                 │  (Redis)  │
                 └───────────┘
```

**What you MUST know:**
- When to add a cache (read-heavy, data doesn't change often)
- When to add a load balancer (multiple server instances)
- SQL vs. NoSQL (structured relationships → SQL; flexible schema, massive scale → NoSQL)
- When to add a queue (async tasks: emails, notifications, video processing)

---

### Step 3: API Design (5 min)

Write 3-5 REST endpoints:

```
GET  /api/posts?page=1&limit=20     → List posts
POST /api/posts                      → Create post
GET  /api/posts/:id                  → Get single post
PUT  /api/posts/:id                  → Update post
DELETE /api/posts/:id                → Delete post
```

**Early career must-knows:**
- HTTP methods (GET, POST, PUT, DELETE)
- Status codes (200, 201, 400, 401, 404, 500)
- Pagination (offset-based is fine at this level)

---

### Step 4: Data Model (5 min)

Define 2-3 tables with relationships:

```
Users Table:
- id (PK)
- name
- email (unique)
- created_at

Posts Table:
- id (PK)
- user_id (FK → Users)
- content
- created_at

Comments Table:
- id (PK)
- post_id (FK → Posts)
- user_id (FK → Users)
- text
- created_at
```

**Know the difference between:**
- Primary key vs. foreign key
- One-to-many vs. many-to-many
- Index (speeds up reads, slows writes)

---

### Step 5: Discuss Scale + Trade-offs (5-10 min)

You're expected to IDENTIFY problems, not necessarily solve all of them:

| Problem                      | Awareness (Expected)                          | Solution (Bonus)                    |
|------------------------------|-----------------------------------------------|--------------------------------------|
| DB is slow under load        | "Database will be a bottleneck"               | Add caching, read replicas          |
| Single server fails          | "Single point of failure"                     | Load balancer + multiple servers    |
| Storing files/images         | "Don't store in database"                     | Use S3/blob storage + CDN          |
| User notifications           | "Shouldn't block the API response"            | Background job with a queue        |

---

### Step 6: Wrap-Up (2 min)

- Summarize what you built in 2 sentences
- List 1-2 improvements: "With more time, I'd add caching and a CDN for images"

────────────────────────────────────
## 4. Must-Know Building Blocks (Minimum Knowledge)
────────────────────────────────────

| Component       | What It Does                           | When to Use                              |
|----------------|----------------------------------------|------------------------------------------|
| Load Balancer  | Distributes traffic across servers     | Multiple server instances                |
| Cache (Redis)  | Stores frequently accessed data in RAM | Read-heavy data, reduce DB load          |
| CDN            | Serves static files from edge servers  | Images, JS, CSS, video                   |
| Message Queue  | Async task processing                  | Emails, notifications, video encoding    |
| SQL Database   | Structured data with relationships     | Users, orders, transactions              |
| NoSQL Database | Flexible schema, horizontal scaling    | Logs, analytics, real-time feeds         |
| Blob Storage   | Large file storage (S3)                | Images, videos, documents                |

────────────────────────────────────
## 5. Common Early Career Mistakes
────────────────────────────────────

| Mistake                              | Fix                                              |
|--------------------------------------|--------------------------------------------------|
| No structure — jumps to random topics | Follow the 6-step framework above                |
| "I'd use microservices"              | At early career, monolith is fine. Don't over-architect |
| Can't explain WHY for any decision   | For every choice, say: "I chose X because..."    |
| Ignores caching entirely             | Always mention: "This is read-heavy, so I'd add a cache" |
| Draws 15 boxes                       | Keep it simple: 3-5 boxes max                    |
| Doesn't ask about scale              | You MUST ask: "How many users/requests?"         |

────────────────────────────────────
## 6. Memory Aid
────────────────────────────────────

**"Early Career SD = CARDS":**
- **C**larify requirements (3-5 questions)
- **A**rchitect high-level (3-5 boxes)
- **R**EST API design (3-5 endpoints)
- **D**ata model (2-3 tables)
- **S**cale awareness + trade-offs

**If you go blank:** "Draw Client → Server → Database. Add a Cache if read-heavy, a Queue if async tasks, a CDN if static files."
