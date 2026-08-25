# AI Loading States — Typing Indicators, Progress Bars, Skeleton Screens
> Part 22 — AI Integration Patterns · Frontend AI Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **AI loading states are different from regular API loading**: regular API loads in 100-500ms (a spinner is fine); LLM calls take 2-15 seconds for non-streaming, so visual feedback must communicate active work, not just "waiting"; the wrong loading state causes perceived latency 3× worse than actual latency
- **Streaming first, loading state second**: if you have streaming (token-by-token), loading states are only needed for the < 500ms before the first token arrives; a simple typing indicator ("...") during that initial gap is sufficient
- **Progressive reveal via skeleton screens**: for non-streaming AI features (document summary, structured extraction), show the eventual layout as grey placeholders while generating; when the LLM returns, animate the skeleton out and the content in; this dramatically reduces perceived wait time vs a blank spinner
- **Three-stage visual for complex AI tasks**: Stage 1 — "Thinking..." indicator; Stage 2 — "Generating response..." with an animated typing indicator; Stage 3 — content reveal; this progressive disclosure manages expectation and reduces anxiety-clicks
- **Typing indicator (animated dots)**: the `...` bouncing animation communicates "AI is composing, like a human typing"; it's the single most effective AI loading pattern for chat UIs; it's what iMessage and WhatsApp use — users are conditioned to understand this means "reply coming"
- **Never show a spinner for more than 3 seconds**: users interpret a spinner lasting > 3s as "loading failed"; after 3s of non-streaming load, upgrade to a more informative loading state ("Analysing your document...") with a progress indicator or estimated time

---

## 1. Three Loading Patterns and When to Use Each

| Pattern | When to use | Duration feel |
|---------|------------|---------------|
| **Typing indicator** | Chat/conversational AI, < 3s expected | "Someone is typing" — familiar, non-anxious |
| **Skeleton screens** | Non-streaming structured output (cards, lists) | "Layout coming" — sets spatial expectations |
| **Progress indicator** | Long operations (batch jobs, large doc analysis) | "Work is happening" — reduces anxiety on long waits |

---

## 2. Typing Indicator — Chat Context

```tsx
// components/TypingIndicator.tsx
export function TypingIndicator() {
  return (
    <div className="typing-indicator" role="status" aria-label="AI is thinking">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
}
```

```css
/* TypingIndicator.css */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: #f0f0f0;
  border-radius: 18px;
  width: fit-content;
}

.dot {
  width: 8px;
  height: 8px;
  background: #666;
  border-radius: 50%;
  animation: typing-bounce 1.4s ease-in-out infinite;
}

.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-10px); opacity: 1; }
}
```

```tsx
// usage in ChatInterface
{isStreaming && !content && (
  <TypingIndicator />
)}
{isStreaming && content && (
  <StreamingMessage content={content} isStreaming={true} />
)}
// Pattern: TypingIndicator → StreamingMessage (once first token arrives)
// The transition from dots to streaming text feels natural
```

---

## 3. Skeleton Screen — Non-streaming Structured Output

```tsx
// For AI features that return when complete (document summary, analysis card)
// Show the layout as placeholder while loading

// components/SummaryCardSkeleton.tsx
export function SummaryCardSkeleton() {
  return (
    <div className="summary-card skeleton" aria-label="Loading summary">
      <div className="skeleton-line title" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
      <div className="skeleton-tags">
        <div className="skeleton-tag" />
        <div className="skeleton-tag" />
        <div className="skeleton-tag" />
      </div>
    </div>
  );
}

// components/SummaryCard.tsx — actual content component
export function SummaryCard({ summary }: { summary: DocumentSummary }) {
  return (
    <div className="summary-card">
      <h3>{summary.title}</h3>
      <p>{summary.summary}</p>
      <div className="tags">{summary.keyTopics.map(t => <Tag key={t}>{t}</Tag>)}</div>
    </div>
  );
}

// Parent: switch between skeleton and content
export function SummarySection({ documentId }: { documentId: string }) {
  const { data, isLoading } = useSummary(documentId);
  
  return isLoading 
    ? <SummaryCardSkeleton /> 
    : data 
      ? <SummaryCard summary={data} /> 
      : null;
}
```

```css
/* Skeleton shimmer animation */
.skeleton {
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-line {
  height: 16px;
  border-radius: 4px;
  margin-bottom: 12px;
  background: inherit;
  animation: inherit;
}
.skeleton-line.title { height: 24px; width: 60%; }
.skeleton-line.short { width: 40%; }
.skeleton-tag { width: 70px; height: 24px; border-radius: 12px; background: inherit; }
```

---

## 4. Progress Bar for Long AI Tasks (Async Jobs)

```tsx
// For async AI jobs (document analysis, batch processing)
// Show estimated progress based on elapsed time vs expected duration

function AiJobProgress({ jobId, estimatedSeconds }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<'PENDING' | 'PROCESSING' | 'COMPLETED'>('PENDING');
  
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 200);
    
    // Poll job status
    const statusInterval = setInterval(async () => {
      const job = await fetchJobStatus(jobId);
      setStatus(job.status);
      if (job.status === 'COMPLETED' || job.status === 'FAILED') {
        clearInterval(interval);
        clearInterval(statusInterval);
      }
    }, 2000);
    
    return () => { clearInterval(interval); clearInterval(statusInterval); };
  }, [jobId]);
  
  // Estimated progress: 0 → 90% over expectedSeconds (last 10% held until COMPLETED)
  const estimatedProgress = Math.min(
    (elapsed / estimatedSeconds) * 90,
    status === 'COMPLETED' ? 100 : 90
  );
  
  const stage = elapsed < 3 ? 'Preparing...' 
    : elapsed < estimatedSeconds * 0.5 ? 'Analysing document...'
    : 'Generating response...';
  
  return (
    <div className="ai-job-progress">
      <div className="progress-bar">
        <div className="fill" style={{ width: `${estimatedProgress}%` }} />
      </div>
      <p className="stage-label">{stage}</p>
      {estimatedSeconds > 10 && (
        <p className="eta">
          Estimated: {Math.max(0, Math.round(estimatedSeconds - elapsed))}s remaining
        </p>
      )}
    </div>
  );
}
```

---

## 5. Wrong Way vs Right Way

```tsx
// ❌ No loading state — blank screen while waiting
const [response, setResponse] = useState('');
const ask = async (q: string) => {
  const res = await fetch('/api/ai', { method: 'POST', body: q });
  setResponse(await res.text());
};
// → 8-10 seconds of nothing → user thinks request failed → clicks again → duplicate request

// ❌ Generic spinner for long AI operations (> 3 seconds)
{isLoading && <Spinner />}
// → 8s spinner → user anxiety → "Is this working?" → clicks Stop and retries
```

```tsx
// ✅ Typing indicator → streaming content → completion (chat flow)
{isStreaming && !content && <TypingIndicator />}
{content && <StreamingMessage content={content} isStreaming={isStreaming} />}

// ✅ Skeleton screen for non-streaming structured output
{isLoading ? <SummaryCardSkeleton /> : <SummaryCard summary={data} />}

// ✅ Progress bar with stage labels for long jobs (> 5s)
{job.status !== 'COMPLETED' && (
  <AiJobProgress jobId={job.id} estimatedSeconds={30} />
)}
```

---

## 6. Scale Evolution

**Prototype →** Simple `isLoading` boolean; spinner or "Thinking..." text.

**Production →** Typing indicator + streaming transition; skeleton screens for structured output; stage labels for progress.

**High scale →** Adaptive loading states based on historical p50 latency for each feature (fast features → simple indicator; slow features → progress bar with ETA); A/B tested loading states against abandonment rate; accessibility: `aria-live="polite"` on streaming content for screen readers.

---

## 7. Company Relevance

| Company | Loading state context | Interview signal |
|---------|---------------------|-----------------|
| Razorpay / PhonePe | AI-powered dispute resolution — users are anxious about money | Progress stages ("Checking transaction...", "Analysing dispute...") reduce anxiety |
| Swiggy / Meesho | AI search — results streaming in progressively | Skeleton screens for product cards; stream in order of relevance score |
| Adobe / Microsoft | AI magic tools (background remove, enhance); generation can take 10+ seconds | Progress bar + stage label standard in Adobe products |
| SAP Labs | AI GL code suggestion in invoice processing form | Inline skeleton placeholder in form field; replace with suggestion when ready |

---

## 8. Interview Questions & Model Answers

### Q1 — How do you design loading states for AI features in React?
**Hruday:**
> "It depends on the feature type. For conversational AI with streaming, I show the bouncing typing indicator as soon as the user submits — it appears before the first token arrives, typically within 200ms. The moment the first token comes in, the typing indicator transitions to the streaming text with the blinking cursor. This is what users recognise from messaging apps, so the pattern feels natural. For non-streaming AI features like document summarisation, I use skeleton screens that match the layout of the actual content — similar shape, same number of text lines, same tag positions — with a shimmer animation. When the LLM returns, the content fades in over the skeleton. For long async jobs (30+ seconds), I show a progress bar with stage labels: 'Preparing', 'Analysing document', 'Generating response' — and an estimated seconds remaining. The key principle is that a generic spinner lasting more than 3 seconds signals a broken experience; AI loading states need to communicate that work is actively happening."

---

*Part 22 · AI Loading States — Typing Indicators, Progress Bars, Skeleton Screens · Full Stack Interview Guide · Hruday D · 2026*
