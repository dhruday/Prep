# 90 Hands-On AI Projects: Full-Stack Engineer to Forward Deployed Engineer

One project per day. Every project ships with:

- [ ] Public repo with a clear README
- [ ] 2-minute demo (GIF or video)
- [ ] One measured number (latency, cost per request, accuracy, or time saved)
- [ ] Short "what broke and how I fixed it" note

**Suggested stack:** TypeScript, Next.js, Node.js, Postgres + pgvector, Docker, Claude API, MCP, n8n, GitHub Actions.

**Priority phases for FDE roles:** RAG (11-25), MCP (41-55), Evals and Observability (56-68), Capstones (81-90). If short on time, go deep on these and keep the rest lighter.

---

## Phase 1: LLM Fundamentals (Days 1-10)

- [ ] 1. Multi-model comparison CLI (Claude, GPT, Gemini)
- [ ] 2. Streaming chat UI in Next.js
- [ ] 3. Structured JSON output with Zod validation and retries
- [ ] 4. Prompt-versioning tool with diffs
- [ ] 5. Token and cost calculator per request
- [ ] 6. Tool-calling weather and calendar bot
- [ ] 7. Conversation memory with summarization
- [ ] 8. Prompt-injection test suite
- [ ] 9. Rate-limit and retry wrapper with backoff
- [ ] 10. LLM gateway: one API, many providers, fallback

## Phase 2: RAG (Days 11-25)

- [ ] 11. PDF Q&A with basic chunking
- [ ] 12. Chunking strategy benchmark (fixed, semantic, recursive)
- [ ] 13. Embedding model comparison
- [ ] 14. pgvector search service
- [ ] 15. Hybrid search (BM25 + vector)
- [ ] 16. Reranker added to your pipeline
- [ ] 17. Citations with source highlighting
- [ ] 18. RAG over a GitHub repo (code Q&A)
- [ ] 19. RAG over SAP BusinessObjects docs
- [ ] 20. Metadata filtering and multi-tenant isolation
- [ ] 21. Query rewriting and HyDE
- [ ] 22. Incremental re-indexing on file change
- [ ] 23. Conversational RAG with follow-ups
- [ ] 24. Table and image extraction from PDFs
- [ ] 25. RAG eval harness (recall@k, faithfulness)

## Phase 3: Agents and Tools (Days 26-40)

- [ ] 26. ReAct agent from scratch, no framework
- [ ] 27. SQL agent with read-only guardrails
- [ ] 28. Research agent with web search and report output
- [ ] 29. Email triage agent
- [ ] 30. Code-review agent for PRs
- [ ] 31. Planner-executor multi-step agent
- [ ] 32. Multi-agent supervisor pattern
- [ ] 33. Human-in-the-loop approval flow
- [ ] 34. Agent with persistent memory
- [ ] 35. Browser-automation agent
- [ ] 36. File-system agent with sandboxing
- [ ] 37. Agent retry and self-correction loop
- [ ] 38. Agent trace viewer UI
- [ ] 39. Tool-selection accuracy benchmark
- [ ] 40. Customer-support agent with escalation

## Phase 4: MCP (Days 41-55)

- [ ] 41. Hello-world MCP server in TypeScript
- [ ] 42. MCP server for your Postgres DB
- [ ] 43. MCP server wrapping a REST API
- [ ] 44. MCP server for GitHub issues
- [ ] 45. MCP server for Google Calendar or Drive
- [ ] 46. MCP server with auth (OAuth)
- [ ] 47. MCP server for stock data (Indian markets)
- [ ] 48. MCP client app with a custom UI
- [ ] 49. MCP server for a content library (e.g. Telugu Smart Investor)
- [ ] 50. MCP gateway with permission scopes
- [ ] 51. MCP server with resources and prompts
- [ ] 52. Remote MCP server deployed to the cloud
- [ ] 53. MCP server test harness
- [ ] 54. Multi-server orchestration demo
- [ ] 55. MCP security review checklist and demo exploits

## Phase 5: Evals and Observability (Days 56-68)

- [ ] 56. Golden-dataset builder
- [ ] 57. LLM-as-judge scorer with calibration
- [ ] 58. Regression-test CI for prompts (GitHub Actions)
- [ ] 59. Tracing with OpenTelemetry
- [ ] 60. Cost and latency dashboard
- [ ] 61. Hallucination detector
- [ ] 62. A/B prompt testing framework
- [ ] 63. Feedback-capture UI (thumbs, comments)
- [ ] 64. Drift monitor on production queries
- [ ] 65. Guardrails layer (PII redaction, topic limits)
- [ ] 66. Semantic cache to cut cost
- [ ] 67. Model router (cheap model first, escalate)
- [ ] 68. Load test of your LLM API

## Phase 6: Production Systems (Days 69-80)

- [ ] 69. Dockerized RAG API with health checks
- [ ] 70. Async job queue for long LLM tasks
- [ ] 71. Webhook-driven n8n workflow with LLM steps
- [ ] 72. Spring Boot service calling Claude
- [ ] 73. Multi-tenant SaaS starter with usage metering
- [ ] 74. Auth, quotas, and billing for an AI API
- [ ] 75. Prompt caching implementation
- [ ] 76. Batch-processing pipeline for documents
- [ ] 77. Streaming server with backpressure handling
- [ ] 78. Feature flags for model rollout
- [ ] 79. Kubernetes or cloud deployment with CI/CD
- [ ] 80. Incident runbook plus failure-injection tests

## Phase 7: FDE-Style Capstones (Days 81-90)

- [ ] 81. Document-intake automation for a finance workflow
- [ ] 82. Contract analyzer with clause extraction
- [ ] 83. KYC document verification assistant
- [ ] 84. BI natural-language-to-SQL assistant over a sample warehouse
- [ ] 85. Support-ticket classifier and auto-responder
- [ ] 86. Voice agent (speech in, LLM, speech out)
- [ ] 87. Internal knowledge-base assistant with SSO
- [ ] 88. Analytics copilot embedded in a React dashboard
- [ ] 89. Discovery-to-demo exercise: write a client brief, scope it, build it in 2 days, present it
- [ ] 90. Final portfolio site with all 90 projects, metrics, and write-ups

---

## README Template (copy per project)

```
# Project N: <name>

## Problem
One paragraph: who needs this and why.

## Approach
Architecture in 5-8 lines. Diagram if useful.

## Results
- Metric 1: ...
- Metric 2: ...

## What broke
Top 2-3 failures and fixes.

## Run it
Commands to start locally.
```

## Why Project 89 Matters

FDE hiring managers look for customer-facing proof: scoping an ambiguous problem, building fast, and presenting results. Treat 89 as a real engagement: write the brief, define success criteria, build in two days, and present the outcome as if to a client.
