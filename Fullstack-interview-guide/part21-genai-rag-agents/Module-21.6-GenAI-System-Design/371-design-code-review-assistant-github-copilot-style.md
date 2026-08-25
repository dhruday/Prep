# Design a Code Review Assistant (GitHub Copilot Style)
> Part 21 — Generative AI for Full Stack Engineers · GenAI System Design
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Three distinct features, three distinct LLM tasks**: (1) inline suggestion (complete the current line/block, triggered as you type); (2) code explanation (describe what selected code does); (3) review comments (analyse a diff, produce structured feedback on quality/bugs/security)  
- **GitHub webhook → Spring Boot → LLM pipeline for PR review**: PR opened event → extract diff → chunk by file/function → send each chunk with code review system prompt → aggregate comments → post back via GitHub API; asynchronous (Kafka job) to avoid webhook timeout
- **Context injection is the key quality lever**: inject relevant code files (dependencies, interfaces, tests) alongside the diff — without context, the LLM reviews in isolation and suggests obvious refactors that contradict the existing codebase patterns
- **Structured review output**: use `entity()` to get the LLM to produce a list of `ReviewComment(filePath, lineNumber, severity, category, description, suggestedFix)` objects — not free text; actionable comments can then be auto-formatted and posted as GitHub review comments
- **Security scanning as a separate pass**: never mix security review with style/logic review in one prompt; run a dedicated security-focused prompt against each file diff to specifically check for OWASP Top 10 patterns (SQL injection, XSS, hardcoded secrets); security comments get `severity=CRITICAL` and a blocking label
- **Rate and cost control**: large PRs can have 50+ files; process files in priority order (changed files → their dependencies); cap at 30 files per PR to control LLM cost; GPT-4o for security pass, GPT-4o-mini for style/doc pass

---

## 1. System Overview

**Functional requirements:**
- Inline code completion in IDE (VS Code extension / IntelliJ plugin)  
- Automated PR review comments on GitHub pull requests
- Code explanation for selected blocks
- Security vulnerability detection per diff

**Scope for this design**: Focus on the PR review system (most interesting from system design perspective).

---

## 2. PR Review Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     PR REVIEW PIPELINE                        │
│                                                               │
│  GitHub Webhook (PR opened/updated)                          │
│    → POST /webhooks/github                                   │
│       ↓ (X-Hub-Signature-256 verified)                       │
│  Spring Boot Webhook Controller                              │
│    → Validate signature → Publish to Kafka topic             │
│       ↓                                                      │
│  Review Job Consumer (Kafka)                                │
│    → Fetch diff via GitHub API                              │
│    → Fetch context files (imports, interfaces, tests)       │
│    → Split diff into chunks (per file/function)             │
│       ↓                                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PARALLEL REVIEW PASSES                                │ │
│  │  Pass 1: Logic + Quality (GPT-4o-mini, per file)       │ │
│  │  Pass 2: Security scan (GPT-4o, all changed files)     │ │
│  │  Pass 3: Test coverage check (GPT-4o-mini)             │ │
│  └────────────────────────────────────────────────────────┘ │
│       ↓                                                      │
│  Aggregation Service                                        │
│    → Deduplicate overlapping comments                       │
│    → Rank by severity (CRITICAL first)                      │
│    → Format as GitHub Review API payload                    │
│       ↓                                                      │
│  GitHub API Client                                          │
│    → POST /repos/.../pulls/.../reviews                     │
│    → Post inline comments with line numbers                │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Key Component: Structured Review Comment

```java
// Structured output from the review LLM
public record ReviewComment(
    String filePath,
    int lineNumber,          // -1 if general file-level comment
    String severity,         // CRITICAL, HIGH, MEDIUM, LOW, INFO
    String category,         // SECURITY, LOGIC_BUG, PERFORMANCE, STYLE, MISSING_TEST
    String description,      // What the problem is
    String suggestedFix,     // Specific fix suggestion or code snippet
    double confidence        // 0.0-1.0 — filter out low-confidence suggestions
) {}

@Service
public class CodeReviewService {

    private final ChatClient chatClient;
    
    private static final String REVIEW_SYSTEM_PROMPT = """
        You are a senior Java/Spring Boot engineer performing code review.
        Review the provided code diff and return a JSON array of review comments.
        
        Focus on:
        - Logic bugs (null dereference, missing error handling, incorrect logic)
        - Performance issues (N+1 queries, unnecessary DB calls, blocking operations)
        - Code quality (naming, structure, SOLID principles)
        - Missing test coverage for critical paths
        
        Each comment must include: filePath, lineNumber, severity (CRITICAL/HIGH/MEDIUM/LOW),
        category, description, suggestedFix, confidence (0.0-1.0).
        Only return comments with confidence > 0.7.
        """;
    
    public List<ReviewComment> reviewDiffChunk(String filePath, String diff, String context) {
        String userMessage = """
            File: %s
            
            Related context (existing code, interfaces):
            ```java
            %s
            ```
            
            Diff to review:
            ```diff
            %s
            ```
            """.formatted(filePath, context, diff);
        
        // entity() with List.class for array extraction
        return chatClient.prompt()
            .system(REVIEW_SYSTEM_PROMPT)
            .user(userMessage)
            .call()
            .entity(new ParameterizedTypeReference<List<ReviewComment>>() {});
    }
    
    // Security-specific pass — separate prompt, more expensive model
    public List<ReviewComment> securityScan(String filePath, String diff) {
        String securityPrompt = """
            You are a security engineer performing OWASP Top 10 analysis.
            Scan for: SQL injection, XSS, SSRF, command injection,
            hardcoded secrets, broken access control, insecure deserialization.
            Be strict — false positives are acceptable; false negatives are not.
            """;
        
        return chatClient.prompt()
            .system(securityPrompt)
            .user("Scan this diff for security vulnerabilities:\n\n```diff\n" + diff + "\n```")
            .options(OpenAiChatOptions.builder().withModel("gpt-4o").build())  // Better model for security
            .call()
            .entity(new ParameterizedTypeReference<List<ReviewComment>>() {});
    }
}
```

---

## 4. Context Injection Strategy

```java
@Service
public class ReviewContextService {

    private final GitHubApiClient github;
    
    // For each changed file, gather relevant context:
    // 1. Interface / superclass it implements
    // 2. Test files for this class
    // 3. Key dependencies it calls
    public String gatherContext(String repoId, String prNumber, String changedFilePath) {
        StringBuilder context = new StringBuilder();
        
        // Find the interface this class implements
        String content = github.getFileContent(repoId, changedFilePath);
        List<String> interfaces = extractImplementedInterfaces(content);
        
        interfaces.forEach(iface -> {
            String ifaceContent = github.findFileByName(repoId, iface + ".java");
            if (ifaceContent != null) {
                context.append("// Interface: ").append(iface).append("\n")
                       .append(ifaceContent.substring(0, Math.min(1000, ifaceContent.length())))
                       .append("\n\n");
            }
        });
        
        // Include test file if it exists
        String testPath = changedFilePath.replace("main", "test").replace(".java", "Test.java");
        String testContent = github.getFileContent(repoId, testPath);
        if (testContent != null) {
            context.append("// Existing tests:\n").append(testContent.substring(0, Math.min(2000, testContent.length())));
        }
        
        return context.toString();
    }
}
```

---

## 5. Wrong Way vs Right Way

```java
// ❌ Review without context — generic suggestions that don't fit the codebase
public List<ReviewComment> review(String diff) {
    return chatClient.prompt()
        .user("Review this diff:\n" + diff)
        .call()
        .entity(new ParameterizedTypeReference<List<ReviewComment>>() {});
}
// Result: "Consider using Optional to handle null" when the team uses Result type
// "Add comments to explain this code" when the team has a no-comment-needed convention
```

```java
// ✅ Review with context — suggestions consistent with existing patterns
public List<ReviewComment> review(String filePath, String diff) {
    String context = contextService.gatherContext(repoId, prNumber, filePath);
    return reviewService.reviewDiffChunk(filePath, diff, context);
}
```

---

## 6. Async Processing with Kafka

```java
// Webhook receives GitHub event and publishes to Kafka immediately
// → avoids GitHub's 10-second webhook timeout
@PostMapping("/webhooks/github")
public ResponseEntity<Void> handleWebhook(
    @RequestBody String payload,
    @RequestHeader("X-Hub-Signature-256") String signature
) {
    // Verify HMAC signature first (security)
    if (!githubWebhookVerifier.verify(payload, signature)) {
        return ResponseEntity.status(401).build();
    }
    
    PrEvent event = objectMapper.readValue(payload, PrEvent.class);
    if ("opened".equals(event.action()) || "synchronize".equals(event.action())) {
        kafkaProducer.send("pr-review-jobs", event.prId(), payload);
    }
    
    return ResponseEntity.ok().build(); // Respond in < 10s to GitHub
}

// Kafka consumer does the actual work asynchronously
@KafkaListener(topics = "pr-review-jobs", groupId = "code-reviewer")
public void processPrReview(String payload) {
    PrEvent event = objectMapper.readValue(payload, PrEvent.class);
    reviewOrchestrator.runFullReview(event);
}
```

---

## 7. Scale Evolution

**Prototype →** GitHub webhook → synchronous Spring Boot handler → single LLM review pass → post comments.

**Production →** Kafka for async processing; parallel review passes (quality + security); structured output with confidence filtering; GitHub API rate limit handling with exponential backoff.

**High scale →** Review job queue with priority (PRs to main > feature branches); LLM cost cap per PR (~$0.50 max); review cache for identical diff chunks (monorepo same boilerplate); per-repository configuration (which categories to run, which files to skip).

---

## 8. Company Relevance

| Company | Code review AI relevance | Interview signal |
|---------|------------------------|-----------------|
| Razorpay / PhonePe | Security-critical codebase — automated security scan on every PR | Describe dedicated security pass with GPT-4o; blocking PR on CRITICAL findings |
| Swiggy / Meesho | Large engineering team, PR bottleneck | Kafka async + parallel passes; 30-file cap per PR |
| Adobe / Microsoft | GitHub integration is core product (GitHub Copilot is a Microsoft product) | Deep dive on inline completion latency (< 300ms target); context window management |
| SAP Labs | Java-heavy codebase, internal tooling opportunity | Structured ReviewComment with Spring-specific categories; N+1 query detection |

---

## 9. Interview Questions & Model Answers

### Q1 — How would you design a code review assistant?
**Hruday:**
> "I'd build it around three passes on each PR. First, detect the changed files from the diff; for each file, gather context — the interface it implements, existing tests, key dependencies — and run a quality+logic review using GPT-4o-mini with structured output: I use Spring AI's `entity()` to get back a typed list of ReviewComment records with filePath, lineNumber, severity, and suggested fix. Second, a dedicated security pass runs in parallel using GPT-4o against all changed files checking specifically for OWASP Top 10 patterns — I use a separate stronger model here because security recall matters more than cost. Third, a test coverage check flags new public methods without corresponding test cases. Results are aggregated, deduplicated, ranked by severity, and posted as GitHub review comments via the GitHub API. The whole pipeline runs asynchronously via Kafka — the webhook endpoint responds to GitHub immediately to avoid the 10-second timeout. CRITICAL severity findings are set as required changes, blocking merge until addressed."

---

*Part 21 · Design a Code Review Assistant · Full Stack Interview Guide · Hruday D · 2026*
