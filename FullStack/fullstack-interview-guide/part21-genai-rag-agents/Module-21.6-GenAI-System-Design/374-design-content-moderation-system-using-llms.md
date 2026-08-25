# Design a Content Moderation System Using LLMs
> Part 21 — Generative AI for Full Stack Engineers · GenAI System Design
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Three-tier moderation pipeline**: (1) fast blocklist check (< 1ms, regex/in-memory set for known slurs, spam patterns); (2) LLM classification (< 500ms, GPT-4o-mini, structured output with category + confidence + reason); (3) human review queue (for LLM-uncertain cases and all CRITICAL flagged content)
- **LLM moderation structured output**: `ContentDecision(action: ALLOW|REVIEW|BLOCK, categories: List<String>, confidence: double, reason: String)` — precise, actionable, auditable; never trust string parsing of moderation response
- **Tier the model by content risk**: public comments → GPT-4o-mini (fast, cheap, good enough); verified purchase reviews → GPT-4o (higher accuracy where fraud matters); user profile bios → GPT-4o-mini with higher REVIEW threshold; the right model for the right risk tier
- **False positive cost is real**: blocking legitimate content is user-hostile and damages trust; REVIEW threshold should be wide (confidence 0.6-0.85 → go to human); only high-confidence (> 0.85) goes straight to BLOCK; combined human+AI accuracy beats either alone
- **At scale, LLM moderation is not synchronous for upload**: submit content → queue (Kafka) → LLM moderation job → decision webhook → update content status; show content as "pending review" until decision; this avoids adding 500ms to every POST
- **Feedback loop**: human reviewers override LLM decisions; log all overrides with reason; sample 5% of high-confidence ALLOW decisions for spot-check; use override patterns to identify prompt drift and model quality issues

---

## 1. System Overview

**Use case**: Moderate user-generated content (comments, reviews, posts, profile images) on a consumer platform.

**Functional requirements:**
- Classify content as: safe / requires review / violates policy
- Support text and images (multimodal)
- Human review queue for uncertain/serious cases
- Appeal workflow with reversal mechanism
- Audit trail for every decision (compliance requirement)

---

## 2. Architecture

```
CONTENT MODERATION PIPELINE

Content Created (POST /api/posts, POST /api/reviews)
  → Immediate response: "Content submitted. Under review."
  → Publish to Kafka: "content-moderation-jobs"

Kafka Consumer (ContentModerationWorker)
  ↓
  Tier 1: Blocklist Check (in-memory)
    → Match? → BLOCK immediately (zero LLM cost for known violations)
    → No match? → continue
  ↓
  Tier 2: LLM Classification
    → Model: GPT-4o-mini for text, GPT-4o Vision for images
    → Structured output: ContentDecision
    → Confidence ≥ 0.85 + BLOCK: auto-block
    → Confidence ≥ 0.85 + ALLOW: auto-publish
    → Confidence 0.60-0.85 OR category=CSAM/VIOLENCE: human review queue
  ↓
  Decision applied:
    → auto-block: content status = BLOCKED, notif to user
    → auto-allow: content status = PUBLISHED
    → review: content status = PENDING_REVIEW → HumanReviewQueue

Human Review Queue (async, SLA: 4 hours for HIGH, 24h for MEDIUM)
  → Moderator dashboard (React)
  → Override options: ALLOW / BLOCK / ESCALATE
  → Every decision logged with moderator ID + reason + timestamp

Appeals Service
  → User submits appeal
  → Senior moderator review
  → Decision written to content_audit_log
```

---

## 3. LLM Moderation Implementation

```java
// Structured output for moderation decision
public record ContentDecision(
    String action,             // ALLOW, REVIEW, BLOCK
    List<String> categories,   // hate_speech, spam, violence, adult, harassment
    double confidence,         // 0.0–1.0
    String reason,             // Brief explanation for audit log
    boolean requiresHumanReview
) {}

@Service
public class LlmModerationService {

    private final ChatClient chatClient;
    
    private static final String MODERATION_PROMPT = """
        You are a content moderation classifier for a consumer platform.
        
        Evaluate the content for policy violations across these categories:
        - hate_speech: content targeting groups based on protected characteristics
        - harassment: targeted abuse or threats toward individuals
        - spam: commercial solicitation, gibberish, repetitive content
        - violence: graphic descriptions of real-world violence
        - adult: sexually explicit content
        - misinformation: dangerously false health/safety claims
        
        Return:
        - action: ALLOW (clearly safe), REVIEW (uncertain, needs human), BLOCK (clear violation)
        - categories: list of violated categories (empty for ALLOW)
        - confidence: 0.0-1.0 (how certain you are)
        - reason: one sentence explanation
        - requiresHumanReview: true if CSAM, violence, or confidence < 0.85
        
        Conservative approach: when uncertain, choose REVIEW over ALLOW or BLOCK.
        """;
    
    public ContentDecision classify(String content, String contentType) {
        String userMessage = """
            Content type: %s
            
            Content to evaluate:
            ---
            %s
            ---
            """.formatted(contentType, content);
        
        ContentDecision decision = chatClient.prompt()
            .system(MODERATION_PROMPT)
            .user(userMessage)
            .options(OpenAiChatOptions.builder()
                .withModel("gpt-4o-mini")
                .withTemperature(0.0)  // Deterministic for moderation
                .build())
            .call()
            .entity(ContentDecision.class);
        
        // Audit log every LLM moderation decision
        auditLog.record(new ModerationAuditEntry(
            content.hashCode(), 
            decision.action(), 
            decision.confidence(),
            decision.reason(),
            "gpt-4o-mini",
            Instant.now()
        ));
        
        return decision;
    }
    
    // Image moderation (multimodal)
    public ContentDecision classifyImage(byte[] imageBytes, String contentType) {
        // Encode image as base64 for multimodal LLM call
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        
        UserMessage userMessage = new UserMessage(
            "Evaluate this image for policy violations.",
            List.of(new Media(MimeTypeUtils.IMAGE_JPEG, base64Image))
        );
        
        return chatClient.prompt()
            .system(MODERATION_PROMPT)
            .messages(List.of(userMessage))
            .options(OpenAiChatOptions.builder().withModel("gpt-4o").build())  // Vision model
            .call()
            .entity(ContentDecision.class);
    }
}
```

---

## 4. Tier 1 — Fast Blocklist (Pre-LLM)

```java
@Component
@PostConstruct
public class BlocklistCheck {

    // In-memory: bloom filter or Set for exact matches
    // Source: internal blocklist + external industry lists (e.g., Stop CSAM Foundation)
    private Set<String> exactBlocks;
    private List<Pattern> regexPatterns;
    
    public boolean isHardBlock(String content) {
        String normalized = content.toLowerCase().replaceAll("[^a-z0-9 ]", "");
        
        // Fast exact match
        for (String blocked : exactBlocks) {
            if (normalized.contains(blocked)) return true;
        }
        
        // Regex for patterns (URLs, phone numbers in prohibited context)
        for (Pattern pattern : regexPatterns) {
            if (pattern.matcher(content).find()) return true;
        }
        
        return false;
    }
}
```

---

## 5. Wrong Way vs Right Way

```java
// ❌ Synchronous moderation on content creation — adds 500ms to every POST
@PostMapping("/posts")
public Post createPost(@RequestBody PostRequest req) {
    ContentDecision decision = llmModeration.classify(req.content(), "post");
    if ("BLOCK".equals(decision.action())) throw new ContentBlockedException();
    return postRepository.save(new Post(req.content()));
    // → 500ms added to every post creation
}

// ❌ No human review tier — LLM makes all decisions
// → Every borderline case incorrectly handled
// → No appeal process possible
// → Regulatory compliance risk (many jurisdictions require human oversight for AI content decisions)
```

```java
// ✅ Async pipeline: submit, queue, moderate, update status
@PostMapping("/posts")
public ResponseEntity<PostResponse> createPost(@RequestBody PostRequest req) {
    Post post = postRepository.save(new Post(req.content(), PostStatus.PENDING));
    kafkaProducer.send("content-moderation-jobs", post.id(), req.content());
    return ResponseEntity.ok(new PostResponse(post.id(), "Content submitted. Under review."));
    // → < 10ms response; moderation happens asynchronously
}
```

---

## 6. Scale Evolution

**Prototype →** Synchronous LLM moderation on content creation; no human review tier; structured output stored.

**Production →** Kafka async pipeline; 3-tier (blocklist → LLM → human) moderation; moderator dashboard; confidence-based routing; audit log.

**High scale →** Dedicated moderation service (isolated from main platform); GPT-4o-mini for low-risk content types with 10× cost reduction; on-call escalation for CSAM/violence (immediate alert, SLA minutes not hours); multi-language support with language detection before moderation; regional compliance rules (GDPR, local legal requirements) as metadata filters.

---

## 7. Company Relevance

| Company | Moderation context | Interview signal |
|---------|--------------------|-----------------|
| Razorpay / PhonePe | Merchant business names, support tickets, promotional message text | Spam/phishing detection per merchant; blocklist for fraudulent URLs |
| Swiggy / Meesho | Seller product listings, buyer reviews, in-chat messages | Scale: millions of reviews/day; async pipeline; human review for borderline |
| Adobe / Microsoft | Stock image platform, user profile bios, community posts | Image moderation via GPT-4o Vision; CSAM instant escalation |
| SAP Labs | Enterprise tool — B2B content (partner communications, public forums) | Lower false positive tolerance; human review SLA; GDPR audit trail |

---

## 8. Interview Questions & Model Answers

### Q1 — How would you design an AI content moderation system?
**Hruday:**
> "Three tiers. First, an in-memory blocklist catches known violations in under a millisecond with zero LLM cost — this handles 5-10% of violations immediately. Second, for everything else, an async LLM classifier (GPT-4o-mini) returns structured output: action, categories, confidence, and reason. I use temperature=0 for deterministic moderation. High-confidence BLOCK (> 0.85) auto-blocks; high-confidence ALLOW auto-publishes; everything in the middle and all serious categories (CSAM, violence) go to a human review queue with a 4-hour SLA. This is critical — human oversight for uncertain cases is both better for accuracy and often legally required. Every LLM decision is logged to an audit table with the content hash, model used, confidence, and reason to support appeals and compliance reviews. The whole pipeline is asynchronous via Kafka — content submission returns instantly, content appears after the moderation decision comes back asynchronously and updates the status."

---

*Part 21 · Design a Content Moderation System Using LLMs · Full Stack Interview Guide · Hruday D · 2026*
