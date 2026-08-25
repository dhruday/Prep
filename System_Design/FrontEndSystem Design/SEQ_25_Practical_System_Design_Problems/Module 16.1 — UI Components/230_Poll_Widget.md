# 230 – Poll Widget

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A Poll Widget is a self-contained interactive component that allows users to vote on a question, see real-time results, and optionally view aggregate analytics. It's a common frontend system design interview question because it touches **component architecture**, **optimistic UI updates**, **real-time data synchronization**, **accessibility**, and **state management** — all in a deceptively simple-looking component. The design challenge scales from a basic radio-button form to a real-time, multi-tenant, analytics-tracked system handling millions of concurrent voters.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture & Component Boundaries

```
┌─────────────────────────────────────┐
│           PollWidget                │
│  ┌─────────────┐ ┌──────────────┐  │
│  │ PollQuestion │ │ PollResults  │  │
│  │  - question  │ │  - bar chart │  │
│  │  - options[] │ │  - % display │  │
│  └─────────────┘ └──────────────┘  │
│  ┌─────────────┐ ┌──────────────┐  │
│  │ PollOption   │ │ PollMetadata │  │
│  │  - label     │ │  - total     │  │
│  │  - vote()    │ │  - timestamp │  │
│  └─────────────┘ └──────────────┘  │
└─────────────────────────────────────┘
```

**Component Decomposition:**
- `PollWidget` — container, manages state, handles API calls
- `PollQuestion` — displays question text
- `PollOption` — individual option with radio button/clickable area
- `PollResults` — bar chart / percentage display
- `PollMetadata` — total votes, time remaining, share button

**State Machine:**
```
LOADING → VOTING → SUBMITTING → RESULTS
                      ↓ (error)
                   VOTING (retry)
```

### Data Flow & State

```typescript
interface PollState {
  question: string;
  options: { id: string; label: string; votes: number }[];
  totalVotes: number;
  userVote: string | null; // option ID or null
  status: 'loading' | 'voting' | 'submitting' | 'results' | 'closed';
  expiresAt?: number;
}
```

**Key decisions:**
- Show results BEFORE or AFTER voting? (trade-off: bias vs transparency)
- Allow vote changes? (complexity vs UX)
- Real-time updates? (WebSocket vs polling vs SSE)

### Performance Implications

- **Optimistic UI**: Update vote count immediately on click, revert on API failure
- **Debounce rapid clicks**: Prevent double-voting via disabled state + request dedup
- **Animation**: Animate result bars with CSS transitions, respect `prefers-reduced-motion`
- **Bundle size**: A poll widget should be < 5KB gzipped if built as a standalone component

### Scalability Considerations

- **10K concurrent voters**: Simple REST API + optimistic UI is sufficient
- **1M concurrent voters**: Use a write-behind counter service (Redis INCR) + WebSocket for live results
- **Vote deduplication**: Server-side using userId + pollId composite key, NOT client-side

### Anti-Patterns

- ❌ Storing vote counts in the frontend and syncing periodically — race conditions
- ❌ Using localStorage to prevent re-voting — easily cleared, not reliable
- ❌ Showing results before voting without an option to hide — creates anchoring bias
- ❌ No loading/error states — user has no feedback on vote submission
- ❌ Non-accessible radio buttons — custom-styled divs without `role="radio"` or `aria-checked`

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: Twitter/X Polls
Twitter handles millions of votes per poll. Architecture: votes go to a Kafka queue → Redis counter → eventual consistency to read replicas. The UI uses optimistic updates — your vote appears instantly, total count updates via polling every 30 seconds.

### FAANG-Scale: LinkedIn Polls
LinkedIn polls show results only after you vote (prevents bias) and use server-side deduplication per member ID. Results are cached at the CDN edge with a 60-second TTL.

### Hruday @ SAP Labs
At SAP, we built survey components in Fiori apps using UI5 that followed similar patterns — form submission with optimistic UI, accessible radio groups, and OData service integration for vote persistence. The same component decomposition applies.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"I'd decompose the poll widget into four components: PollWidget (container + state), PollQuestion, PollOption (accessible radio group), and PollResults (animated bar chart). State flows top-down from the container, which manages the state machine: loading → voting → submitting → results.*

*For the voting interaction, I use optimistic UI — the moment a user clicks an option, I increment the count locally and show results immediately while the POST request flies. If the request fails, I revert. Server-side, votes are deduplicated using a userId + pollId composite key in a Redis set.*

*For real-time results at scale, I'd use Server-Sent Events — the server pushes updated counts every 5 seconds. For millions of concurrent voters, votes hit a Kafka queue with Redis INCR for the counter, and reads come from an eventually consistent cache.*

*Accessibility: each option is a native radio input in a fieldset with a legend (the question). Results use aria-live='polite' so screen readers announce updates."*

### Likely Follow-up Questions

1. **"How do you prevent double voting?"** — Server-side: userId+pollId unique constraint. Client-side: disable button + optimistic state change.
2. **"What if the API is slow?"** — Optimistic UI with a loading indicator. If the request takes > 3s, show a subtle "saving..." message.
3. **"How would you handle a poll with 10M votes?"** — Redis INCR for atomic counters, Kafka for write buffering, CDN-cached read endpoint.
4. **"How do you make this accessible?"** — `<fieldset>` + `<legend>` for the question, native `<input type="radio">` for options, `aria-live="polite"` for results.

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// React Poll Widget — Core Architecture
interface PollOption {
  id: string;
  label: string;
  votes: number;
}

interface PollWidgetProps {
  pollId: string;
  question: string;
  options: PollOption[];
}

function PollWidget({ pollId, question, options: initialOptions }: PollWidgetProps) {
  const [options, setOptions] = useState(initialOptions);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [status, setStatus] = useState<'voting' | 'submitting' | 'results'>('voting');
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);

  const handleVote = async (optionId: string) => {
    // Optimistic update
    setUserVote(optionId);
    setStatus('results');
    setOptions(prev =>
      prev.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o)
    );

    try {
      await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionId }),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Revert optimistic update
      setUserVote(null);
      setStatus('voting');
      setOptions(initialOptions);
    }
  };

  return (
    <fieldset role="radiogroup" aria-label={question}>
      <legend>{question}</legend>
      {options.map(option => (
        <PollOptionItem
          key={option.id}
          option={option}
          totalVotes={totalVotes}
          isSelected={userVote === option.id}
          showResults={status === 'results'}
          onVote={() => handleVote(option.id)}
          disabled={status !== 'voting'}
        />
      ))}
      <p aria-live="polite">{totalVotes} total votes</p>
    </fieldset>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Poll = Radio Group + Optimistic Counter + Live Results."** Component tree: Container → Question → Options (radio group) → Results (bar chart). State machine: loading → voting → submitting → results. Three key decisions: (1) show results before or after voting, (2) optimistic vs pessimistic updates, (3) real-time via SSE/WS or periodic refresh. Accessibility: fieldset + legend + native radio inputs + aria-live for results.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
→ Poll widgets test component decomposition, state management, optimistic UI, accessibility, and real-time data — all in one question. Interviewers use this to gauge your ability to think end-to-end.

**How it works:**
→ Container component manages a state machine (voting → results). Options are an accessible radio group. Votes use optimistic UI updates with server-side deduplication. Real-time results use SSE or periodic polling. At scale, writes go through Kafka + Redis counters.

**Company relevance:**
→ **Microsoft**: Teams polls use this exact pattern. Expect questions about real-time updates and accessibility.
→ **Adobe**: Adobe Connect has live polling — focus on the interactive results animation.
→ **Salesforce**: Survey features in Salesforce use similar component patterns.
→ **Cisco**: Webex polling in meetings — focus on real-time sync and accessibility.
