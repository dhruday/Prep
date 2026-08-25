# Model Versioning — What Breaks When a Model Updates Silently
> Part 22 — AI Integration Patterns · Responsible AI
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The problem**: OpenAI, Anthropic, Google update model aliases silently; `gpt-4o-mini` today is not the same model as `gpt-4o-mini` in six months; an alias that worked in January can break structured output parsing, return more tokens, trigger more refusals, or change tone — all without a code change or deployment from your side
- **The fix**: pin to a specific dated snapshot in production (`gpt-4o-mini-2024-07-18`, not `gpt-4o-mini`); OpenAI maintains dated snapshots for at least 6 months; Anthropic uses `claude-3-5-haiku-20241022` style versioning; Azure OpenAI model deployments are explicitly versioned with no silent updates
- **Four things that break on model update**: (1) structured output format shifts — JSON keys renamed or added/removed; (2) response length changes — same prompt returns 30% more tokens; (3) safety policy changes — queries that passed before start getting refused; (4) reasoning/tone changes — the "personality" shifts, breaking prompt-engineered personas
- **Detection**: golden test set of 50-200 prompt/output pairs with expected format assertions; run nightly against the pinned model version AND against the latest alias; compare pass rates; alert if delta > 5%
- **Canary rollout**: point 5% of traffic to a new model version, monitor quality metrics (thumbs down rate, fallback rate), then ramp to 100% — ties to feature flag topic (378)
- **Spring AI**: `ChatOptions.withModel("gpt-4o-mini-2024-07-18")` per request, or in application.yaml; swap model version via config-only change; Spring AI's provider abstraction means the same code works across OpenAI, Anthropic, Azure OpenAI

---

## 1. One-Line Definition
Model versioning is the practice of pinning LLM API calls to specific dated model snapshots, testing against a stable golden set, and running canary rollouts when migrating to a new version — so a provider update never silently breaks production.

---

## 2. What Breaks Without Version Pinning

```
TIMELINE OF SILENT BREAKAGE — REAL SCENARIO

Nov 2024: gpt-4o-mini alias → gpt-4o-mini-2024-07-18
Jan 2025: gpt-4o-mini alias silently updated → gpt-4o-mini-2025-01-31

What your code does:
  String model = "gpt-4o-mini";  // floating alias
  → Jan 31 2025: all calls now hit the new model with no code change

What can break the next morning in production:

1. STRUCTURED OUTPUT PARSING (most common)
   Your schema:  { "status": "approved" | "rejected", "reason": "..." }
   Old model returns:   {"status": "approved", "reason": "meets criteria"}
   New model returns:   {"decision": "approved", "justification": "meets criteria"}
     → Jackson throws UnrecognizedPropertyException
     → Null pointer on result.getStatus() if nullable fields
     → 100% of AI-driven classifications fail silently

2. RESPONSE LENGTH CHANGE
   Old model: average 120 tokens per response
   New model: average 180 tokens per response (more verbose)
     → Downstream truncation breaks UI components designed for shorter text
     → Unexpected $12k/month increase in token costs

3. SAFETY POLICY TIGHTENING
   Old model: answers "How do I cancel a subscription?" freely
   New model: refuses some rephrasing ("How do I stop your service from charging me?")
     → Support chatbot starts blocking legitimate customer queries
     → Escalation rate spikes; no one knows why

4. REASONING DISTRIBUTION SHIFT
   Old model: A/B test shows variant B at 35% CTR improvement
   New model: A/B test results invalidated — base model behaviour changed during the test
     → A/B test results become meaningless mid-flight
```

---

## 3. Pinned Version Configuration

```yaml
# application.yaml — production: always exact versions, never floating aliases

spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          # PINNED: exact dated snapshot (NOT "gpt-4o-mini")
          model: gpt-4o-mini-2024-07-18
          temperature: 0.1

# Per-feature model routing — also pinned
ai:
  model-routing:
    feature:
      support_chat:     gpt-4o-mini-2024-07-18
      code_review:      gpt-4o-2024-11-20
      content_moderation: gpt-4o-mini-2024-07-18
      doc_summary:      gpt-4o-mini-2024-07-18
      embedding:        text-embedding-3-small  # stable; no dated variant needed
```

```java
// Per-request model override — used for canary rollout
public AiCallResult callWithVersion(String featureId, String input, String userId) {
    String pinnedModel = featureFlags.isEnabled("canary-new-model-" + featureId, userId)
        ? "gpt-4o-mini-2025-01-31"    // 5% of users get new model
        : "gpt-4o-mini-2024-07-18";   // 95% stay on stable version
    
    return chatClient.prompt()
        .options(OpenAiChatOptions.builder().withModel(pinnedModel).build())
        .system(systemPrompt)
        .user(input)
        .call()
        .entity(ExpectedOutputRecord.class);
}
```

---

## 4. Golden Test Set and Nightly Regression

```java
@SpringBootTest
@Slf4j
class ModelRegressionTest {

    /*
     * Golden set: 50-200 prompts with expected output properties.
     * Each entry defines: prompt, expected assertions (NOT exact match — too brittle).
     */
    private static final List<GoldenCase> GOLDEN_SET = List.of(
        GoldenCase.of(
            "Customer says: 'My order #ORD-123 hasn't arrived in 10 days'",
            output -> output.action().equals("ESCALATE"),
            output -> output.category().equals("DELIVERY"),
            output -> output.confidence() >= 0.8
        ),
        GoldenCase.of(
            "Customer says: 'Great product, very happy!'",
            output -> output.sentiment().equals("POSITIVE"),
            output -> output.action().equals("NO_ACTION")
        )
        // ... typically 50-200 cases
    );
    
    @Test
    @Tag("nightly")  // Run in CI nightly, not on every commit (cost: ~$1-5 per run)
    void modelRegressionGoldenSet() {
        int passed = 0;
        int total = GOLDEN_SET.size();
        List<String> failures = new ArrayList<>();
        
        for (GoldenCase testCase : GOLDEN_SET) {
            try {
                ClassificationResult result = classificationService.classify(testCase.prompt());
                boolean allAssertionsMet = testCase.assertions().stream()
                    .allMatch(assertion -> assertion.test(result));
                    
                if (allAssertionsMet) {
                    passed++;
                } else {
                    failures.add("FAIL [%s]: output=%s".formatted(
                        testCase.prompt().substring(0, 40), result));
                }
            } catch (Exception e) {
                failures.add("ERROR [%s]: %s".formatted(
                    testCase.prompt().substring(0, 40), e.getMessage()));
            }
        }
        
        double passRate = (double) passed / total;
        log.info("Model regression: {}/{} passed ({:.1f}%)", passed, total, passRate * 100);
        
        // Alert if pass rate drops below 95% 
        assertThat(passRate)
            .as("Model regression pass rate fell below 95%% — check model version update")
            .isGreaterThanOrEqualTo(0.95);
    }
}
```

---

## 5. Model Migration Canary Runbook

```
RUNBOOK: MIGRATING FROM gpt-4o-mini-2024-07-18 TO gpt-4o-mini-2025-01-31

Step 1 — Shadow testing (0% real traffic, no user impact)
  → Run golden test set against new version; confirm pass rate ≥ old version
  → Check average token count delta (> +30% = cost risk; needs budget approval)
  → Check finish_reason distribution: compare CONTENT_FILTER rate

Step 2 — Canary: 5% traffic
  → Feature flag: set "canary-new-model-support_chat" to 5% rollout
  → Monitor for 24 hours:
      - thumbs down rate (target: within ±10% of baseline)
      - escalation rate (target: within ±5% of baseline)
      - structured output parse error rate (target: 0%)
      - average output token count (for cost projection)

Step 3 — Expand to 25%
  → If 24h metrics are clean
  → Monitor for 48 hours (cover weekly usage patterns)

Step 4 — Full rollout to 100%
  → Update application.yaml pinned version
  → Remove feature flag
  → Archive old model version support after 30 days (check no logs still using it)

ROLLBACK
  → Set feature flag canary percentage to 0% immediately — instant rollback
  → No deployment needed
  → Root cause in golden test failures before retry
```

---

## 6. Wrong Way vs Right Way

```java
// ❌ Floating alias — silently updated by provider
@Configuration
public class AiConfig {
    @Bean
    public ChatClient chatClient(OpenAiChatModel model) {
        return ChatClient.builder(model)
            .defaultOptions(OpenAiChatOptions.builder()
                .withModel("gpt-4o-mini")  // ← floating alias; breaks silently
                .build())
            .build();
    }
}
```

```java
// ✅ Pinned version in config; per-feature routing; canary via feature flags
@Configuration
public class AiConfig {
    @Bean
    public ChatClient chatClient(
            OpenAiChatModel model,
            @Value("${ai.model-routing.default-version}") String defaultVersion) {
        return ChatClient.builder(model)
            .defaultOptions(OpenAiChatOptions.builder()
                .withModel(defaultVersion)  // Pinned in yaml: gpt-4o-mini-2024-07-18
                .build())
            .build();
    }
}
```

```yaml
# application.yaml
ai:
  model-routing:
    default-version: gpt-4o-mini-2024-07-18  # ← change exactly here on migration
```

---

## 7. Handling Model Retirement

```
PROVIDER MODEL SUNSET TIMELINE
  OpenAI: typically 6-month notice before dated snapshots are retired
  Anthropic: similar; documented in model deprecation policy page
  Azure OpenAI: longer lag; enterprise customers get 12-month notice

ACTIONS ON RETIREMENT NOTICE
1. Add new version to golden test set run
2. Check token count and cost delta
3. Review any schema changes in structured output responses
4. Run canary rollout (steps above)
5. Update application.yaml before retirement date
6. Set calendar reminder: 30 days before retirement date
```

---

## 8. Scale Evolution

**Prototype →** Pin version in `application.yaml`; add 10-20 golden test cases.

**Production →** Nightly golden regression CI job; structured output parse error rate in Grafana; model version in every audit log record for correlation.

**High scale →** Per-feature model version config in database (update without redeployment); shadow traffic pipeline (clone 5% of real traffic to new model, compare responses offline); automated canary via feature flags with automatic rollback on metric degradation; model version changelog in a config service with change history.

---

## 9. Company Relevance

| Company | Model versioning context | Interview signal |
|---------|------------------------|-----------------|
| Razorpay / PhonePe | AI-driven fraud/risk decisions must be reproducible; "why was this flagged?" | Audit log includes exact model version; deterministic replay via version pin |
| Swiggy / Meesho | LLM-powered recommendations in app; A/B tests invalidated by silent model updates | Model version scoped to A/B test; test concludes before version migration |
| Adobe / Microsoft | Creative AI tools — tone, style consistency critical; enterprise clients expect stable behaviour | Model version in customer contract SLA; migration notice to enterprise customers |
| SAP Labs | Enterprise B2B — finance/HR decisions via AI; customers demand auditability | Golden test set required before each model migration; change management process with client notification |

---

## 10. Interview Questions & Model Answers

### Q1 — How do you protect against silent model updates breaking production?
**Hruday:**
> "I never use floating model aliases in production. Instead of `gpt-4o-mini`, I pin to an exact dated snapshot like `gpt-4o-mini-2024-07-18` in `application.yaml`. That snapshot won't change unless I explicitly update the config. When I want to migrate to a newer version, I follow a canary process: first I run the new version against a golden test set — about 50 to 200 curated prompt/output pairs with assertion checks on format and key fields rather than exact string matching. If the pass rate is above 95% and the token cost delta is acceptable, I use a feature flag to send 5% of real traffic to the new version and monitor for 24 hours. Metrics I watch are the thumbs-down rate, escalation rate, and critically the structured output parse error rate which should stay at zero. If clean, I expand to 25%, then 100%, then update the pinned version in config and remove the flag. The four things I specifically test for are: structured output format shifts (the most common breakage — a JSON key gets renamed), response length changes (which affect cost and UI), safety policy tightening (new model refuses queries that the old one answered), and reasoning distribution changes that would invalidate any running A/B tests. Every AI call logs the exact model version it used, so I can always go back and correlate a service quality dip to a specific model version."

---

*Part 22 · Model Versioning — What Breaks When a Model Updates Silently · Full Stack Interview Guide · Hruday D · 2026*
