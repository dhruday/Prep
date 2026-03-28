# Error Handling for AI Responses — Retry, Fallback, User Messaging
> Part 22 — AI Integration Patterns · Frontend AI Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **AI errors are different from API errors**: a 500 from a payment API means something went wrong in your system; a 500 from an LLM API might mean the model is overloaded, your prompt exceeded the context limit, or the provider had a regional outage — most are transient and retry-able
- **Three response failure types to handle**: (1) HTTP errors (429 rate limit, 503 provider down, 500 internal error); (2) Stream errors (connection dropped mid-generation, reader throws); (3) Quality errors (LLM returns but answer is low-quality, truncated, or "I don't know"); each needs a different response
- **Retry strategy**: retry 429 with exponential backoff + `Retry-After` header honour; retry 503 once after 2s; never retry 4xx input validation errors (bad prompt, content filter) — they will fail the same way every time
- **User messaging hierarchy**: for transient errors → "Couldn't complete. Try again" + retry button; for rate limit → "Busy right now. Try in a moment"; for quality failure (AI says "I don't know") → "No answer found. Try rephrasing or contact support"; never show internal error details
- **Automatic retry vs manual retry**: for streaming failures mid-response (connection dropped after 60%), prompt the user "Response interrupted. Continue?" with a retry button — don't auto-retry because you've already shown partial content; for initial connection failures (nothing shown yet), a single auto-retry after 1s is acceptable UX
- **Partial response handling**: if the stream is interrupted after partial content, save what arrived; show a "Response interrupted" indicator; offer retry; optionally allow the user to continue from the partial response ("Start over" vs "Retry from here")

---

## 1. Error Type Taxonomy

```
AI RESPONSE ERROR TYPES
│
├── CONNECTION ERRORS (before any response)
│   ├── 429 Too Many Requests     → retry after X seconds (honour Retry-After header)
│   ├── 503 Service Unavailable   → retry once, then fallback
│   ├── 504 Gateway Timeout       → LLM call exceeded server timeout, retry
│   └── Network error             → check connectivity, retry with backoff
│
├── STREAM ERRORS (after response started)
│   ├── Stream interrupted        → show partial + "Response interrupted" + retry
│   ├── ReadableStream error      → close and show error with retry button
│   └── Reader cancelled          → clean up; may be intentional (user aborted)
│
└── QUALITY ERRORS (response received, but unhelpful)
    ├── "I don't know" response   → show with escalation path to human support
    ├── Truncated response        → backend issue (max_tokens hit); show partial + note
    └── Refuse/safety filter      → "Can't answer this. Rephrase or try something different."
```

---

## 2. Retry Hook

```typescript
// hooks/useRetryStream.ts

interface RetryConfig {
  maxAttempts: number;
  retryableStatusCodes: number[];
  baseDelayMs: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  retryableStatusCodes: [429, 503, 504],
  baseDelayMs: 1000,
};

export function useRetryingStream(config = DEFAULT_CONFIG) {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<AiError | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const sendWithRetry = useCallback(async (
    message: string, 
    sessionId: string,
    attempt = 1
  ) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    
    setContent('');
    setIsStreaming(true);
    setError(null);
    setAttemptCount(attempt);

    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : config.baseDelayMs * Math.pow(2, attempt - 1);
        
        if (config.retryableStatusCodes.includes(response.status) 
            && attempt < config.maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return sendWithRetry(message, sessionId, attempt + 1);
        }
        
        throw new AiHttpError(response.status, response.statusText);
      }

      // Read stream
      const reader = response.body!
        .pipeThrough(new TextDecoderStream())
        .getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of value.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') { setIsStreaming(false); return; }
              setContent(prev => prev + data);
            }
          }
        }
      } catch (streamErr) {
        // Stream interrupted mid-response
        if (content) {
          setError(new AiStreamInterruptedError());
        } else {
          throw streamErr;
        }
      } finally {
        reader.releaseLock();
      }
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(mapToAiError(err));
    } finally {
      setIsStreaming(false);
    }
  }, [config, content]);

  return {
    content,
    isStreaming,
    error,
    attemptCount,
    send: (msg: string, sid: string) => sendWithRetry(msg, sid),
    retry: () => {/* stored last message */},
    abort: () => abortRef.current?.abort(),
  };
}
```

---

## 3. Error Display Components

```tsx
// components/AiErrorDisplay.tsx
interface AiError {
  type: 'RATE_LIMIT' | 'SERVICE_DOWN' | 'STREAM_INTERRUPTED' | 'QUALITY_FAIL' | 'UNKNOWN';
  message: string;
  retryAfterMs?: number;
}

export function AiErrorDisplay({ 
  error, 
  partialContent,
  onRetry,
  onEscalate 
}: Props) {
  
  if (error.type === 'STREAM_INTERRUPTED' && partialContent) {
    return (
      <div className="ai-error stream-interrupted">
        <div className="partial-content">
          {/* Show what arrived before interruption */}
          <StreamingMessage content={partialContent} isStreaming={false} />
          <div className="interrupted-bar">— Response interrupted —</div>
        </div>
        <div className="error-actions">
          <button onClick={onRetry} className="retry-btn">Retry from start</button>
        </div>
      </div>
    );
  }
  
  if (error.type === 'RATE_LIMIT') {
    return (
      <RetryCountdown 
        retryAfterMs={error.retryAfterMs ?? 30000}
        onRetry={onRetry}
        message="High demand right now. Retrying in"
      />
    );
  }
  
  if (error.type === 'QUALITY_FAIL') {
    return (
      <div className="ai-error quality-fail">
        <p>I couldn't find a good answer for that.</p>
        <div className="error-actions">
          <button onClick={onRetry}>Try rephrasing</button>
          <button onClick={onEscalate} className="escalate-btn">Contact Support</button>
        </div>
      </div>
    );
  }
  
  // Generic fallback
  return (
    <div className="ai-error">
      <p>Something went wrong. Please try again.</p>
      <button onClick={onRetry}>Try again</button>
    </div>
  );
}

// Countdown timer for rate-limited retry
function RetryCountdown({ retryAfterMs, onRetry, message }: CountdownProps) {
  const [seconds, setSeconds] = useState(Math.ceil(retryAfterMs / 1000));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) { clearInterval(interval); onRetry(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onRetry]);
  
  return <p>{message} {seconds}s...</p>;
}
```

---

## 4. Wrong Way vs Right Way

```tsx
// ❌ Generic error that reveals nothing useful and doesn't retry
catch (err) {
  setError('Error: ' + err.message);  // "Error: HTTP 503: Service Unavailable"
  // → Technical; no action; user doesn't know if to retry or contact support
}

// ❌ Auto-retry everything including non-retryable errors
catch (err) {
  if (attempt < 3) return sendWithRetry(message, attempt + 1);  // Retries 400 Bad Request
  // → Wastes time; 400 errors will always fail the same way
}
```

```tsx
// ✅ Context-appropriate messaging + targeted retry
catch (err) {
  if (err.status === 429) {
    const retryAfter = err.headers.get('Retry-After') ?? '30';
    setError({ type: 'RATE_LIMIT', message: 'Busy', retryAfterMs: parseInt(retryAfter) * 1000 });
  } else if (err.status === 503 && attempt < 2) {
    await sleep(2000);
    return sendWithRetry(message, attempt + 1);
  } else {
    setError({ type: 'UNKNOWN', message: 'Please try again.' });
  }
}
```

---

## 5. Scale Evolution

**Prototype →** Basic try/catch; "Something went wrong. Try again" message; manual retry button.

**Production →** Error type classification; rate limit countdown; stream interruption partial display; escalation path for quality failures.

**High scale →** Client-side error telemetry (to Sentry or similar); error rate by error type tracked in analytics; exponential backoff with jitter (prevent thundering herd when service recovers); offline detection before attempting AI calls.

---

## 6. Company Relevance

| Company | Error handling context | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment-adjacent AI — errors must be clear and actionable | Never show "undefined" errors; clear retry path; financial context escalation |
| Swiggy / Meesho | Consumer app — users have low tolerance for raw errors | User-friendly copy ("Our assistant is busy") + auto-retry for transient errors |
| Adobe / Microsoft | Power users expect detailed context | Optional "Show details" toggle for technical users; clean by default |
| SAP Labs | Enterprise — B2B users tolerate more technical UX; need audit context | Error code + correlation ID for support tickets; no user-friendly hiding of technical info |

---

## 7. Interview Questions & Model Answers

### Q1 — How do you handle errors in an AI streaming feature?
**Hruday:**
> "I classify errors into three types, each with a different response. Connection errors before any content — 429, 503, 504 — I retry with exponential backoff, honouring the `Retry-After` header for rate limits; 400-level input validation errors I never retry since the request will fail the same way. Stream interruptions mid-response are the most interesting case: once the user has seen partial content, auto-restarting isn't right — they need to know what happened. I show the partial content that arrived, mark it with '— Response interrupted —', and offer a retry button. For quality failures — when the LLM responds but says 'I don't know' or gives an unhelpful answer — I offer to rephrase or escalate to human support. User-facing messages are always action-oriented ('Busy right now, retrying in 30s...') rather than technical ('HTTP 503'). For actual telemetry, I send structured error events to our analytics system so we can track which error types spike and correlate them with LLM provider status pages."

---

*Part 22 · Error Handling for AI Responses — Retry, Fallback, User Messaging · Full Stack Interview Guide · Hruday D · 2026*
