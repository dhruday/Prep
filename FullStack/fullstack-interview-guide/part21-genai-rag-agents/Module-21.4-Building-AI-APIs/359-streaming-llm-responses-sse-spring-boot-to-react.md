# Streaming LLM Responses — SSE from Spring Boot to React
> Part 21 — Generative AI for Full Stack Engineers · Building AI APIs
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Why streaming**: LLM responses take 3-15 seconds to fully generate — streaming sends tokens as they arrive, giving the user instant visual feedback (first token < 500ms); this alone cuts perceived latency by 80% and abandonment rate significantly
- **SSE (Server-Sent Events) is the right protocol** for LLM streaming: unidirectional server→client, HTTP-native (no WebSocket upgrade), auto-reconnects, works through proxies; WebSocket is overkill when you only need one-directional streaming
- **Spring Boot side**: `SseEmitter` + virtual thread + `chatClient.stream().content()` that returns `Flux<String>`; send each token as an SSE event; send a terminal `done` event with `[DONE]` to signal completion; set emitter timeout to 60-90 seconds
- **React side**: native `EventSource` is GET-only; for POST requests (which LLM calls always are), use `fetch` + `ReadableStream` + `TextDecoderStream`; read the stream line-by-line, parse `data:` prefix, append each token to component state
- **Key gotcha**: SSE connections count against server connection pool — for high-traffic production, use reactive stack (`WebFlux` + `Flux<ServerSentEvent>`) instead of thread-per-connection `SseEmitter`
- **Always send a done signal**: the client must know when the stream ends; use `event: done` and `data: [DONE]`; handle the done event in React to stop the typing indicator and enable the reply button

---

## 1. One-Line Definition
LLM streaming via SSE sends each generated token from Spring Boot to the React frontend as it arrives, transforming a 10-second blocking wait into a live typing effect with sub-500ms time-to-first-token.

---

## 2. Why Not WebSocket or Long Polling

| Protocol | Fit for LLM streaming | Why |
|----------|----------------------|-----|
| **SSE** | ✅ Ideal | HTTP-native, one-directional, auto-reconnect, proxies work |
| WebSocket | ❌ Overkill | Bidirectional (we only need server→client), extra handshake, proxy config needed |
| Long Polling | ❌ Wrong pattern | Re-establishes connection per chunk — terrible for token-by-token streaming |
| HTTP Response streaming | ✅ Alternative | Works but no auto-reconnect; harder to handle resume |

---

## 3. Spring Boot — SseEmitter Pattern (Thread-per-request)

```java
@RestController
@RequestMapping("/api/ai")
public class LlmStreamController {

    private final ChatClient chatClient;

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamResponse(@RequestBody @Validated StreamRequest request) {
        
        SseEmitter emitter = new SseEmitter(90_000L); // 90s timeout
        
        // Virtual thread — no blocking the request thread
        Thread.startVirtualThread(() -> {
            try {
                chatClient.prompt()
                    .system("You are a helpful assistant. Be concise.")
                    .user(request.message())
                    .stream()
                    .content()
                    .doOnNext(token -> sendToken(emitter, token))
                    .doOnComplete(() -> sendDone(emitter))
                    .doOnError(e -> {
                        log.error("Stream error", e);
                        emitter.completeWithError(e);
                    })
                    .blockLast(); // blocks the virtual thread, not a platform thread
                    
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });
        
        return emitter;
    }

    private void sendToken(SseEmitter emitter, String token) {
        try {
            emitter.send(
                SseEmitter.event()
                    .name("token")
                    .data(token)
            );
        } catch (IOException e) {
            emitter.completeWithError(e);
        }
    }

    private void sendDone(SseEmitter emitter) {
        try {
            emitter.send(
                SseEmitter.event()
                    .name("done")
                    .data("[DONE]")
            );
            emitter.complete();
        } catch (IOException e) {
            emitter.completeWithError(e);
        }
    }
}

public record StreamRequest(
    @NotBlank String message
) {}
```

---

## 4. Spring Boot — WebFlux Pattern (Reactive, Preferred for High Scale)

```java
@RestController
@RequestMapping("/api/ai")
public class ReactiveStreamController {

    private final ChatClient chatClient;

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamResponse(@RequestBody StreamRequest request) {
        
        Flux<ServerSentEvent<String>> tokenStream = chatClient.prompt()
            .user(request.message())
            .stream()
            .content()
            .map(token -> ServerSentEvent.<String>builder()
                .event("token")
                .data(token)
                .build());
        
        ServerSentEvent<String> doneEvent = ServerSentEvent.<String>builder()
            .event("done")
            .data("[DONE]")
            .build();
        
        return tokenStream.concatWith(Flux.just(doneEvent));
    }
}
```

---

## 5. React Frontend — Streaming Hook

```typescript
// useStreamingResponse.ts
import { useState, useCallback } from 'react';

interface UseStreamingResponse {
  content: string;
  isStreaming: boolean;
  error: string | null;
  startStream: (message: string) => void;
}

export function useStreamingResponse(): UseStreamingResponse {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStream = useCallback(async (message: string) => {
    setContent('');
    setIsStreaming(true);
    setError(null);

    try {
      // fetch because EventSource is GET-only
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(90_000),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // SSE format: lines like "event: token\ndata: Hello\n\n"
        for (const line of value.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // strip "data: "
            if (data === '[DONE]') {
              setIsStreaming(false);
              return;
            }
            setContent(prev => prev + data);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stream failed');
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { content, isStreaming, error, startStream };
}
```

```tsx
// ChatInterface.tsx
import { useStreamingResponse } from './useStreamingResponse';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const { content, isStreaming, error, startStream } = useStreamingResponse();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    startStream(input.trim());
    setInput('');
  };

  return (
    <div className="chat-container">
      <div className="response">
        {content}
        {isStreaming && <span className="cursor">|</span>}
        {error && <span className="error">Error: {error}</span>}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isStreaming}
          placeholder="Ask a question..."
        />
        <button type="submit" disabled={isStreaming || !input.trim()}>
          {isStreaming ? 'Generating...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
```

---

## 6. Wrong Way vs Right Way

```java
// ❌ Blocking response — user waits 8-15 seconds seeing nothing
@PostMapping("/ask")
public String ask(@RequestBody String message) {
    return chatClient.prompt()
        .user(message)
        .call()
        .content(); // blocks until complete generation
}
```

```java
// ✅ Streaming — first token arrives in < 500ms, user sees progress immediately
@PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<String>> stream(@RequestBody StreamRequest req) {
    return chatClient.prompt().user(req.message())
        .stream().content()
        .map(token -> ServerSentEvent.<String>builder().event("token").data(token).build())
        .concatWith(Flux.just(ServerSentEvent.<String>builder().event("done").data("[DONE]").build()));
}
```

---

## 7. Scale Evolution

**Prototype →** `SseEmitter` + virtual thread; single Spring MVC controller; works fine for low traffic.

**Production →** WebFlux reactive stack for high concurrency (thousands of simultaneous streams); CORS configured for frontend domain; keep-alive ping every 15 seconds to prevent proxy timeouts.

**High scale →** Nginx/ALB configured with `proxy_buffering off` and `X-Accel-Buffering: no` to prevent response buffering that breaks SSE; CDN bypassed for `/api/ai/stream`; connection count monitoring via Micrometer (alert on active SSE connections > 500 per instance).

---

## 8. Company Relevance

| Company | Streaming relevance | Interview signal |
|---------|-------------------|-----------------|
| Razorpay / PhonePe | AI-powered support chatbots — streaming makes wait bearable | Describe SseEmitter + virtual thread + React fetch-based stream |
| Swiggy / Meesho | Product recommendation chat, AI search — streaming UX critical at scale | WebFlux `Flux<SSE>` pattern for high-concurrent stream endpoints |
| Adobe / Microsoft | Copilot-style writing tools — streaming is table stakes | Spring AI `.stream().content()` → Flux pipeline |
| SAP Labs | AI-assisted ERP workflows — document generation with live progress | Structured streaming with per-section events, not just token-by-token |

---

## 9. Interview Questions & Model Answers

### Q1 — Why SSE over WebSocket for LLM streaming?
**Hruday:**
> "LLM streaming is one-directional — the server pushes tokens, the client only sends the initial request. SSE is built exactly for this pattern. It's HTTP/1.1 compatible, auto-reconnects on connection drop, and works through corporate proxies without special configuration. WebSocket adds a full bidirectional channel and an upgrade handshake for something that's fundamentally one-way. The only time I'd choose WebSocket over SSE for AI features is if I need real-time bidirectional interaction — like a voice interface where I'm streaming audio back and receiving audio in — but for text generation SSE is the right tool."

---

*Part 21 · Streaming LLM Responses — SSE from Spring Boot to React · Full Stack Interview Guide · Hruday D · 2026*
