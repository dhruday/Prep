# Story 7 — Oracle REST APIs: End-to-End Ownership, Backend Delivery
> Part 20 — Behavioural & Leadership · Hruday's Core Stories · ✅
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Story type**: Backend ownership, REST API design, test coverage, end-to-end delivery from scratch
- **When to use**: "Tell me about a backend project you owned end to end" · "Describe a system you built from scratch" · "When did you achieve high test coverage on backend code?" · "Tell me about API design decisions you made"
- **The headline numbers**: 12 REST APIs designed and shipped; 85% test coverage (unit + integration); zero P1 bugs in first 6 months of production; Angular component library integrated as the frontend consumer
- **The key backend ownership signal**: not just writing the code — designing the API contract, co-owning the data model, setting the test coverage standard that the team adopted, and building the Angular consumer simultaneously
- **Growth layer**: "I'd add API versioning at the top-level URI from the start (`/api/v1/`) — we added it 4 months in when v2 requirements arrived and had to coordinate a migration path that could have been avoided with versioning from day one"
- **Story length**: ~2 minutes

---

## 1. One-Line Definition
A 2-minute STAR story about designing and shipping 12 REST APIs at Oracle India with 85% test coverage, zero P1 production bugs in 6 months, and simultaneously building the Angular component library that consumed them.

---

## 2. Story Summary

| | Detail |
|---|---|
| **Company** | Oracle India |
| **Product** | Internal enterprise tool (workflow and document management) |
| **Starting state** | New module being built from scratch; no APIs, no frontend components for the new module |
| **Challenge** | Own the API design, implementation, and test coverage while building the Angular component library in parallel |
| **My role** | Full stack engineer owning both backend (Spring Boot) and frontend (Angular) for the module |
| **What I did** | (1) API contract first (OpenAPI 3.0 spec before code); (2) Spring Boot REST controllers with validation; (3) JUnit + Mockito unit tests; (4) Spring Boot Test integration tests; (5) Angular reactive forms consuming the APIs; (6) Team test coverage standard set |
| **Result** | 12 APIs shipped; 85% test coverage; zero P1 in 6 months; coverage standard adopted by 2 other teams |

---

## 3. Full STAR Script (2 minutes)

### Situation (12 seconds)
"At Oracle India, I was assigned a new enterprise workflow module being built from scratch — no existing APIs, no frontend components. The module needed 12 REST endpoints for document creation, status management, and approval workflows."

### Task (8 seconds)
"I owned both the Spring Boot backend and the Angular frontend for this module. My goal was to ship production-quality APIs with high test coverage — Oracle's internal bar was 80% minimum."

### Action (80 seconds)
"I started with an API contract — I wrote the OpenAPI 3.0 specification before writing any code. That gave the product and QA teams a document to review and sign off before I committed an implementation approach. It also forced me to think through edge cases — null states, pagination, error response format — at the design phase rather than discovering them in code review.

For the implementation, I used Spring Boot, structured around a layered architecture: controllers handling request/response, service layer for business logic, and JPA repositories for data access. All validation happened at the controller layer using Bean Validation annotations — every request body had constraints, and a global exception handler mapped validation errors to RFC 7807 problem+json format for consistent client error handling.

For tests, I wrote JUnit unit tests for all service-layer methods and Mockito mocks for the repository layer. For integration tests, I used Spring Boot Test with an H2 in-memory database — real HTTP calls through a test context, no mocks at the API level.

The combination got us to 82% unit coverage and 85% when integration tests were included. That exceeded the 80% bar. I documented the test structure as a one-page pattern guide, and two other teams adopted it."

### Result (20 seconds)
"12 APIs shipped on schedule. 85% test coverage in the final build, exceeding Oracle's 80% target. Zero Priority 1 bugs in the first 6 months of production use. The API contract-first approach became the team's default practice — we used OpenAPI 3.0 specs for the next 3 modules as well."

---

## 4. Follow-Up Questions & Answers

### Q1 — Design Decision
**"Why write the OpenAPI spec before code — is that not slower?"**

> It's slower to start, faster to finish. Writing the spec first takes an extra day. Discovering API design mistakes in code review — or worse, post-integration — costs a sprint.
>
> The concrete savings: when I designed the document approval workflow endpoints, the product owner reviewed the spec doc and pointed out that the "submit for approval" and "approve" actions should be separate endpoints (idempotency requirements differed). In code, this would have been a controller refactor, a service refactor, and test rewrites. In a spec doc, it was a 2-line change.
>
> Contract-first also means frontend can start work immediately with stub data based on the spec, rather than waiting for backend completion. The Angular forms I was building in parallel used mock data matching the spec. When the APIs were live, I swapped the mocks for real HTTP calls — no design reconciliation needed.

### Q2 — Test Coverage
**"How did you decide what to unit test vs integration test at Oracle?"**

> I used a simple rule: unit tests verify logic in isolation; integration tests verify contracts across boundaries.
>
> Unit tests covered the service layer — where business rules lived. "A document in DRAFT status can only be submitted if it has at least one attachment" — that rule lives in the service class, tested with a simple JUnit test and a mocked repository. Fast to run, specific to one behaviour.
>
> Integration tests covered the full HTTP request-response path. "POST /documents with a valid body should return 201 with a Location header" — that test calls the real Spring Boot controller, the real validation chain, and the real response mapper. It also tests the error path: "POST /documents with a missing required field should return 400 with a problem+json body." The database was H2 in-memory — real SQL but no infrastructure dependency.
>
> This split kept unit tests at ~200ms per run and integration tests at ~5 seconds per run. The CI pipeline ran both on every PR.

### Q3 — Growth Layer
**"What would you do differently?"**

> I'd add URI versioning from day one. I designed all 12 endpoints under `/api/[resource]` with no version segment. Four months in, a new requirement needed a breaking change to the document creation response body — adding a required field that existing clients hadn't validated for.
>
> We added `/api/v2/documents` but had to simultaneously maintain `/api/v1/documents` during the migration window — extra code, extra tests, extra deployment complexity. If I'd started with `/api/v1/[resource]`, the migration to v2 would have been planned from the beginning and the v1→v2 strategy would have been in the initial design doc.

---

## 5. Question Map — Where to Use This Story

| Behavioural Question | Angle from This Story |
|----------------------|-----------------------|
| "Tell me about backend API work you've owned" | Full STAR from contract to 85% coverage to zero P1 |
| "Describe a project you delivered from scratch" | New module, no existing code, full ownership |
| "Tell me about test coverage discipline" | 85%, the 80% Oracle bar, the pattern guide adopted by 2 teams |
| "When did you make a process change that outlasted the project?" | Contract-first adopted for next 3 modules; test pattern adopted by 2 teams |
| "Describe REST API design decisions you've made" | OpenAPI 3.0 first, RFC 7807 error format, validation at controller layer |

---

## 6. Numbers Reference Card

| Metric | Before | After |
|--------|--------|-------|
| APIs delivered | 0 (new module) | 12 REST endpoints |
| Test coverage | — | 85% (unit + integration) |
| Oracle's minimum bar | — | 80% — we exceeded it |
| P1 bugs (first 6 months) | — | 0 |
| Teams adopting test pattern | — | 2 additional teams |
| Contract-first pattern adoption | — | Next 3 modules used OpenAPI-first |

---

## 7. Related Topics — What to Study Next
- **Topic 328 — How to Talk About Backend Decisions** — this story contains 3 backend decisions; knowing how to frame them for different question types is covered in that topic
- **Topic 56 — REST API Design Principles** — the technical depth behind the OpenAPI-first decision and error format choices
- **Topic 49 — ACID + Transactions** — the service layer business rules tested here rely on transactional consistency

---

*Part 20 · Story 7: Oracle REST APIs · Full Stack Interview Guide · Hruday D · 2026*
