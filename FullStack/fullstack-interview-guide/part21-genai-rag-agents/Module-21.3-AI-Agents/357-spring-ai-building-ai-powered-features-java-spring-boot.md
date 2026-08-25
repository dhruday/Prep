# Spring AI — Building AI-Powered Features in Java and Spring Boot
> Part 21 — Generative AI for Full Stack Engineers · AI Agents
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Spring AI is the Java-native LLM framework**: it's the equivalent of LangChain for Python, built by the Spring team (VMware Broadcom), designed to integrate naturally with Spring Boot's dependency injection, autoconfiguration, and existing infrastructure
- **Three core abstractions**: `ChatClient` (LLM calls + agents + streaming), `EmbeddingModel` (text → vector), `VectorStore` (semantic search) — all are interfaces; implementations swap via configuration, not code; this is the key advantage for production systems
- **`ChatClient` handles the full agent loop**: set system prompt, user message, tools, and `maxIterations` — Spring AI runs the ReAct loop internally; you don't implement the loop yourself
- **`@Tool` / `@ToolParam` annotations** turn any Spring bean method into an agent-callable function; Spring AI generates the JSON Schema from the method signature and registers it automatically; simplest possible function calling API
- **Provider portability**: OpenAI, Anthropic Claude, Google Gemini, Ollama (local), Azure OpenAI, Amazon Bedrock — all behind the same `ChatClient` and `VectorStore` interfaces; one codebase, multiple backend providers
- **Spring AI + observability**: auto-instrumented with Micrometer; LLM call metrics (tokens, latency, model name) and vector store metrics (query latency, result count) flow into your existing Spring observability stack (Prometheus + Grafana) with no additional code

---

## 1. One-Line Definition
Spring AI is the Spring Boot native framework for integrating LLMs, embedding models, and vector stores into Java applications, providing ChatClient, EmbeddingModel, and VectorStore abstractions with first-class Spring Boot autoconfiguration and provider portability.

---

## 2. Setup

```xml
<!-- pom.xml — complete RAG + Agent stack -->
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.ai</groupId>
      <artifactId>spring-ai-bom</artifactId>
      <version>1.0.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>

<dependencies>
  <!-- LLM: OpenAI (swap for anthropic-spring-boot-starter or ollama-spring-boot-starter) -->
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
  </dependency>
  
  <!-- Vector Store: pgvector (swap for pinecone-store-spring-boot-starter) -->
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-pgvector-store-spring-boot-starter</artifactId>
  </dependency>
  
  <!-- Postgres driver for pgvector -->
  <dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
  </dependency>
</dependencies>
```

```yaml
# application.yaml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-4o-mini
          temperature: 0.0
      embedding:
        options:
          model: text-embedding-3-small
    vectorstore:
      pgvector:
        dimensions: 1536
        distance-type: COSINE_DISTANCE
        index-type: HNSW
        initialize-schema: true
```

---

## 3. ChatClient — LLM Calls and Agents

```java
// Simple text generation
@Service
public class SummarisationService {

    // Spring AI auto-configures ChatClient via @Autowired
    private final ChatClient chatClient;
    
    // Constructor injection (preferred)  
    public SummarisationService(ChatClient.Builder builder) {
        this.chatClient = builder
            .defaultSystem("Summarise text in 3 key bullet points. Be concise.")
            .build();
    }
    
    public String summarise(String text) {
        return chatClient.prompt()
            .user(text)
            .call()
            .content();
    }
    
    // Structured output — response mapped to a Java record
    public SummaryWithTags summariseStructured(String text) {
        return chatClient.prompt()
            .user("Analyse this text: " + text)
            .call()
            .entity(SummaryWithTags.class);   // Spring AI uses JSON mode + Jackson
    }
}

// Java record for structured output
public record SummaryWithTags(
    String summary,
    List<String> keyTopics,
    String sentiment  // POSITIVE, NEUTRAL, NEGATIVE
) {}
```

---

## 4. @Tool — Agent-Callable Functions

```java
@Component
public class ProductTools {

    private final ProductRepository productRepository;
    private final InventoryService inventoryService;

    @Tool(description = """
        Search for products by keyword.
        Returns list of matching products with name, price (INR), and stock status.
        Use when the user is looking for a specific product or category.
        """)
    public List<ProductSummary> searchProducts(
        @ToolParam(description = "Search keyword or product name") 
        String query,
        
        @ToolParam(description = "Maximum number of results (default 5, max 20)")
        int limit
    ) {
        // Input validation (always validate before DB operations)
        int safeLimit = Math.min(Math.max(limit, 1), 20);
        return productRepository.search(query, safeLimit);
    }

    @Tool(description = """
        Check current stock level for a specific product ID.
        Returns stock count and estimated restock date if out of stock.
        """)
    public StockInfo checkStock(
        @ToolParam(description = "Product ID (UUID format)")
        String productId
    ) {
        // Validate UUID format before lookup
        try {
            UUID.fromString(productId);
        } catch (IllegalArgumentException e) {
            return new StockInfo(0, null, "Invalid product ID format");
        }
        return inventoryService.getStock(productId);
    }
    
    // Agent that uses these tools
    @Service
    static class ShoppingAssistantAgent {
        
        private final ChatClient chatClient;
        private final ProductTools productTools;
        
        ShoppingAssistantAgent(ChatClient.Builder builder, ProductTools tools) {
            this.productTools = tools;
            this.chatClient = builder
                .defaultSystem("""
                    You are a helpful shopping assistant.
                    Use tools to find products and check availability.
                    Always recommend based on what's in stock.
                    """)
                .build();
        }
        
        public String assist(String userQuery) {
            return chatClient.prompt()
                .user(userQuery)
                .tools(productTools)
                .maxIterations(5)
                .call()
                .content();
        }
    }
}
```

---

## 5. VectorStore — Semantic Search

```java
// Ingestion
@Service
public class KnowledgeIngestionService {

    private final VectorStore vectorStore;
    
    public void ingest(String content, Map<String, Object> metadata) {
        Document doc = new Document(content, metadata);
        vectorStore.add(List.of(doc));
    }
}

// Retrieval
@Service 
public class KnowledgeRetrievalService {

    private final VectorStore vectorStore;
    
    public List<Document> findRelevant(String query, String domain) {
        return vectorStore.similaritySearch(
            SearchRequest.query(query)
                .withTopK(3)
                .withSimilarityThreshold(0.65)
                .withFilterExpression("metadata['domain'] == '" + domain + "'")
        );
    }
}
```

---

## 6. Streaming Response

```java
@RestController
@RequestMapping("/api/ai")
public class AiStreamController {

    private final ChatClient chatClient;

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestBody ChatRequest request) {
        SseEmitter emitter = new SseEmitter(60_000L);
        
        Thread.startVirtualThread(() -> {
            try {
                chatClient.prompt()
                    .user(request.message())
                    .stream()
                    .content()
                    .doOnNext(token -> {
                        try {
                            emitter.send(SseEmitter.event().data(token));
                        } catch (IOException e) {
                            emitter.completeWithError(e);
                        }
                    })
                    .doOnComplete(() -> {
                        try {
                            emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                            emitter.complete();
                        } catch (IOException e) {
                            emitter.completeWithError(e);
                        }
                    })
                    .doOnError(emitter::completeWithError)
                    .subscribe();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });
        
        return emitter;
    }
}
```

---

## 7. Provider Portability

```yaml
# Switch from OpenAI to Ollama (local, self-hosted) without code changes:

# Remove: spring-ai-openai-spring-boot-starter
# Add:    spring-ai-ollama-spring-boot-starter

# application-local.yaml
spring:
  ai:
    ollama:
      base-url: http://localhost:11434
      chat:
        options:
          model: llama3.2
      embedding:
        options:
          model: nomic-embed-text

# All services using ChatClient or EmbeddingModel work unchanged.
# This is the value of the abstraction — dev uses Ollama (free),
# production uses OpenAI (quality) — one codebase.
```

---

## 8. The Pattern in Practice

### Wrong Way — Hardcoding an OpenAI API call without Spring AI

```java
// ❌ Direct HTTP to OpenAI — coupling, no abstraction, harder to test
RestTemplate restTemplate = new RestTemplate();
HttpHeaders headers = new HttpHeaders();
headers.set("Authorization", "Bearer " + apiKey);
// ... build request body as JSON string manually ...
// ... parse response JSON manually ...
// → can't swap providers, no streaming support, no retry
```

```java
// ✅ Spring AI ChatClient — provider-agnostic, testable, streaming-capable
// @MockBean ChatClient in tests; swap provider via config in production
String response = chatClient.prompt()
    .user(message)
    .options(OpenAiChatOptions.builder()
        .withModel("gpt-4o-mini")
        .withTemperature(0.0)
        .build())
    .call()
    .content();
```

---

## 9. Interview Questions & Model Answers

### Q1 — Why Spring AI over LangChain
**Interviewer:** "Why would you use Spring AI instead of LangChain?"

**Hruday:**
> "We're a Java shop — our entire backend runs on Spring Boot. LangChain is Python-first and its Java support is not native. Spring AI is designed to integrate with Spring Boot's DI, autoconfiguration, and testing patterns we already use. I can mock `ChatClient` in unit tests using `@MockBean`. I can switch from OpenAI to Ollama for local development by changing a dependency and two config lines — no code changes. The `@Tool` annotation is as natural as `@GetMapping`. And Spring AI ships Micrometer observability out of the box, so LLM call metrics appear in our existing Grafana dashboards without extra code. The only reason I'd step outside Spring AI is if I needed a complex stateful graph workflow — then I'd look at LangGraph."

---

## 10. Scale Evolution

**Prototype →** `ChatClient.Builder` injection; single provider (OpenAI); in-memory test stubs; zero config overhead.

**Production →** Separate `application.yaml` per profile; provider abstracted; Resilience4j circuit breaker around `chatClient.call()`; Micrometer metrics enabled.

**Multi-provider →** Primary provider (OpenAI) + fallback (Anthropic via alternate profile); Resilience4j `Retry` + `CircuitBreaker` for provider-level resilience; cost tracking per provider via custom meters.

---

## 11. Company Relevance

| Company | Spring AI relevance | Interview signal |
|---------|-------------------|-----------------|
| Razorpay / PhonePe | Java Spring Boot backend is standard; Spring AI is the natural choice | Demonstrate Spring AI `@Tool` for payment APIs; Resilience4j wrapping LLM calls |
| Swiggy / Meesho | Mixed Java + Python stacks; Spring AI for Java microservices | Provider-agnostic design via Spring AI interfaces |
| Adobe / Microsoft | Spring is used, but Azure OpenAI Service is the preferred LLM host at Microsoft | Spring AI + Azure OpenAI autoconfiguration; same ChatClient interface, Azure backend |
| SAP Labs | SAP uses Spring Boot extensively; Spring AI + SAP AI Core API Keys is the SAP-recommended approach | Spring AI BTP integration; SAP AI Core as OpenAI-compatible endpoint |

---

## 12. Related Topics — What to Study Next

- **Topic 349 — Implementing RAG with Spring Boot + pgvector** — full RAG stack using Spring AI
- **Topic 350 — Streaming RAG Responses via SSE** — streaming implementation with Spring AI ChatClient
- **Topic 356 — Agentic Frameworks** — comparison table with LangChain/LangGraph

---

*Part 21 · Spring AI — Building AI-Powered Features in Java and Spring Boot · Full Stack Interview Guide · Hruday D · 2026*
