# Structured Output from LLMs — JSON Mode, Schema Enforcement
> Part 21 — Generative AI for Full Stack Engineers · Building AI APIs
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The problem**: LLMs produce free-text by default — parsing it with regex or `String.split()` is fragile and breaks the moment the model rephrases; structured output is the production solution
- **Three structured output levels**: (1) JSON mode — model promises valid JSON but you define nothing; (2) JSON Schema — you provide a schema, model guarantees it matches; (3) `entity()` — Spring AI maps directly to a Java record/class; always prefer level 3 in Java code
- **Spring AI `.call().entity(MyClass.class)`**: Spring AI adds the JSON schema of `MyClass` to the prompt automatically, sets response format to JSON, and uses Jackson to deserialise; one line replaces schema generation + JSON parsing + exception handling
- **Always validate after deserialisation**: even with JSON mode a model can produce `null` for required fields or numbers outside valid range; apply Bean Validation (`@NotNull`, `@Min`, `@Max`) after mapping; never pass raw LLM output to business logic unchecked
- **`ResponseFormat.JSON_OBJECT`** in OpenAI options forces valid JSON but not a specific schema; `ResponseFormat.JSON_SCHEMA` (OpenAI o1/GPT-4o) enforces the exact schema with 99%+ reliability
- **Few-shot examples in the prompt beat schema alone**: include 1-2 example JSON outputs in the system prompt to show the model the exact format you expect; this reduces hallucinated field names and format drift

---

## 1. One-Line Definition
Structured output makes LLMs return valid JSON matching a defined schema, enabling type-safe Java record mapping via Spring AI's `entity()` — eliminating fragile string parsing from AI-powered features.

---

## 2. Output Reliability Spectrum

| Approach | Reliability | Code effort | Best for |
|----------|------------|-------------|----------|
| Free text + regex parsing | 60-70% | High | Prototyping only |
| JSON mode (valid JSON, any structure) | 90% | Medium | Simple extraction |
| JSON Schema enforcement | 95-98% | Low | Structured extraction in production |
| Spring AI `.entity(Class)` | 95-98% | Minimal | Java backends (Spring AI handles schema + parsing) |
| JSON Schema + few-shot examples | 98-99%+ | Low | Complex nested structures |

---

## 3. Spring AI entity() — Simplest Production Approach

```java
// Define what you want extracted
public record OrderExtraction(
    String customerId,
    List<LineItem> items,
    String shippingAddress,
    String urgency  // LOW, MEDIUM, HIGH
) {
    public record LineItem(
        String productName,
        int quantity,
        double unitPriceInr
    ) {}
}

@Service
public class OrderExtractionService {

    private final ChatClient chatClient;
    
    public OrderExtractionService(ChatClient.Builder builder) {
        this.chatClient = builder
            .defaultSystem("""
                You extract order details from natural language messages.
                
                Example output:
                {
                  "customerId": "CUST-123",
                  "items": [{"productName": "Laptop Stand", "quantity": 2, "unitPriceInr": 1499.0}],
                  "shippingAddress": "123 MG Road, Bangalore 560001",
                  "urgency": "MEDIUM"
                }
                
                For urgency: HIGH if next-day, MEDIUM if within a week, LOW otherwise.
                Return null for customerId if not mentioned.
                """)
            .build();
    }
    
    public OrderExtraction extract(String userMessage) {
        OrderExtraction extraction = chatClient.prompt()
            .user(userMessage)
            .call()
            .entity(OrderExtraction.class);  // Spring AI: schema + parse + deserialise
        
        // Always validate after LLM extraction
        validateExtraction(extraction);
        return extraction;
    }
    
    private void validateExtraction(OrderExtraction e) {
        if (e.items() == null || e.items().isEmpty()) {
            throw new ExtractionException("No line items found in extraction");
        }
        e.items().forEach(item -> {
            if (item.quantity() <= 0 || item.unitPriceInr() < 0) {
                throw new ExtractionException("Invalid quantity or price in extracted item");
            }
        });
    }
}
```

---

## 4. Manual JSON Schema in OpenAI Options

```java
// When you need strict schema enforcement via OpenAI's JSON Schema mode
@Bean
public ChatOptions strictOrderOptions() {
    String schema = """
        {
          "type": "object",
          "properties": {
            "sentiment": {"type": "string", "enum": ["POSITIVE", "NEUTRAL", "NEGATIVE"]},
            "score": {"type": "number", "minimum": 0, "maximum": 10},
            "summary": {"type": "string", "maxLength": 200},
            "actionRequired": {"type": "boolean"}
          },
          "required": ["sentiment", "score", "summary", "actionRequired"]
        }
        """;
    
    return OpenAiChatOptions.builder()
        .withModel("gpt-4o-mini")
        .withResponseFormat(new ResponseFormat(ResponseFormat.Type.JSON_SCHEMA, schema))
        .build();
}
```

---

## 5. Wrong Way vs Right Way

```java
// ❌ String parsing — breaks on any rephrasing by the model
String response = chatClient.prompt()
    .user("Extract the price from: " + text)
    .call()
    .content();
// "The price is 1499 INR" → split on "is "... breaks on "costs 1499" or "₹1499"
String price = response.split("is ")[1].trim();
```

```java
// ❌ Regex on free LLM output — false confidence, real fragility
Pattern p = Pattern.compile("\\d+(\\.\\d+)?");
Matcher m = p.matcher(response);
double price = m.find() ? Double.parseDouble(m.group()) : 0;
// Breaks on "around 1500" → extracts "1500" but was approximate
```

```java
// ✅ entity() — type-safe, reliable, zero custom parsing code
public record PriceExtraction(
    double amountInr,
    boolean isApproximate,
    String currency
) {}

PriceExtraction result = chatClient.prompt()
    .user("Extract the price from: " + text)
    .call()
    .entity(PriceExtraction.class);
// → PriceExtraction(amountInr=1499.0, isApproximate=false, currency="INR")
```

---

## 6. Batch Extraction Pattern

```java
// Extract structured data from multiple documents efficiently
@Service
public class BatchExtractionService {

    private final ChatClient chatClient;
    
    // For large batches: use virtual threads for parallelism
    public List<ExtractedData> extractBatch(List<String> documents) {
        return documents.stream()
            .parallel()  // Virtual threads handle blocking LLM calls
            .map(this::extractOne)
            .toList();
    }
    
    private ExtractedData extractOne(String document) {
        try {
            return chatClient.prompt()
                .user(document)
                .call()
                .entity(ExtractedData.class);
        } catch (Exception e) {
            log.warn("Extraction failed for document: {}", document.substring(0, 50), e);
            return ExtractedData.empty(); // Graceful degradation
        }
    }
}
```

---

## 7. Scale Evolution

**Prototype →** `entity(MyClass.class)` with simple flat records; log raw LLM responses for debugging extraction quality.

**Production →** Bean Validation on extracted records; `@NotNull` / `@Min` / `@Size` annotations; fallback to empty/default result on extraction failure; extraction success rate tracked via Micrometer.

**High scale →** Few-shot examples tuned per domain (order extraction, sentiment analysis, entity tagging); schema versioned alongside prompt version; A/B test prompt versions with extraction accuracy metric; evaluate periodically as model updates can shift extraction behaviour.

---

## 8. Company Relevance

| Company | Structured output use case | Interview signal |
|---------|--------------------------|-----------------|
| Razorpay / PhonePe | Extract payment narrative, intent classification, fraud signal extraction | entity() for payment intent + Bean Validation before any financial action |
| Swiggy / Meesho | Extract product attributes, delivery preferences, complaint classification | Batch extraction for catalogue enrichment; confidence score field |
| Adobe / Microsoft | Document analysis, metadata extraction from uploaded files | JSON Schema strict mode for document properties extraction |
| SAP Labs | GL code suggestion from invoice narrative, vendor classification | Enum field + confidence score record; human review below threshold |

---

## 9. Interview Questions & Model Answers

### Q1 — How do you make LLM output reliable enough for a business process?
**Hruday:**
> "I always use structured output. In Spring AI, `.call().entity(MyClass.class)` generates the JSON schema from the Java record, adds it to the prompt, and maps the response with Jackson — one line replaces all the fragile string parsing. But schema alone isn't enough: I annotate the record with `@NotNull`, `@Min`, `@Max`, and validate after deserialisation before any business logic runs. For the extraction prompts, I include 1-2 few-shot examples of valid output — this significantly reduces format drift as the model updates. If extraction confidence is critical, I add a `confidenceScore` double to the record and route anything below 0.7 to a human review queue rather than auto-processing."

---

*Part 21 · Structured Output from LLMs — JSON Mode, Schema Enforcement · Full Stack Interview Guide · Hruday D · 2026*
