# Streaming RAG Responses to React Frontend via SSE
> Part 21 — Generative AI for Full Stack Engineers · RAG
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Why streaming matters for LLM UX**: a non-streaming call for a 400-token response takes 3-5 seconds before the user sees anything; with SSE streaming, the user sees the first token in 200-400ms (time-to-first-token) and watches the response build in real-time — this is ChatGPT's UX, and it's now the user's expectation for any AI feature
- **SSE (Server-Sent Events) is the right transport**: SSE is one-way server→client streaming over HTTP; it's simpler than WebSocket for this use case because LLM responses only need to flow from server to client; native browser EventSource API, works through proxies and load balancers with proper headers
- **Spring AI streaming returns a `Flux<String>`**: `chatClient.stream().content()` returns a reactive stream of token strings; wrap it in a Spring MVC `SseEmitter` or use Spring WebFlux `Flux<ServerSentEvent<String>>` endpoint
- **The `[DONE]` signal**: when the LLM finishes generating, send an explicit end-of-stream event (`event: done, data: [DONE]`) so the React client knows to stop the loading indicator and finalize the UI
- **React side**: use the browser's `EventSource` API or a library like `eventsource-parser`; append each token to a `useState` string as it arrives; close the event source on the `done` event
- **Error handling in streaming**: if an error occurs mid-stream (context overflow, rate limit hit), you can't easily send an HTTP error status after the 200 has been sent; use a specific SSE event type (`event: error`) so the frontend can handle it gracefully

---

## 1. One-Line Definition
Streaming RAG delivers LLM response tokens to the React frontend one at a time via SSE as they are generated, reducing perceived latency from the full response time to the time-to-first-token, matching the interactive UX that users expect from AI features.

---

## 2. Architecture

```
User types in React UI and submits question
       │
       ▼
React opens EventSource to POST /api/rag/stream
       │
       ▼
Spring Boot Controller:
  1. Embed query
  2. Retrieve relevant chunks from pgvector
  3. Build augmented prompt
  4. Call chatClient.stream() → Flux<String>
       │
       ▼ (token by token)
Spring converts each token of Flux to an SSE event:
  data: "Ref"
  data: "unds"  
  data: " are"
  data: " available"
  ...
  event: done
  data: [DONE]
       │
       ▼ (via HTTP/SSE, persistent connection)
React EventSource receives tokens, appends to state → UI updates
       │
       ▼
EventSource receives [DONE] → close connection, hide loader
```

---

## 3. Spring Boot — Streaming RAG Endpoint

```java
@RestController
@RequestMapping("/api/rag")
@CrossOrigin(origins = "${frontend.url}")   // set from config
public class RagStreamController {

    private final VectorStore vectorStore;
    private final ChatClient chatClient;

    private static final String SYSTEM_PROMPT = """
        Answer the question using ONLY the provided CONTEXT.
        If the answer is not in the CONTEXT, say:
        "I don't have enough information to answer this accurately."
        """;

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamRagResponse(@RequestBody QueryRequest request) {
        
        SseEmitter emitter = new SseEmitter(60_000L); // 60s timeout
        
        // Run in virtual thread (Java 21) or executor to avoid blocking
        Thread.startVirtualThread(() -> {
            try {
                
                // Step 1: Retrieve relevant context (blocking call — before stream starts)
                List<Document> relevantDocs = vectorStore.similaritySearch(
                    SearchRequest.query(request.question())
                        .withTopK(4)
                        .withSimilarityThreshold(0.65)
                );
                
                if (relevantDocs.isEmpty()) {
                    emitter.send(SseEmitter.event()
                        .data("I don't have enough information to answer this accurately."));
                    emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                    emitter.complete();
                    return;
                }
                
                String context = relevantDocs.stream()
                    .map(Document::getContent)
                    .collect(Collectors.joining("\n\n---\n\n"));
                
                // Step 2: Stream LLM response token by token
                chatClient.prompt()
                    .system(SYSTEM_PROMPT)
                    .user(u -> u.text("CONTEXT:\n{ctx}\n\nQUESTION: {q}")
                        .param("ctx", context)
                        .param("q", request.question()))
                    .stream()         // ← returns ChatResponse flux
                    .content()        // ← Flux<String> of tokens
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
                    .subscribe();     // terminal operator starts the flux
                    
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });
        
        return emitter;
    }
}

// Alternative: Spring WebFlux reactive approach
// @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
// public Flux<ServerSentEvent<String>> stream(@RequestBody QueryRequest request) {
//     return chatClient.prompt()...stream().content()
//         .map(token -> ServerSentEvent.builder(token).build())
//         .concatWith(Flux.just(ServerSentEvent.builder("[DONE]").event("done").build()));
// }
```

---

## 4. React — Consuming SSE

```typescript
// hooks/useRagStream.ts
import { useState, useCallback } from 'react';

interface RagStreamState {
  answer: string;
  isStreaming: boolean;
  error: string | null;
}

export function useRagStream() {
  const [state, setState] = useState<RagStreamState>({
    answer: '',
    isStreaming: false,
    error: null,
  });

  const askQuestion = useCallback(async (question: string) => {
    // Reset state
    setState({ answer: '', isStreaming: true, error: null });
    
    try {
      // Use fetch + ReadableStream for POST-based SSE
      // (EventSource doesn't support POST natively)
      const response = await fetch('/api/rag/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Parse SSE lines from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // keep partial last line
        
        for (const line of lines) {
          if (line.startsWith('event: done')) {
            setState(prev => ({ ...prev, isStreaming: false }));
            break;
          }
          if (line.startsWith('data: ')) {
            const token = line.slice(6); // remove 'data: ' prefix
            if (token !== '[DONE]') {
              setState(prev => ({
                ...prev,
                answer: prev.answer + token,
              }));
            }
          }
        }
      }
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to get answer. Please try again.',
        isStreaming: false,
      }));
    }
  }, []);

  return { ...state, askQuestion };
}
```

```tsx
// components/RagChat.tsx
import { useState } from 'react';
import { useRagStream } from '../hooks/useRagStream';

export function RagChat() {
  const [question, setQuestion] = useState('');
  const { answer, isStreaming, error, askQuestion } = useRagStream();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      askQuestion(question);
    }
  };

  return (
    <div className="rag-chat">
      <form onSubmit={handleSubmit}>
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || !question.trim()}>
          {isStreaming ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {answer && (
        <div className="answer">
          <p>{answer}</p>
          {isStreaming && <span className="cursor blink">▌</span>}
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

---

## 5. The Pattern in Practice

### Wrong Way — Blocking endpoint for LLM

```java
// ❌ Non-streaming — user waits 3-8 seconds for response to appear
@PostMapping("/query")
public ResponseEntity<RagResponse> query(@RequestBody QueryRequest req) {
    String answer = ragService.query(req.question());  // blocks for full response
    return ResponseEntity.ok(new RagResponse(answer));
}
```

```
✅ Streaming endpoint:
  User sees first tokens in 200-400ms.
  Full response builds progressively.
  Matches the UX standard set by ChatGPT, Copilot, Claude.
  Significantly better perceived performance even if total 
  time is the same.
```

---

## 6. Interview Questions & Model Answers

### Q1 — Full stack integration
**Interviewer:** "How would you stream LLM responses from a Spring Boot backend to a React frontend?"

**Hruday:**
> "Server-Sent Events. On the backend, Spring AI's `chatClient.stream().content()` returns a `Flux<String>` of tokens; I wrap that in an `SseEmitter` and emit each token as an SSE `data` event. When the flux completes, I emit a final `event: done, data: [DONE]` to signal completion. On the frontend, since SSE's native `EventSource` doesn't support POST, I use `fetch` with a `ReadableStream` reader to consume the response body incrementally. Each token is appended to a React state string, which triggers a re-render that shows the progressively building response. The UI shows a blinking cursor while streaming and removes it on the done event."

---

## 7. Hruday's Real Experience Hook
> "The first version of our AI feature returned the full answer after 5 seconds. Users thought it had frozen. We had a 40% abandonment rate on questions longer than 2 sentences. Adding SSE streaming reduced the time-to-first-token from 5s to 300ms. The total response time was the same — the LLM was generating the same number of tokens. But users perceived it as instant because they were reading while it typed. Abandonment dropped to under 5% after the change. The lesson: for AI-generated content, perceived latency is controlled by time-to-first-token, not total response time."

---

## 8. Scale Evolution

**Prototype →** Basic SseEmitter; single backend instance; works fine.

**Production →** Connection timeout configuration (LLM can be slow); error event type for clean frontend error handling; CORS headers configured correctly for SSE.

**High scale →** Virtual thread per SSE connection (Java 21) to avoid blocking executor threads; load balancer with sticky sessions or stateless SSE design; latency percentiles tracked (P50/P95 time-to-first-token is the key metric).

---

## 9. Company Relevance

| Company | SSE streaming benefit | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | AI-powered merchant support chatbot; streaming reduces bounce on slow answers | Time-to-first-token optimisation; virtual threads for SSE scalability |
| Swiggy / Meesho | Product recommendation AI; order help chatbot | Streaming UI for conversational product discovery |
| Adobe / Microsoft | Firefly / Copilot-style streaming is the standard UX; must match competitor UX | Spring WebFlux SSE; streaming as a first-class product requirement |
| SAP Labs | Joule AI assistant streams responses in SAP Fiori; Spring AI backend powers this | SSE over HTTP/2 in SAP's cloud environment; Spring AI streaming API |

---

## 10. Related Topics — What to Study Next

- **Topic 349 — Implementing RAG with Spring Boot** — the non-streaming version that this file extends
- **Topic 359 — Streaming LLM Responses: SSE from Spring Boot to React** — full SSE implementation details (this topic covers the RAG-specific streaming case; that topic covers general LLM streaming patterns)
- **Topic 379 — Streaming UI in React** — frontend-side token-by-token rendering patterns in depth

---

*Part 21 · Streaming RAG Responses to React Frontend via SSE · Full Stack Interview Guide · Hruday D · 2026*
