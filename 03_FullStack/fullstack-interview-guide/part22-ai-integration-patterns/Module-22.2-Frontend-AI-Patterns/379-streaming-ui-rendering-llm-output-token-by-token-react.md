# Streaming UI — Rendering LLM Output Token by Token in React
> Part 22 — AI Integration Patterns · Frontend AI Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Token-by-token streaming transforms UX**: time-to-first-visible-content drops from 8-10 seconds (fully blocked) to < 500ms (first token); users describe streaming as "alive" vs the non-streaming experience as "broken"; this is the single highest-ROI frontend AI optimisation
- **React patterns for streaming**: accumulate tokens in `useState('')`; append each token via functional update `prev => prev + token`; functional update is critical (avoids stale closure bug where tokens overwrite each other)
- **`fetch` + `ReadableStream` for POST requests**: native `EventSource` is GET-only; LLM calls must be POST (request body carries the message); use `fetch` → `response.body.pipeThrough(new TextDecoderStream()).getReader()` → read line by line → parse SSE `data:` prefix
- **Cursor and typing indicator**: render a blinking `|` cursor after the current content while `isStreaming` is true; remove it instantly on the `done` event; this removes the "frozen" feeling during longer generations
- **Markdown rendering during streaming**: use `react-markdown` with `remarkGfm`; feed the incomplete accumulating string to the markdown renderer on each update; this works surprisingly well — markdown renders progressively without visible artifacts in most cases
- **Abort handling**: when the user sends a new message or navigates away, abort the active stream via `AbortController`; always clean up in `useEffect` return function; memory leaks from orphaned streams are a common bug in AI chat UIs

---

## 1. One-Line Definition
Token-by-token streaming renders each LLM-generated token to the React UI as it arrives via SSE, making AI responses feel instantaneous and alive compared to the waiting-then-displaying approach.

---

## 2. Core Hook: useStreamingChat

```typescript
// hooks/useStreamingChat.ts
import { useState, useCallback, useRef } from 'react';

interface StreamingChatState {
  content: string;
  isStreaming: boolean;
  error: string | null;
  send: (message: string, sessionId: string) => Promise<void>;
  abort: () => void;
}

export function useStreamingChat(): StreamingChatState {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const send = useCallback(async (message: string, sessionId: string) => {
    // Abort any in-progress stream
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    setContent('');    // Clear previous response
    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Parse SSE format: split into lines, handle multiline chunks
          for (const line of value.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              
              if (data === '[DONE]') {
                setIsStreaming(false);
                return;
              }
              
              // Functional update to avoid stale closure
              setContent(prev => prev + data);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setIsStreaming(false);
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Stream failed';
      setError(errorMessage);
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { content, isStreaming, error, send, abort };
}
```

---

## 3. Chat Message Component with Markdown + Cursor

```tsx
// components/StreamingMessage.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  isStreaming: boolean;
}

export function StreamingMessage({ content, isStreaming }: Props) {
  return (
    <div className="message assistant">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom code block rendering (monospace, syntax highlight)
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return inline ? (
              <code className="inline-code" {...props}>{children}</code>
            ) : (
              <pre className="code-block">
                <code className={className} {...props}>{children}</code>
              </pre>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
      
      {/* Blinking cursor while streaming */}
      {isStreaming && (
        <span className="streaming-cursor" aria-hidden="true">|</span>
      )}
    </div>
  );
}
```

```css
/* StreamingMessage.css */
.streaming-cursor {
  display: inline-block;
  color: #4a90e2;
  animation: cursor-blink 1s step-end infinite;
  margin-left: 1px;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

---

## 4. Full Chat Interface

```tsx
// components/ChatInterface.tsx
import { useState, useRef, useEffect } from 'react';
import { useStreamingChat } from '../hooks/useStreamingChat';
import { StreamingMessage } from './StreamingMessage';

export function ChatInterface({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Array<{role: 'user'|'ai', content: string}>>([]);
  const [inputValue, setInputValue] = useState('');
  const { content, isStreaming, error, send, abort } = useStreamingChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Abort stream on unmount (navigation away)
  useEffect(() => () => abort(), [abort]);

  // Auto-scroll as tokens arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = inputValue.trim();
    if (!message || isStreaming) return;
    
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setInputValue('');
    
    await send(message, sessionId);
    
    // After stream ends, add the complete AI message to history
    setMessages(prev => [...prev, { role: 'ai', content }]);
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.role === 'ai' 
              ? <StreamingMessage content={msg.content} isStreaming={false} />
              : <p>{msg.content}</p>
            }
          </div>
        ))}
        
        {/* Live streaming message */}
        {isStreaming && content && (
          <StreamingMessage content={content} isStreaming={true} />
        )}
        
        {error && <div className="error">Error: {error}. <button onClick={() => {}}>Retry</button></div>}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="input-area">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          disabled={isStreaming}
          placeholder="Ask a question..."
          aria-label="Chat input"
        />
        {isStreaming ? (
          <button type="button" onClick={abort} className="stop-btn">Stop</button>
        ) : (
          <button type="submit" disabled={!inputValue.trim()}>Send</button>
        )}
      </form>
    </div>
  );
}
```

---

## 5. Wrong Way vs Right Way

```tsx
// ❌ Blocking fetch — renders complete response after full generation
const [response, setResponse] = useState('');

const ask = async (question: string) => {
  const res = await fetch('/api/ai/ask', { method: 'POST', body: question });
  const data = await res.text();
  setResponse(data);  // User waits 8-10s seeing nothing, then all text appears at once
};
```

```tsx
// ❌ Token append with stale closure bug
// If multiple tokens arrive quickly, some may be lost
const [content, setContent] = useState('');
const ask = async (question: string) => {
  // ...
  setContent(content + token);  // BUG: 'content' is captured at closure creation time
  //                               → racing tokens overwrite each other
};

// ✅ Functional update — always uses the latest state
setContent(prev => prev + token);  // Correct: prev is always the latest value
```

---

## 6. Scale Evolution

**Prototype →** Basic `useStreamingChat` hook; `setContent(prev => prev + token)`; blinking cursor.

**Production →** `AbortController` cleanup; error boundary for stream failures; retry on transient errors; markdown rendering with code syntax highlighting.

**High scale →** Virtual scrolling for long conversations (avoid DOM bloat); optimistic UI for user messages (display instantly before server confirms); message persistence in IndexedDB for offline continuation; Web Workers for markdown parsing of long responses.

---

## 7. Company Relevance

| Company | Streaming UI relevance | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Support chatbot in payment dashboard | Describe abort/cleanup for tab visibility change; accessibility aria-live |
| Swiggy / Meesho | AI product search results rendering progressively | SSE for search result streaming; abort on new search query |
| Adobe / Microsoft | Copilot in document editor — streaming text insertion | Cursor position management; streaming into editor content model |
| SAP Labs | AI-assisted form filling — streaming field suggestions | Controlled streaming into form inputs; structured output streaming |

---

## 8. Interview Questions & Model Answers

### Q1 — How do you implement token-by-token streaming in React?
**Hruday:**
> "Since native EventSource is GET-only and LLM calls need POST request bodies, I use `fetch` with `ReadableStream`. The response body is piped through `TextDecoderStream` and read line-by-line in a while loop. For each line starting with `data: `, I strip the prefix and append to state using a functional update — `setContent(prev => prev + token)` — that's critical; using the captured closure value instead would lose tokens in rapid-fire sequences. While streaming is in progress, I render a blinking CSS cursor after the current content so the user sees the AI is actively generating. For the text itself, I feed the accumulating string to `react-markdown` on each update — it handles partial markdown surprisingly well. I also attach an `AbortController` to the fetch, and call `abort()` in the `useEffect` cleanup function so navigating away properly terminates the SSE connection and doesn't leak server threads."

---

*Part 22 · Streaming UI — Rendering LLM Output Token by Token in React · Full Stack Interview Guide · Hruday D · 2026*
