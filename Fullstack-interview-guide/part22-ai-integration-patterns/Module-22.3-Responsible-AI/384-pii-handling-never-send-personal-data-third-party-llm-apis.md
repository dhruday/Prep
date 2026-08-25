# PII Handling — Never Send Personal Data to Third-Party LLM APIs
> Part 22 — AI Integration Patterns · Responsible AI
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The core rule**: never send identifiable personal data to a third-party LLM API (OpenAI, Anthropic, Gemini hosted externally); once it leaves your infra, you lose control; GDPR and India's DPDP Act 2023 require a legal basis and data processing agreement for every third party you send personal data to — most LLM API terms do not satisfy this for production use
- **PII categories to never send**: full name + email combination, Aadhaar number (12-digit), PAN number (ABCDE1234F format), credit/debit card numbers, mobile numbers, GST numbers, date of birth + name combo, passport numbers, bank account numbers
- **Pseudonymisation**: replace actual values with consistent per-session tokens before sending to the LLM: `"Ravi Shankar's email ravi@example.com"` → `"PERSON_1's email EMAIL_1"` — the LLM can reason about the structure without seeing real data; de-anonymise in the response after receiving it
- **Microsoft Presidio**: production-grade open-source PII detection library; supports Indian PII types (Aadhaar, PAN, UPI IDs); built-in anonymisers for pseudonymisation and masking; call via Python process or its REST API from Java
- **Three options when you need real data procesing**: (1) Presidio pseudonymise → OpenAI → re-identify, (2) Azure OpenAI Service (data stays in your Azure tenant, no model training on your data), (3) Ollama / local model (data never leaves your infra)
- **Consent and minimisation**: send only the PII-free, minimum-necessary context to the LLM; if summarising a support ticket, extract the issue description only — not the user's profile data from the ticket metadata

---

## 1. One-Line Definition
PII handling in AI systems means detecting, stripping, and pseudonymising personal data before it reaches any third-party LLM API, and mapping it back in the response — keeping personal data inside your infrastructure at all times.

---

## 2. Why This Matters

```
WHAT HAPPENS WITHOUT PII HANDLING

User message: "My Aadhaar is 1234 5678 9012 and I'm having trouble 
               with my KYC verification. Help me fix this."

→ Your app sends the Aadhaar number verbatim to OpenAI API
→ Sent over the internet to US-based servers
→ May be used in model training (depends on terms; Data Processor agreement needed)
→ DPDP Act 2023 violation — no consent, no DPA, sensitive personal data
→ GDPR violation if EU users affected
→ Regulatory fine risk; reputational damage if breach occurs
```

---

## 3. Indian PII Type Reference

```java
public enum PiiType {
    // India-specific high risk (reject on detection — never send to LLM)
    AADHAAR,         // \d{4}\s?\d{4}\s?\d{4}
    PAN_NUMBER,      // [A-Z]{5}[0-9]{4}[A-Z]{1}
    CREDIT_CARD,     // standard Luhn-validated 16-digit
    BANK_ACCOUNT,    // 9-18 digit numeric
    PASSPORT,        // [A-Z]{1}[0-9]{7}
    
    // Medium risk (pseudonymise before sending)
    PHONE_NUMBER,    // Indian: [6-9]\d{9}
    EMAIL_ADDRESS,   // RFC 5322 pattern
    UPI_ID,          // \w+@\w+ (UPI VPA format)
    FULL_NAME,       // NER-based detection
    DATE_OF_BIRTH,   // date pattern + context
    GST_NUMBER,      // \d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}
    
    // Low risk (context-dependent; strip from LLM prompts)
    IP_ADDRESS,
    DEVICE_ID,
}
```

---

## 4. Presidio-Based PII Detection and Pseudonymisation

```python
# presidio_service.py — runs as a sidecar microservice
from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

from flask import Flask, request, jsonify

app = Flask(__name__)
analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

# Teach Presidio about Indian PII types
from presidio_analyzer import PatternRecognizer, Pattern

aadhaar_recognizer = PatternRecognizer(
    supported_entity="AADHAAR_NUMBER",
    patterns=[Pattern("Aadhaar", r"\d{4}\s?\d{4}\s?\d{4}", 0.85)]
)
pan_recognizer = PatternRecognizer(
    supported_entity="PAN_NUMBER",
    patterns=[Pattern("PAN", r"[A-Z]{5}[0-9]{4}[A-Z]{1}", 0.9)]
)
upi_recognizer = PatternRecognizer(
    supported_entity="UPI_ID",
    patterns=[Pattern("UPI", r"\w+[\.\w]*@\w+", 0.75)]
)

analyzer.registry.add_recognizer(aadhaar_recognizer)
analyzer.registry.add_recognizer(pan_recognizer)
analyzer.registry.add_recognizer(upi_recognizer)

@app.post("/presidio/analyse")
def analyse():
    text = request.json["text"]
    results = analyzer.analyze(text=text, language="en")
    return jsonify([{
        "entity_type": r.entity_type,
        "start": r.start,
        "end": r.end,
        "score": r.score
    } for r in results])

@app.post("/presidio/anonymise")
def anonymise():
    text = request.json["text"]
    session_id = request.json.get("sessionId", "default")
    
    results = analyzer.analyze(text=text, language="en")
    
    # Pseudonymise: PERSON_1, EMAIL_1 etc (consistent per session for correlated reasoning)
    counters = {}
    operators = {}
    for r in results:
        entity = r.entity_type
        if entity not in counters:
            counters[entity] = 0
        counters[entity] += 1
        operators[entity] = OperatorConfig(
            "replace", {"new_value": f"{entity}_{counters[entity]}"}
        )
    
    anonymised = anonymizer.anonymize(text=text, analyzer_results=results, operators=operators)
    
    return jsonify({
        "anonymised_text": anonymised.text,
        "mapping": {  # Return mapping so the caller can re-identify later
            item.operator_result.new_value: text[item.start:item.end]
            for item in anonymised.items
            if hasattr(item, 'operator_result')
        }
    })
```

```java
// Java service calling the Presidio sidecar
@Service
public class PiiHandlingService {

    private final WebClient presidioClient;
    
    public PiiHandlingService(@Value("${presidio.base-url}") String presidioBaseUrl) {
        this.presidioClient = WebClient.builder().baseUrl(presidioBaseUrl).build();
    }
    
    public record AnonymiseResult(String anonymisedText, Map<String, String> mapping) {}
    
    public AnonymiseResult anonymise(String text, String sessionId) {
        return presidioClient.post()
            .uri("/presidio/anonymise")
            .bodyValue(Map.of("text", text, "sessionId", sessionId))
            .retrieve()
            .bodyToMono(AnonymiseResult.class)
            .block(Duration.ofMillis(500));
    }
    
    public String reIdentify(String llmResponse, Map<String, String> mapping) {
        String result = llmResponse;
        for (Map.Entry<String, String> entry : mapping.entrySet()) {
            // Replace placeholder (e.g. PERSON_1) with original value in LLM output
            result = result.replace(entry.getKey(), entry.getValue());
        }
        return result;
    }
}
```

---

## 5. Full PII-Safe LLM Call Flow

```java
@Service
public class PrivacyAwareAiService {

    private final PiiHandlingService piiHandler;
    private final ChatClient chatClient;
    
    public String processWithPiiSafety(String userInput, String systemPrompt, String userId) {
        // Step 1 — Anonymise before sending to LLM
        AnonymiseResult anonymised = piiHandler.anonymise(userInput, userId);
        
        // Step 2 — Call LLM with anonymised input only
        String rawResponse = chatClient.prompt()
            .system(systemPrompt)
            .user(anonymised.anonymisedText()) // LLM never sees real PII
            .call()
            .content();
        
        // Step 3 — Re-identify in response if needed
        String finalResponse = piiHandler.reIdentify(rawResponse, anonymised.mapping());
        
        return finalResponse;
    }
}
```

---

## 6. Wrong Way vs Right Way

```java
// ❌ Full user profile context dumped into LLM prompt
@Service
public class SupportService {
    public String generateResponse(SupportTicket ticket) {
        String context = String.format(
            "User: %s, Email: %s, Aadhaar: %s, Phone: %s — Issue: %s",
            ticket.getUserName(),
            ticket.getEmail(),
            ticket.getAadhaar(),  // ← Aadhaar to OpenAI API: DPDP Act violation
            ticket.getPhone(),
            ticket.getIssueDescription()
        );
        return chatClient.prompt().user(context).call().content();
    }
}
```

```java
// ✅ Extract only the minimum-necessary, PII-free context
@Service
public class SupportService {
    private final PiiHandlingService piiHandler;
    
    public String generateResponse(SupportTicket ticket, String agentId) {
        // Send only the issue description — not user profile data at all
        // Apply pseudonymisation in case the user mentioned their own PII in the text
        AnonymiseResult anonymised = piiHandler.anonymise(
            ticket.getIssueDescription(), agentId);
        
        String response = chatClient.prompt()
            .system("You are a support assistant. Help resolve the following issue.")
            .user(anonymised.anonymisedText())
            .call()
            .content();
        
        return piiHandler.reIdentify(response, anonymised.mapping());
    }
}
```

---

## 7. Data Residency Options

```
When your use case REQUIRES real data processing (not pseudonymisable):

Option 1: Azure OpenAI Service
  → Data stays in your Azure tenant (EU, India regions available)
  → No model training on customer data (by contract)
  → Same OpenAI models, same API shape
  → spring.ai.azure.openai.* configuration; no code changes vs openai.*
  → Best for: enterprise, GDPR-required, financial data

Option 2: Ollama (local model)
  → Data never leaves your infrastructure
  → Models: Llama 3.1 8B (good for structured tasks), Llama 3.1 70B (GPT-4 quality)
  → spring.ai.ollama.* configuration
  → Best for: highly sensitive data, regulated industries, air-gapped environments

Option 3: Presidio pseudonymise → OpenAI → re-identify
  → Use standard OpenAI but strip all PII first
  → Lower accuracy for tasks requiring real names/context
  → Best for: general summarisation, classification, where context not identity matters
```

---

## 8. Scale Evolution

**Prototype →** Regex-based PII detection for Aadhaar, PAN, phone, email in the Java service.

**Production →** Presidio sidecar with Indian PII recognisers; pseudonymisation with session-scoped consistent mapping; Azure OpenAI for features handling sensitive financial or healthcare data.

**High scale →** Presidio as a shared PII gateway service (all AI calls route through it); caching anonymisation results per session turn; async anonymisation on non-blocking path; PII detection audit log separate from AI audit log; DPDP Act 2023 consent records linked to each AI interaction.

---

## 9. Company Relevance

| Company | PII context | Interview signal |
|---------|-----------|-----------------|
| Razorpay / PhonePe | Payment data — card numbers, bank accounts, UPI IDs; RBI regulations | Aadhaar/PAN patterns; PCI-DSS + DPDP compliance; Azure OpenAI for PII-sensitive transactions |
| Swiggy / Meesho | Delivery address, phone number in support chat context | Presidio pseudonymisation; minimum-necessary context (issue only, not full profile) |
| Adobe / Microsoft | Document processing — contracts with employee PII, customer records | Consent before AI processing; local model option for enterprise contracts |
| SAP Labs | Enterprise HR/Finance AI — salary data, employee IDs, org hierarchy | GDPR compliance for EU clients; Azure OpenAI with EU region; DPA with data controller clients |

---

## 10. Interview Questions & Model Answers

### Q1 — How do you ensure PII is not sent to a third-party LLM API?
**Hruday:**
> "I apply a two-stage process. First, I extract only the minimum-necessary context — for a support chat use case, I pass only the issue description, not the user's profile data. Second, I run that extracted text through Microsoft Presidio, which is an open-source PII detection and anonymisation library. Presidio supports Indian PII types out of the box with some custom recognisers for Aadhaar and PAN. It replaces each detected entity with a consistent per-session placeholder like `PERSON_1` or `EMAIL_1`. The LLM receives the pseudonymised text, reasons over it, and returns a response that also uses the placeholders. I then re-identify in the response by substituting placeholders back with the real values. This way, the OpenAI API never sees actual personal data. For features that absolutely require real data — like handling a financial transaction — I switch to Azure OpenAI, where the data stays inside our Azure tenant and there's no model training on customer data. This satisfies both GDPR for European clients and India's DPDP Act 2023 for domestic users."

---

*Part 22 · PII Handling — Never Send Personal Data to Third-Party LLM APIs · Full Stack Interview Guide · Hruday D · 2026*
