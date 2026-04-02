# Feature Flags for AI Rollout — Safe Canary + A/B Testing
> Part 22 — AI Integration Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Why feature flags are essential for AI rollout**: AI features are inherently non-deterministic — you can't fully test them in staging; quality regressions from model updates are subtle (not 500 errors, but wrong answers); feature flags let you roll out to 1% of users, measure quality, then expand — with an instant kill switch if issues appear
- **AI-specific flag types**: (1) enable/disable kill switch (instant off for any AI feature); (2) model routing flag (send 10% of traffic to GPT-4o, 90% to GPT-4o-mini); (3) prompt A/B flag (two system prompt variants competing); (4) feature rollout flag (0% → 5% → 25% → 100%); all four types are needed for production AI
- **Quality metrics over time**: feature flag analytics must track AI-specific metrics alongside standard ones — thumbs down rate, conversation escalation rate, session abandonment after AI response, topic coverage rate, reranking recall@3; not just error rate and latency
- **Model A/B testing**: OpenAI releases model versions continuously; never just swap all traffic to the new version; split 5% to new model, hold until metrics match or exceed the baseline, then expand to 100%; this is how you catch subtle quality regressions that don't show up in unit tests
- **Prompt A/B testing**: different system prompt phrasings produce different quality levels; A/B test prompt versions explicitly; track which variant has lower escalation rate and higher satisfaction signals; treat prompts as code — version, test, deploy, rollback
- **Instant rollback**: keep the previous model config available; a `promptVersion` flag switches back to the last stable prompt in seconds; this is the AI equivalent of a deployment rollback

---

## 1. One-Line Definition
Feature flags for AI control which model, prompt version, and AI feature variant each user sees — enabling safe progressive rollout, A/B model comparison, and instant kill switch without code deployment.

---

## 2. Flag Types for AI

```
AI FEATURE FLAG TAXONOMY

1. KILL SWITCH
   ai-chat-enabled: true/false
   ai-search-enabled: true/false
   → Master off switch; instant disable in incidents
   → Fallback to non-AI mode when false

2. ROLLOUT PERCENTAGE
   ai-summarisation-rollout: 0 (off) → 5 → 25 → 100 (all users)
   → Gradual exposure; monitor quality metrics before expanding
   → Rollback = set percentage back to 0

3. MODEL ROUTING
   ai-chat-model: gpt-4o-mini (baseline) vs gpt-4o (candidate)
   → 95% of users → gpt-4o-mini (baseline)
   → 5% of users → gpt-4o (A variant)
   → Compare quality metrics; promote if better

4. PROMPT VERSION
   support-chat-prompt-version: v3.2 (baseline) vs v3.3 (candidate)
   → A/B test prompt changes with real user traffic
   → Measure escalation rate, satisfaction signals

5. FEATURE VARIANT
   ai-recommendation-variant: collaborative (A) vs content-based (B)
   → Not just model A/B; different algorithmic approaches
```

---

## 3. Implementation with Spring Boot

```java
// Simple feature flag service (can be backed by Unleash, LaunchDarkly, or a DB table)
@Service
public class AiFeatureFlagService {

    private final FeatureFlagClient flagClient;  // Unleash or in-house implementation
    
    // Kill switch — binary on/off
    public boolean isAiChatEnabled(String userId) {
        return flagClient.isEnabled("ai-chat-enabled", 
            Context.builder().userId(userId).build());
    }
    
    // Model routing — which model should this user get?
    public String getModelForUser(String userId, String feature) {
        String flagKey = "ai-model-" + feature;
        // Flag value is the model name for this user's variant
        String variant = flagClient.getVariant(flagKey, userId);
        return switch (variant) {
            case "gpt-4o" -> "gpt-4o";
            case "gpt-4o-mini" -> "gpt-4o-mini";
            case "claude-3-5-sonnet" -> "claude-3-5-sonnet";
            default -> "gpt-4o-mini";  // Safe default
        };
    }
    
    // Prompt version — which system prompt should this user get?
    public String getPromptVersion(String userId, String feature) {
        return flagClient.getVariant("prompt-version-" + feature, userId, "v3.2");
    }
}

// In the chat service — reads flags for every request
@Service
public class FlaggedChatService {

    public String chat(String userId, String message) {
        // Kill switch check
        if (!featureFlags.isAiChatEnabled(userId)) {
            return fallbackService.keywordFaqAnswer(message);
        }
        
        // Get user's assigned model and prompt version
        String model = featureFlags.getModelForUser(userId, "support_chat");
        String promptVersion = featureFlags.getPromptVersion(userId, "support_chat");
        String systemPrompt = promptRegistry.get(promptVersion);
        
        // Record which variant this user received (for A/B analytics)
        abAnalytics.record(userId, "support_chat", model, promptVersion);
        
        return chatClient.prompt()
            .system(systemPrompt)
            .user(message)
            .options(OpenAiChatOptions.builder().withModel(model).build())
            .call()
            .content();
    }
}
```

---

## 4. Quality Metrics for A/B Analysis

```java
// Beyond standard latency/error rate — AI-specific quality signals
@Service
public class AiQualityMetrics {

    private final MeterRegistry meterRegistry;
    
    // Thumbs down rate per variant
    public void recordFeedback(String userId, String model, String promptVersion, boolean positive) {
        Counter.builder("ai.feedback")
            .tag("model", model)
            .tag("prompt_version", promptVersion)
            .tag("sentiment", positive ? "positive" : "negative")
            .register(meterRegistry)
            .increment();
    }
    
    // Escalation rate — user abandoned AI and contacted human support
    public void recordEscalation(String sessionId, String model, String promptVersion) {
        Counter.builder("ai.escalation")
            .tag("model", model)
            .tag("prompt_version", promptVersion)
            .register(meterRegistry)
            .increment();
        log.info("AI session escalated. sessionId={} model={} promptVersion={}", 
            sessionId, model, promptVersion);
    }
    
    // Session abandonment after AI response (user left without follow-up)
    public void recordSessionAbandonment(String sessionId, String model) {
        Counter.builder("ai.session.abandoned")
            .tag("model", model)
            .register(meterRegistry)
            .increment();
    }
}

// A/B decision rule (manual or automated):
// If escalation_rate(candidate) < escalation_rate(baseline) - 10%
//    AND negative_feedback_rate(candidate) < negative_feedback_rate(baseline)
// → Promote candidate to 100%
```

---

## 5. Wrong Way vs Right Way

```java
// ❌ Swap entire production traffic to new model/prompt without gradual rollout
// Change config, deploy, cross fingers
spring.ai.openai.chat.options.model: gpt-4o  // was gpt-4o-mini
// → Quality regression discovered 2 days later after 100K conversations
// → No clean rollback path; users already affected
```

```java
// ✅ Gradual rollout with kill switch
// Day 1:  5% of users get gpt-4o; monitor escalation rate
// Day 3:  Metrics look good → expand to 25%
// Day 7:  No regression → expand to 100%
// Day 8:  Spike in escalation rate noticed → kill switch: 0% instantly
//         → Rollback in < 10 seconds with zero deployment

// Config in feature flag dashboard (no deployment needed):
// gpt-4o-rollout-percentage: 0  ← set this to instantly revert
```

---

## 6. Scale Evolution

**Prototype →** Simple boolean flag in application.yaml; restart to toggle.

**Production →** Unleash or LaunchDarkly for dynamic flags (no restart needed); user-level targeting; percentage rollouts; kill switch toggleable from dashboard.

**High scale →** Automated rollout: flag percentage auto-increases when quality metrics stay green for 24h; automatic rollback if escalation rate spikes > 2σ above baseline; A/B experiments tracked in data warehouse for statistical significance testing.

---

## 7. Company Relevance

| Company | Feature flag AI context | Interview signal |
|---------|------------------------|-----------------|
| Razorpay / PhonePe | Compliance risk in AI features — instant disable if regulatory issue | Kill switch described; escalation rate as primary metric |
| Swiggy / Meesho | New AI search feature — gradual rollout to avoid impacting conversion | Percentage rollout; CTR and add-to-cart as quality metrics alongside escalation |
| Adobe / Microsoft | Copilot-style features across product suite — model updates from Microsoft | Model A/B testing; per-product flag hierarchy |
| SAP Labs | Enterprise customer accountability — AI features must be opt-in, auditable | Per-tenant feature flags; audit log on every flag evaluation |

---

## 8. Interview Questions & Model Answers

### Q1 — How do you safely roll out a new LLM model or prompt version to production?
**Hruday:**
> "I treat AI model and prompt changes like code deployments — they go through a staged rollout with quality gates. First, I build in three feature flags: a kill switch, a model routing flag, and a prompt version flag. When switching from GPT-4o-mini to GPT-4o, I set the model routing flag to send 5% of users to GPT-4o while 95% stay on the baseline. I monitor AI-specific quality metrics — escalation rate (user abandoned the chatbot and called support), negative feedback rate, and session abandonment — not just error rate, because quality regressions don't show up as exceptions. If metrics hold for 24-48 hours, I expand to 25%, then 100%. If escalation rate spikes, I flip the flag back to baseline in under 10 seconds with no deployment. This saved us once when a model update at the provider silently changed its format for structured output, causing our extraction pipeline to parse incorrectly — we rolled back before users noticed, while the engineering team fixed the extraction schema."

---

*Part 22 · Feature Flags for AI Rollout — Safe Canary + A/B Testing · Full Stack Interview Guide · Hruday D · 2026*
