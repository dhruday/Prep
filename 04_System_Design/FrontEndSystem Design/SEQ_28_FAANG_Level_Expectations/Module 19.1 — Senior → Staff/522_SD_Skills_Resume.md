# 522. System Design Skills on Resume — How to Present SD Experience

────────────────────────────────────
## 1. Why Resume Presentation Matters
────────────────────────────────────

Recruiters at Google, Meta, Amazon, and Microsoft spend 6-10 seconds on initial resume scan. System design skills buried in paragraph form or listed as generic "system design" are invisible. Your resume must signal SD competence through **specific, quantified architectural achievements**.

────────────────────────────────────
## 2. The STAR-SD Formula for Bullet Points
────────────────────────────────────

Standard STAR (Situation, Task, Action, Result) adapted for system design:

**Formula:** `[Action Verb] + [System/Architecture] + [Scale Metric] + [Business Impact]`

### Bad Examples (Generic):
```
❌ "Worked on system design for the backend"
❌ "Designed microservices architecture"
❌ "Improved application performance"
❌ "Built scalable systems using AWS"
```

### Good Examples (Specific + Quantified):
```
✅ "Architected event-driven notification system (Kafka + WebSocket) serving 2M daily 
    active users with <200ms P99 delivery latency"

✅ "Redesigned monolithic API into 6 microservices (Node.js + gRPC), reducing deployment 
    time from 45min to 8min and enabling independent team releases"

✅ "Designed real-time collaborative editing system (CRDT-based) supporting 50 concurrent 
    editors with <100ms sync latency using operational transforms"

✅ "Led migration from REST to GraphQL federation, reducing mobile app API calls by 67% 
    and improving Lighthouse Performance score from 60 to 95"

✅ "Implemented CQRS pattern for product catalog (Elasticsearch reads + PostgreSQL writes), 
    handling 15K QPS with <50ms P95 search latency"

✅ "Designed CDN strategy + lazy loading pipeline reducing LCP from 4.2s to 1.1s across 
    12 markets, achieving Core Web Vitals 'Good' for 85% of page loads"
```

────────────────────────────────────
## 3. Mapping SD Skills to Resume Sections
────────────────────────────────────

### Skills Section — Category Grouping

```
System Design:       Distributed Systems, Microservices, Event-Driven Architecture,
                     CQRS, Domain-Driven Design, API Design (REST, GraphQL, gRPC)

Infrastructure:      AWS (S3, SQS, Lambda, DynamoDB, CloudFront), Docker, Kubernetes,
                     Terraform, CI/CD (GitHub Actions)

Databases:           PostgreSQL, MongoDB, Redis, Elasticsearch, DynamoDB

Real-Time:           WebSocket, Server-Sent Events, Kafka, RabbitMQ

Frontend Architecture: Micro-Frontends, Module Federation, Performance Optimization,
                       Core Web Vitals, WCAG 2.1 AA Accessibility
```

**Rules:**
- Group by domain, not alphabetically
- List specific services, not just "AWS"
- Include the PATTERN name (CQRS, Event Sourcing), not just the tool

### Experience Section — SD-Infused Bullets

For each role, include 1-2 bullets that demonstrate architectural thinking:

| Level            | What to Highlight                                           |
|------------------|-------------------------------------------------------------|
| Junior (0-2 yr)  | Built features using existing architecture, optimized queries|
| Mid (2-5 yr)     | Designed components/services, led technical migrations       |
| Senior (5-8 yr)  | Architected systems, made build-vs-buy decisions, set tech standards |
| Staff (8+ yr)    | Cross-team architecture, platform decisions, org-wide impact |

────────────────────────────────────
## 4. SD Keywords That Pass ATS Filters
────────────────────────────────────

Applicant Tracking Systems scan for keywords. Include these naturally in bullets:

**Architecture Patterns:**
Microservices, Monolith-to-Microservices, Event-Driven, CQRS, Saga Pattern, API Gateway, Service Mesh, Domain-Driven Design, Hexagonal Architecture

**Scalability:**
Horizontal Scaling, Load Balancing, Sharding, Partitioning, Caching Strategy, CDN, Read Replicas, Connection Pooling

**Data:**
Schema Design, Data Modeling, Migration, ETL, Data Pipeline, Streaming, Real-Time Processing

**Reliability:**
High Availability, Fault Tolerance, Circuit Breaker, Retry Pattern, Graceful Degradation, Disaster Recovery, SLA/SLO

**Observability:**
Monitoring, Alerting, Distributed Tracing, Logging, Metrics, Dashboards, Incident Response

────────────────────────────────────
## 5. Project Section — SD Portfolio Entries
────────────────────────────────────

If you lack professional SD experience, add a Projects section:

```
Personal Projects
─────────────────
Real-Time Chat Application                                    github.com/user/chat
• Designed WebSocket-based messaging system with Redis pub/sub for horizontal scaling
• Implemented message persistence (PostgreSQL) with cursor-based pagination
• Added presence detection (online/offline) using heartbeat mechanism
• Tech: TypeScript, Node.js, WebSocket, Redis, PostgreSQL, Docker

URL Shortener (System Design Implementation)                   github.com/user/shorturl
• Built distributed key generation service (Base62 encoding + Snowflake IDs)
• Implemented analytics pipeline: click tracking → Kafka → Elasticsearch
• Added rate limiting (token bucket) and caching (Redis, 95% hit rate)
• Tech: Go, Redis, Kafka, Elasticsearch, PostgreSQL, Kubernetes
```

**Rules for projects:**
- Name the project after the SD problem ("Real-Time Chat" not "MyApp")
- Each bullet = one architectural decision
- Include scale metrics even for personal projects ("handles 1K concurrent connections")

────────────────────────────────────
## 6. Tailoring for Target Companies
────────────────────────────────────

| Company    | Emphasize                                              | Keywords to Include                    |
|------------|--------------------------------------------------------|----------------------------------------|
| Google     | Scale, data structures, API design, consistency models | Protocol Buffers, gRPC, Bigtable-style |
| Meta       | Real-time systems, feed ranking, social graph          | GraphQL, Newsfeed, pub/sub, fan-out    |
| Amazon     | Operational excellence, AWS services, reliability      | DynamoDB, SQS, Lambda, SLA, operational|
| Microsoft  | Azure services, enterprise scale, extensibility        | Azure, .NET, SignalR, extensibility     |
| Startups   | Pragmatic architecture, speed, cost-efficiency         | Serverless, rapid iteration, MVP       |

────────────────────────────────────
## 7. What NOT to Put on Resume
────────────────────────────────────

```
❌ "Familiar with system design concepts"     → Too vague
❌ "Studied system design on YouTube"          → Not professional experience
❌ "Can design scalable systems"               → Unsubstantiated claim
❌ "System Design: ★★★★☆"                     → Skill rating bars are meaningless
❌ Listing every design pattern you've read    → Only list what you've USED
```

────────────────────────────────────
## 8. Memory Aid
────────────────────────────────────

**Resume SD formula: "Verb + System + Scale + Impact"**

**Before submitting any resume, check:**
- [ ] At least 2 bullets per role mention architecture/design
- [ ] Every SD bullet has a number (latency, QPS, users, %, time saved)
- [ ] Skills section groups by domain (not alphabetical soup)
- [ ] Keywords match job description's SD requirements
- [ ] No generic claims without evidence
