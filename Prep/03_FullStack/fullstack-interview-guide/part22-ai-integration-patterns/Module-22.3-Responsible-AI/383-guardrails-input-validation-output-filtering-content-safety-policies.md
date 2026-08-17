# Guardrails — Input Validation, Output Filtering, Content Safety Policies
> Part 22 — AI Integration Patterns · Responsible AI
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Guardrails are the safety layer around LLM calls**: they validate input before the LLM sees it, and validate output before it reaches the user; LLMs are probabilistic — a 99.9% safe model still generates harmful output 1 in 1,000 times at scale; guardrails catch the edge cases
- **Input guardrails**: length limits (prevent token bombing), injection pattern detection, content safety classification (offensive/illegal intent detection), PII detection (stop PII from reaching the LLM API), topic scope enforcement (off-topic request → redirect, don't answer)
- **Output guardrails**: PII leak detection (LLM reproducing PII from its context window), system prompt leak detection, hallucinated claim detection (confidence threshold), content policy check on the output, length sanity check (output much shorter than expected → likely truncated)
- **Azure AI Content Safety and OpenAI Moderation API**: managed content safety services; Azure's analysis returns severity scores per harm category (hate, violence, sexual, self-harm) at 4 severity levels; add these as a pre-filter for public-facing AI features; ~$1 per 1,000 calls
- **Topic scope enforcement is under-valued**: without it, a customer support chatbot can be used to generate marketing copy, write code, or answer political questions — all wasting API costs and potentially creating liability; reject off-topic queries with a clear redirect message
- **Layered defence beats one deep layer**: input guard + model safety instructions + output guard; three layers each at 99% effectiveness = 99.9997% coverage

---

## 1. One-Line Definition
AI guardrails are the validation layers before and after LLM calls that prevent harmful input from reaching the model and harmful output from reaching users — implementing content safety policies as code.

---

## 2. Guardrail Layers

```
REQUEST FLOW WITH FULL GUARDRAILS

User input
  ↓
INPUT GUARDRAILS (before LLM)
  ├── Length check (max 4000 chars → reject if exceeded)
  ├── PII detection (scan for email, phone, Aadhaar, PAN → strip or reject)
  ├── Injection pattern check (regex + known attack phrases)
  ├── Content safety check (Azure AI Content Safety / OpenAI Moderation)
  └── Topic scope check (is query related to this feature's allowed domain?)
         Not in scope → redirect message (no LLM call)
  ↓
LLM CALL (with safety system prompt instructions)
  ↓
OUTPUT GUARDRAILS (before user sees response)
  ├── System prompt leak detection (reject if output contains prompt text)
  ├── PII reproduction check (reject if output contains PII found in input)
  ├── Confidence threshold check (if model flags uncertainty → add disclaimer)
  ├── Length sanity check (< 10 tokens for a question expecting 200 → flag)
  └── Content safety check on output (optional, adds ~50ms)
```

---

## 3. Input Guardrail Implementation

```java
@Service
public class InputGuardrailService {

    private final ContentSafetyClient contentSafetyClient;
    private final PiiDetectionService piiDetector;
    private final TopicScopeConfig topicConfig;
    
    private static final int MAX_INPUT_LENGTH = 4000;
    
    private static final List<Pattern> INJECTION_PATTERNS = List.of(
        Pattern.compile("ignore (all |previous )?instructions?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(you are now|act as|pretend (to be|you are))", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(reveal|output|print) (your|the)? system prompt", Pattern.CASE_INSENSITIVE),
        Pattern.compile("developer mode|DAN mode|jailbreak", Pattern.CASE_INSENSITIVE)
    );
    
    public GuardrailResult validate(String input, String featureId, String userId) {
        // 1. Length check
        if (input.length() > MAX_INPUT_LENGTH) {
            return GuardrailResult.blocked("INPUT_TOO_LONG", 
                "Message exceeds maximum length. Please shorten your request.");
        }
        
        // 2. PII detection — strip or reject
        PiiDetectionResult pii = piiDetector.detect(input);
        if (pii.containsHighRiskPii()) {
            log.warn("High-risk PII detected in input. userId={} featureId={}", userId, featureId);
            return GuardrailResult.blocked("PII_DETECTED",
                "Please do not include personal information like Aadhaar or PAN numbers.");
        }
        String sanitisedInput = piiDetector.strip(input); // Remove low-risk PII
        
        // 3. Injection pattern check
        for (Pattern pattern : INJECTION_PATTERNS) {
            if (pattern.matcher(input).find()) {
                log.warn("Injection attempt detected. userId={}", userId);
                return GuardrailResult.blocked("INJECTION_ATTEMPT",
                    "That type of message is not supported.");
            }
        }
        
        // 4. Content safety check (async-friendly; add latency budget)
        ContentSafetyResult safety = contentSafetyClient.analyse(sanitisedInput);
        if (safety.hasHighSeverityViolation()) {
            log.warn("Content safety violation. userId={} categories={}", 
                userId, safety.violatedCategories());
            return GuardrailResult.blocked("CONTENT_POLICY",
                "This type of content is not permitted.");
        }
        
        // 5. Topic scope enforcement
        if (!topicConfig.isInScope(sanitisedInput, featureId)) {
            return GuardrailResult.outOfScope(
                "I'm specialised in " + topicConfig.getScopeDescription(featureId) + 
                ". For other questions, please contact support directly.");
        }
        
        return GuardrailResult.allowed(sanitisedInput); // Return sanitised input for LLM
    }
}

public record GuardrailResult(
    boolean allowed,
    boolean blocked,
    boolean outOfScope,
    String blockReason,        // Internal code (for logging)
    String userMessage,        // External message (shown to user)
    String sanitisedInput      // Cleaned input (if allowed)
) {}
```

---

## 4. Output Guardrail Implementation

```java
@Service
public class OutputGuardrailService {

    // Secret marker to detect system prompt leakage
    private static final String SYSTEM_PROMPT_CANARY = "GUARDRAIL-CANARY-TOKEN";
    
    public GuardrailResult validateOutput(String llmOutput, String context, String userId) {
        // 1. System prompt leak check
        if (llmOutput.contains(SYSTEM_PROMPT_CANARY) 
                || llmOutput.toLowerCase().contains("my system prompt")) {
            log.error("SECURITY: System prompt leaked in output. userId={}", userId);
            return GuardrailResult.blocked("SYSTEM_PROMPT_LEAK",
                "I'm unable to share that information.");
        }
        
        // 2. PII reproduction check
        // If any PII from context was reproduced verbatim in output, reject
        if (piiDetector.detectHighRisk(llmOutput).hasMatches()) {
            log.warn("PII reproduced in LLM output. userId={}", userId);
            return GuardrailResult.blocked("PII_IN_OUTPUT",
                "I encountered an issue generating a safe response. Please try again.");
        }
        
        // 3. Length sanity check
        if (llmOutput.trim().length() < 5) {
            log.warn("Suspiciously short LLM output: '{}'", llmOutput);
            return GuardrailResult.blocked("TRUNCATED_OUTPUT",
                "Response was incomplete. Please try again.");
        }
        
        return GuardrailResult.allowed(llmOutput);
    }
}
```

---

## 5. Topic Scope Configuration

```yaml
# application.yaml — allowed topics per feature
ai-guardrails:
  topic-scope:
    support_chat:
      description: "order tracking, returns, refunds, product questions"
      keyword-hints: ["order", "refund", "return", "product", "delivery", "shipping"]
      embed-based-scope: true
      scope-embedding-threshold: 0.55  # query must be semantically close to support topics
    
    code_explain:
      description: "Java, Spring Boot, React code explanation"
      keyword-hints: ["code", "function", "class", "error", "java", "spring", "react"]
    
    doc_summary:
      description: "document summarisation only"
      # Accept everything since user provides the document — scope is implicit
      accept-all: true
```

---

## 6. Wrong Way vs Right Way

```java
// ❌ No input validation — raw user input directly to LLM
@PostMapping("/chat")
public String chat(@RequestBody String message) {
    return chatClient.prompt().user(message).call().content();
    // → Injection attacks succeed
    // → PII sent to OpenAI API violating data agreements
    // → Off-topic abuse: using support chatbot as a code generator
    // → Token bombing: 100,000 character message exhausts daily budget
}
```

```java
// ✅ Full guardrail stack around every LLM call
@PostMapping("/chat")
public ResponseEntity<ChatResponse> chat(
    @RequestBody ChatRequest req, @AuthenticationPrincipal UserDetails user
) {
    GuardrailResult inputCheck = inputGuardrails.validate(
        req.message(), req.featureId(), user.getUsername());
    
    if (!inputCheck.allowed()) {
        return ResponseEntity.ok(ChatResponse.blocked(inputCheck.userMessage()));
    }
    
    String rawOutput = chatClient.prompt()
        .system(systemPrompt)
        .user(inputCheck.sanitisedInput())
        .call().content();
    
    GuardrailResult outputCheck = outputGuardrails.validateOutput(
        rawOutput, req.message(), user.getUsername());
    
    String finalOutput = outputCheck.allowed() ? rawOutput : outputCheck.userMessage();
    return ResponseEntity.ok(ChatResponse.ok(finalOutput));
}
```

---

## 7. Scale Evolution

**Prototype →** Length check + injection pattern regex + system prompt canary.

**Production →** Azure AI Content Safety or OpenAI Moderation API as pre-filter; PII detection; topic scope enforcement per feature; Micrometer counters on block reasons.

**High scale →** Async content safety on non-blocking path (latency budget 80ms); custom fine-tuned classifier for domain-specific policy (faster, cheaper than full moderation API); real-time policy rule updates without deployment (policy rules in DB, reloaded on change event); SIEM integration for security events.

---

## 8. Company Relevance

| Company | Guardrail context | Interview signal |
|---------|-----------------|-----------------|
| Razorpay / PhonePe | Financial AI — off-topic queries (code generation) waste budget; PII critical | Topic scope enforcement for financial domain; PII detection for Aadhaar/PAN |
| Swiggy / Meesho | Consumer app — content safety for user-generated AI features | Azure AI Content Safety pre-filter; hate/spam categories |
| Adobe / Microsoft | Creative AI — sensitive content generation must be controlled | Output guardrail for adult content; SafeSearch-style threshold |
| SAP Labs | Enterprise — compliance with data processing agreements | DPA-compliant PII detection before any OpenAI API call; audit every blocked input |

---

## 9. Interview Questions & Model Answers

### Q1 — How do you implement guardrails for an LLM-powered feature?
**Hruday:**
> "I build two validation layers — one before and one after the LLM call. Before the call: length check to prevent token bombing, PII detection to strip or reject personal data before it leaves our infrastructure, injection pattern scanning via regex on known phrases, content safety classification via Azure AI Content Safety or OpenAI Moderation API for harmful intent detection, and topic scope enforcement to redirect off-topic queries without using an LLM call at all. After the call: system prompt leak detection using a canary token embedded in the system prompt, PII reproduction check to catch the model regurgitating personal data from the context window, and a length sanity check for suspiciously truncated responses. The system prompt canary is a unique token I embed — if it appears in the output, the model leaked its instructions and I replace the output with a safe fallback. Every block has a reason code logged internally for security monitoring, and a user-facing message that's informative but doesn't reveal the detection mechanism."

---

*Part 22 · Guardrails — Input Validation, Output Filtering, Content Safety Policies · Full Stack Interview Guide · Hruday D · 2026*
