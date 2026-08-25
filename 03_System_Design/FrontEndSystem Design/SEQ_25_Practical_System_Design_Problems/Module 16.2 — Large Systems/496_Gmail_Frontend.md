# 496 – Gmail Frontend System Design

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Gmail's frontend is a data-intensive, offline-capable email client that tests **virtualized list rendering** (10K+ emails without DOM bloat), **offline-first architecture** (Service Worker + IndexedDB), **rich text composition** (ContentEditable / ProseMirror editor), **real-time sync** (push notifications for new email, label sync), **search with autocomplete** (debounced, highlighted results), and **keyboard-driven navigation** (Gmail shortcuts: j/k to navigate, e to archive). The key challenge is making a web app feel as fast and reliable as a native desktop email client across 1.8B users.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Gmail SPA Shell                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  App Bar: Search | Compose | Settings                    │ │
│  ├──────────┬─────────────────────────────┬────────────────┤ │
│  │ Sidebar  │   Thread List               │ Reading Pane   │ │
│  │          │   (Virtualized)             │                │ │
│  │ Inbox    │   ┌───────────────────────┐ │ From:  Alice   │ │
│  │ Starred  │   │ ★ Alice — Meeting...  │ │ To:    Me      │ │
│  │ Sent     │   │   Bob — PR Review...  │ │ Subject: ...   │ │
│  │ Drafts   │   │ ★ Carol — Invoice...  │ │                │ │
│  │ Labels   │   │   Dave — Deploy not...│ │ [email body    │ │
│  │ ── More  │   │   Eve — Lunch today?  │ │  rendered HTML │ │
│  │          │   └───────────────────────┘ │  in sandboxed  │ │
│  │          │   [Select all | Archive |   │  iframe]       │ │
│  │          │    Delete | Mark read]      │                │ │
│  ├──────────┴─────────────────────────────┴────────────────┤ │
│  │         Compose Modal (Floating, Draggable)              │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface Email {
  id: string;
  threadId: string;
  from: Contact;
  to: Contact[];
  cc: Contact[];
  bcc: Contact[];
  subject: string;
  snippet: string;           // first 100 chars — for list preview
  body: string;              // HTML content
  bodyText: string;          // plain text fallback
  labels: Label[];           // INBOX, STARRED, IMPORTANT, custom
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments: Attachment[];
  date: string;
  internalDate: number;      // epoch ms — for sorting
}

interface Thread {
  id: string;
  subject: string;
  messages: Email[];         // ordered by date
  labels: Label[];           // union of all message labels
  snippet: string;           // latest message snippet
  lastMessageDate: string;
  participantCount: number;
  messageCount: number;
}

interface Label {
  id: string;
  name: string;
  type: 'system' | 'user';  // INBOX = system, "Work" = user
  color?: string;
  unreadCount: number;
  totalCount: number;
}
```

### Thread List with Virtualization

```typescript
function ThreadList({ labelId }: { labelId: string }) {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['threads', labelId],
    queryFn: ({ pageParam }) => fetchThreads(labelId, pageParam),
    getNextPageParam: (last) => last.nextPageToken,
    staleTime: 60_000, // 1 min — push updates handle freshness
  });

  const threads = useMemo(
    () => data?.pages.flatMap(p => p.threads) ?? [],
    [data]
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // compact row height
    overscan: 20,
  });

  // Infinite scroll
  const lastItem = virtualizer.getVirtualItems().at(-1);
  useEffect(() => {
    if (lastItem && lastItem.index >= threads.length - 10 && hasNextPage) {
      fetchNextPage();
    }
  }, [lastItem, threads.length, hasNextPage]);

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}
         role="grid" aria-label="Email threads">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(vRow => {
          const thread = threads[vRow.index];
          return (
            <ThreadRow
              key={thread.id}
              thread={thread}
              ref={virtualizer.measureElement}
              index={vRow.index}
              style={{
                position: 'absolute',
                top: 0,
                transform: `translateY(${vRow.start}px)`,
                width: '100%',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
```

### Keyboard Navigation (Gmail Shortcuts)

```typescript
function useGmailKeyboardShortcuts() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in compose
      if ((e.target as HTMLElement).isContentEditable) return;
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      switch (e.key) {
        case 'j': // Next thread
          setSelectedIndex(i => i + 1);
          break;
        case 'k': // Previous thread
          setSelectedIndex(i => Math.max(0, i - 1));
          break;
        case 'o': // Open thread
        case 'Enter':
          openSelectedThread();
          break;
        case 'e': // Archive
          archiveSelected();
          break;
        case '#': // Delete
          deleteSelected();
          break;
        case 's': // Star/unstar
          toggleStarSelected();
          break;
        case 'c': // Compose
          openCompose();
          break;
        case 'r': // Reply
          openReply();
          break;
        case '/': // Focus search
          e.preventDefault();
          document.querySelector<HTMLInputElement>('[data-search]')?.focus();
          break;
        case '?': // Show shortcuts help
          showShortcutsDialog();
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return { selectedIndex };
}
```

### Email Body Rendering (Sandboxed)

```typescript
// ──── Render email HTML safely in sandboxed iframe ────
function EmailBody({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Sanitize HTML first
    const clean = DOMPurify.sanitize(html, {
      ALLOW_TAGS: ['p', 'br', 'div', 'span', 'a', 'img', 'table', 'tr', 'td',
                    'th', 'b', 'i', 'u', 'strong', 'em', 'h1', 'h2', 'h3',
                    'ul', 'ol', 'li', 'blockquote', 'pre', 'code'],
      ALLOW_ATTR: ['href', 'src', 'alt', 'style', 'class', 'width', 'height'],
      FORBID_TAGS: ['script', 'form', 'iframe', 'object', 'embed'],
    });

    // Write to sandboxed iframe
    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: sans-serif; font-size: 14px; padding: 16px; margin: 0; }
            img { max-width: 100%; height: auto; }
            a { color: #1a73e8; }
            blockquote { border-left: 3px solid #ccc; margin-left: 8px; padding-left: 8px; }
          </style>
        </head>
        <body>${clean}</body>
        </html>
      `);
      doc.close();

      // Auto-resize iframe to content
      const resizeObserver = new ResizeObserver(() => {
        iframe.style.height = doc.body.scrollHeight + 'px';
      });
      resizeObserver.observe(doc.body);
    }
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"   // no scripts, no forms
      title="Email content"
      style={{ width: '100%', border: 'none' }}
    />
  );
}
```

### Compose Editor (Rich Text)

```typescript
// ──── Compose with contentEditable or ProseMirror ────
function ComposeEditor() {
  const [to, setTo] = useState<Contact[]>([]);
  const [subject, setSubject] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);

  // Auto-save draft every 3 seconds
  const draft = useDebouncedCallback(() => {
    saveDraft({
      to,
      subject,
      body: editorRef.current?.innerHTML ?? '',
    });
  }, 3000);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await sendEmail({
        to: to.map(c => c.email),
        subject,
        body: editorRef.current?.innerHTML ?? '',
      });
      closeCompose();
      showSnackbar('Message sent', { action: 'Undo', onAction: undoSend });
    } catch {
      showSnackbar('Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="compose-modal" role="dialog" aria-label="New message">
      <header>
        <h2>New Message</h2>
        <button onClick={closeCompose} aria-label="Close">×</button>
      </header>

      <ContactInput label="To" value={to} onChange={setTo} />
      <input
        type="text" placeholder="Subject" value={subject}
        onChange={e => { setSubject(e.target.value); draft(); }}
      />

      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Message body"
        onInput={draft}
        className="compose-body"
      />

      <footer>
        <button onClick={handleSend} disabled={isSending}>
          {isSending ? 'Sending...' : 'Send'}
        </button>
        <FormatToolbar editorRef={editorRef} />
        <button onClick={() => { /* attach */ }} aria-label="Attach file">📎</button>
      </footer>
    </div>
  );
}
```

### Offline Support (Service Worker + IndexedDB)

```typescript
// ──── Offline Email Cache ────
class EmailCache {
  private db: IDBDatabase;

  // Cache thread list for offline browsing
  async cacheThreads(labelId: string, threads: Thread[]) {
    const tx = this.db.transaction('threads', 'readwrite');
    for (const thread of threads) {
      tx.objectStore('threads').put({
        ...thread,
        _labelId: labelId,
        _cachedAt: Date.now(),
      });
    }
  }

  // Queue compose/reply for sending when back online
  async queueOutgoing(email: Partial<Email>) {
    const tx = this.db.transaction('outbox', 'readwrite');
    tx.objectStore('outbox').add({
      ...email,
      _queuedAt: Date.now(),
      _status: 'pending',
    });
  }

  // Sync outbox when online
  async flushOutbox() {
    const tx = this.db.transaction('outbox', 'readwrite');
    const pending = await tx.objectStore('outbox')
      .index('status').getAll('pending');

    for (const email of pending) {
      try {
        await sendEmail(email);
        tx.objectStore('outbox').delete(email.id);
      } catch {
        // Will retry next sync
      }
    }
  }
}

// Listen for online event
window.addEventListener('online', () => {
  emailCache.flushOutbox();
});
```

### Search with Autocomplete

```typescript
function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    fetchSuggestions(debouncedQuery).then(setSuggestions);
  }, [debouncedQuery]);

  return (
    <div role="combobox" aria-expanded={suggestions.length > 0}>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search mail"
        aria-label="Search mail"
        data-search
      />
      {suggestions.length > 0 && (
        <ul role="listbox">
          {suggestions.map(s => (
            <li key={s.id} role="option">
              <HighlightedText text={s.text} query={query} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Anti-Patterns

- ❌ Rendering all 10K emails in DOM — virtualize the thread list
- ❌ `dangerouslySetInnerHTML` for email body — sandboxed iframe + DOMPurify
- ❌ No draft auto-save — user loses work on crash. Debounce save every 3s.
- ❌ Blocking send → confirmed pattern — use undo-based send (delay actual send by 5-10s)
- ❌ Full page refresh on label switch — SPA with cached query per label
- ❌ No offline — cache threads in IndexedDB, queue outgoing in outbox

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Gmail Actual Architecture
- **Framework**: Closure Library (legacy), migrating parts to Lit/Web Components
- **Rendering**: Custom virtual list, lazy-loaded thread bodies
- **Offline**: Service Worker + IndexedDB (Gmail Offline extension → now built-in)
- **Compose**: Custom rich text editor (not ContentEditable directly)
- **Search**: Google's full-text search infra — operators like `from:`, `has:attachment`, `after:2024/01/01`

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd design Gmail's frontend around five core modules: thread list, email viewer, compose, search, and offline.*

*Thread list: Virtualized with @tanstack/virtual. Cursor-based pagination from the API. Compact rows (40px). Keyboard shortcuts (j/k navigate, e archive, s star) with a global keydown listener that checks if focus is in an editable area first.*

*Email viewer: HTML body rendered in a sandboxed iframe (sandbox='allow-same-origin', no allow-scripts). DOMPurify sanitizes first. iframe auto-resizes via ResizeObserver.*

*Compose: ContentEditable div with formatting toolbar. Auto-save draft every 3s via debounce. Undo-based send: show 'Sent' snackbar with Undo button, delay actual API call by 5 seconds.*

*Search: Debounced autocomplete (300ms), combobox ARIA pattern, highlighted matching text. Support search operators (from:, has:, after:).*

*Offline: Service Worker caches the app shell. IndexedDB stores thread list and recently viewed emails. Outbox queue for composed emails — flushed on 'online' event.*

*At SAP, I built similar offline-capable UIs for Fiori apps — IndexedDB caching with sync queues for field service workers who needed to access records without connectivity."*

────────────────────────────────────────────────────────────

## 5. ✅ WHY & HOW SUMMARY

**Why:** Gmail is the most complete frontend system design question — it covers virtualization, rich text editing, offline, search, keyboard shortcuts, and security (sandboxed HTML rendering).
**How:** Virtualized thread list → sandboxed iframe email body → ContentEditable compose with auto-save → keyboard shortcut manager → IndexedDB offline cache + outbox queue → Service Worker app shell.
**Companies:** Google (Gmail), Microsoft (Outlook), Apple (iCloud Mail), Yahoo Mail.
