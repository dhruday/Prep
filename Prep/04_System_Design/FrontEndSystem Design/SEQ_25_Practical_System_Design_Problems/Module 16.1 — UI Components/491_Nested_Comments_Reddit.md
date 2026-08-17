# 491. Nested Comments (Reddit-Style)

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
A **nested/threaded comment system** renders a recursive tree of comments where each reply is visually indented under its parent, forming a hierarchical conversation thread. Reddit, Hacker News, GitHub Issues, Jira, and Confluence all use this pattern.

**Why it exists:**
Linear comment lists (YouTube-style) break down when conversations branch. Threaded comments preserve context: you can see exactly which comment a reply addresses. This is essential for technical discussions, code reviews, and support threads.

**When and where it's used:**
- Reddit, Hacker News — deeply nested, collapsible threads
- GitHub — PR review comments (threaded by diff line)
- Jira / Confluence — issue and page comments
- Slack — thread sidebar (semi-nested)

**Role in large-scale applications:**
At scale (Reddit: 2B+ comments), the system must handle: (a) recursive rendering of 1000+ node trees without blocking the main thread, (b) collapse/expand of subtrees, (c) optimistic updates for votes and replies, (d) real-time new comment injection, (e) pagination at depth (Reddit's "continue this thread →" cutoff).

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. Data Model**

```typescript
interface Comment {
  id: string;
  parentId: string | null;      // null = root comment
  postId: string;               // belongs to which post
  author: {
    id: string;
    username: string;
    avatarUrl: string;
  };
  body: string;                 // markdown content
  score: number;                // upvotes - downvotes
  userVote: -1 | 0 | 1;        // current user's vote
  createdAt: string;            // ISO 8601
  editedAt: string | null;
  isDeleted: boolean;           // soft delete — "[deleted]"
  isCollapsed: boolean;         // client-side state
  depth: number;                // computed — distance from root
  childCount: number;           // total descendants (for "N more replies")
  children?: Comment[];         // populated client-side
}
```

**Flat vs Nested API response:**

```
Option A: Flat array (Reddit's actual API)
──────────────────────────────────────
[
  { id: "c1", parentId: null, ... },
  { id: "c2", parentId: "c1", ... },
  { id: "c3", parentId: "c2", ... },
  { id: "c4", parentId: "c1", ... },
]
→ Client builds tree: O(n) with a Map

Option B: Pre-nested (GraphQL)
──────────────────────────────────────
{
  id: "c1",
  children: [
    { id: "c2", children: [{ id: "c3", children: [] }] },
    { id: "c4", children: [] },
  ]
}
→ Already a tree — no client transform needed
→ Downside: harder to paginate at depth
```

### **B. Tree Construction from Flat Array**

```typescript
function buildCommentTree(comments: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];

  // First pass: index all comments & init children
  for (const comment of comments) {
    map.set(comment.id, { ...comment, children: [] });
  }

  // Second pass: link parent → child
  for (const comment of map.values()) {
    if (comment.parentId === null) {
      roots.push(comment);
    } else {
      const parent = map.get(comment.parentId);
      if (parent) {
        parent.children!.push(comment);
      } else {
        // Orphan — parent not fetched yet (depth cutoff)
        roots.push(comment);
      }
    }
  }

  // Sort children by score (descending) at each level
  const sortChildren = (node: Comment) => {
    node.children!.sort((a, b) => b.score - a.score);
    node.children!.forEach(sortChildren);
  };
  roots.sort((a, b) => b.score - a.score);
  roots.forEach(sortChildren);

  return roots;
}
// Time: O(n), Space: O(n) — single pass with Map
```

### **C. Recursive Rendering**

```tsx
// ──── CommentThread (Entry Point) ────
function CommentThread({ postId }: { postId: string }) {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['comments', postId],
    queryFn: ({ pageParam = null }) => fetchComments(postId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const comments = useMemo(() => {
    const flat = data?.pages.flatMap(p => p.comments) ?? [];
    return buildCommentTree(flat);
  }, [data]);

  return (
    <div role="feed" aria-label="Comments">
      {comments.map(comment => (
        <CommentNode key={comment.id} comment={comment} depth={0} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>
          Load more comments
        </button>
      )}
    </div>
  );
}
```

```tsx
// ──── CommentNode (Recursive) ────
const MAX_DEPTH = 8; // Reddit uses ~10

function CommentNode({ comment, depth }: { comment: Comment; depth: number }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  if (depth >= MAX_DEPTH && comment.children!.length > 0) {
    return (
      <div style={{ marginLeft: depth * 24 }}>
        <CommentContent comment={comment} depth={depth} />
        <a href={`/comments/${comment.id}`} className="continue-thread">
          Continue this thread →
        </a>
      </div>
    );
  }

  return (
    <article
      aria-label={`Comment by ${comment.author.username}`}
      style={{ marginLeft: depth > 0 ? 24 : 0 }}
    >
      {/* Collapse line — click to collapse entire subtree */}
      {depth > 0 && (
        <button
          className="collapse-line"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} thread by ${comment.author.username}`}
        />
      )}

      {isCollapsed ? (
        <CollapsedComment comment={comment} onExpand={() => setIsCollapsed(false)} />
      ) : (
        <>
          <CommentContent comment={comment} depth={depth} />
          <CommentActions
            comment={comment}
            onReply={() => setIsReplying(true)}
          />

          {isReplying && (
            <ReplyEditor
              parentId={comment.id}
              postId={comment.postId}
              onCancel={() => setIsReplying(false)}
              onSubmit={() => setIsReplying(false)}
            />
          )}

          {/* Recursive children */}
          {comment.children!.map(child => (
            <CommentNode
              key={child.id}
              comment={child}
              depth={depth + 1}
            />
          ))}
        </>
      )}
    </article>
  );
}
```

### **D. Voting with Optimistic Updates**

```typescript
// ──── Vote Mutation ────
function useVote(commentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (direction: 1 | -1) =>
      api.post(`/comments/${commentId}/vote`, { direction }),

    onMutate: async (direction) => {
      // Cancel in-flight refetches
      await queryClient.cancelQueries({ queryKey: ['comments'] });

      // Snapshot for rollback
      const previous = queryClient.getQueryData(['comments']);

      // Optimistic update
      queryClient.setQueryData(['comments'], (old: any) =>
        updateCommentInTree(old, commentId, (c: Comment) => {
          const prevVote = c.userVote;
          const newVote = prevVote === direction ? 0 : direction;
          return {
            ...c,
            userVote: newVote,
            score: c.score - prevVote + newVote,
          };
        })
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Rollback on failure
      if (context?.previous) {
        queryClient.setQueryData(['comments'], context.previous);
      }
    },
  });
}

// ──── Helper: Update a single comment within nested tree ────
function updateCommentInTree(
  data: any,
  targetId: string,
  updater: (c: Comment) => Comment
): any {
  return {
    ...data,
    pages: data.pages.map((page: any) => ({
      ...page,
      comments: page.comments.map((c: Comment) =>
        c.id === targetId ? updater(c) : c
      ),
    })),
  };
}
```

### **E. Reply with Optimistic Insert**

```typescript
function useAddReply(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ parentId, body }: { parentId: string; body: string }) =>
      api.post(`/posts/${postId}/comments`, { parentId, body }),

    onMutate: async ({ parentId, body }) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: Comment = {
        id: tempId,
        parentId,
        postId,
        author: getCurrentUser(),
        body,
        score: 1,
        userVote: 1,
        createdAt: new Date().toISOString(),
        editedAt: null,
        isDeleted: false,
        isCollapsed: false,
        depth: 0, // computed by buildTree
        childCount: 0,
      };

      queryClient.setQueryData(['comments', postId], (old: any) => ({
        ...old,
        pages: old.pages.map((page: any, i: number) =>
          i === old.pages.length - 1
            ? { ...page, comments: [...page.comments, optimistic] }
            : page
        ),
      }));

      return { tempId };
    },

    onSuccess: (serverComment, _vars, context) => {
      // Replace temp comment with server version (has real ID)
      queryClient.setQueryData(['comments', postId], (old: any) => ({
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          comments: page.comments.map((c: Comment) =>
            c.id === context!.tempId ? serverComment : c
          ),
        })),
      }));
    },
  });
}
```

### **F. Performance: Virtualization for Massive Threads**

Rendering 5000+ comments causes layout thrashing and memory pressure:

```
Problem:
────────
Reddit thread: 3000 visible comments → 3000 DOM nodes
Each ~200px tall → total scroll height ~600,000px
Browsers slow significantly past ~2000 DOM nodes

Solution Architecture:
──────────────────────
┌─────────────────────┐
│  Flattened Array     │ ← Tree flattened to visible-order array
│  (DFS traversal)     │   Collapsed subtrees skipped
├─────────────────────┤
│  Virtual Window      │ ← Only 20-30 items rendered
│  (react-window /     │   Items have variable height
│   @tanstack/virtual) │   Estimated height per depth level
├─────────────────────┤
│  Intersection        │ ← Lazy-load "continue thread" and
│  Observer            │   "load more replies" when visible
└─────────────────────┘
```

```typescript
// ──── Flatten tree for virtual list ────
interface FlatComment {
  comment: Comment;
  depth: number;
  isLastChild: boolean;    // for rendering thread lines
}

function flattenTree(
  nodes: Comment[],
  depth = 0,
  collapsed: Set<string>
): FlatComment[] {
  const result: FlatComment[] = [];
  
  nodes.forEach((node, index) => {
    result.push({
      comment: node,
      depth,
      isLastChild: index === nodes.length - 1,
    });

    // Skip children of collapsed comments
    if (!collapsed.has(node.id) && node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1, collapsed));
    }
  });

  return result;
}

// ──── Virtual List ────
function VirtualCommentThread({ postId }: { postId: string }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const { data } = useComments(postId);
  
  const flatList = useMemo(
    () => flattenTree(data ?? [], 0, collapsed),
    [data, collapsed]
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: flatList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      // Estimate based on depth — deeper = less text usually
      const depth = flatList[index].depth;
      return depth > 4 ? 80 : 120;
    },
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => {
          const { comment, depth } = flatList[virtualRow.index];
          return (
            <div
              key={comment.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
                width: '100%',
                paddingLeft: depth * 24,
              }}
            >
              <CommentContent comment={comment} depth={depth} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### **G. Real-Time Updates**

```typescript
// ──── WebSocket integration ────
function useRealtimeComments(postId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(`wss://api.example.com/ws/comments/${postId}`);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'NEW_COMMENT':
          queryClient.setQueryData(['comments', postId], (old: any) => {
            // Append to last page
            const pages = [...old.pages];
            const lastPage = { ...pages[pages.length - 1] };
            lastPage.comments = [...lastPage.comments, msg.comment];
            pages[pages.length - 1] = lastPage;
            return { ...old, pages };
          });
          break;

        case 'VOTE_UPDATE':
          queryClient.setQueryData(['comments', postId], (old: any) =>
            updateCommentInTree(old, msg.commentId, (c: Comment) => ({
              ...c,
              score: msg.newScore,
            }))
          );
          break;

        case 'DELETE_COMMENT':
          queryClient.setQueryData(['comments', postId], (old: any) =>
            updateCommentInTree(old, msg.commentId, (c: Comment) => ({
              ...c,
              isDeleted: true,
              body: '[deleted]',
            }))
          );
          break;
      }
    };

    return () => ws.close();
  }, [postId, queryClient]);
}
```

### **H. Thread Lines (Visual Nesting Indicator)**

```css
/* Reddit-style collapse lines */
.comment-node {
  position: relative;
}

.collapse-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
  border: none;
  padding: 0;
  cursor: pointer;
}

.collapse-line:hover {
  background: #3b82f6;
  width: 3px;
}

/* Indentation using CSS custom property */
.comment-node {
  padding-left: calc(var(--depth) * 24px);
}

/* Mobile: reduce indent */
@media (max-width: 768px) {
  .comment-node {
    padding-left: calc(var(--depth) * 12px);
  }
}

/* Max depth visual cutoff */
.comment-node[data-depth="8"] .collapse-line,
.comment-node[data-depth="9"] .collapse-line {
  display: none;
}
```

### **I. Anti-Patterns**

1. **Rendering entire tree without depth cutoff** → Malicious deep nesting freezes the page. Always cap at MAX_DEPTH.
2. **Nested API response without pagination** → 10,000 comments in one response. Use flat array + cursor pagination.
3. **No optimistic updates** → Vote feels laggy (300ms+ round trip). Always optimistically update score.
4. **innerHTML for comment body** → XSS attack vector. Use DOMPurify + a markdown renderer.
5. **Re-rendering entire tree on single vote** → Use memo/context to localize re-renders.
6. **requestAnimationFrame in recursive render** → Unnecessary. React batches updates already.

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Reddit Architecture:**

```
API: Flat array response with cursor pagination
─────────────────────────────────────────────
GET /r/programming/comments/abc123?sort=best&limit=100

Response:
{
  data: {
    children: [
      { kind: "t1", data: { id: "c1", parent_id: "t3_abc123", ... } },
      { kind: "t1", data: { id: "c2", parent_id: "t1_c1", ... } },
      { kind: "more", data: { id: "_", children: ["c7","c8","c9"], count: 42 } }
    ]
  }
}

"more" objects → "Continue this thread" / "N more replies"
Client-side tree construction from flat list
Depth limit: ~10 levels, then "Continue this thread →"
```

### **Hacker News:**

```
API: Each comment is a separate request
────────────────────────────────────
GET /v0/item/12345.json → { id, kids: [12346, 12347], ... }
GET /v0/item/12346.json → { id, kids: [...], ... }

Extremely inefficient — requires N+1 requests
Firebase-based, real-time updates
Flat rendering — no visual thread lines (just indent)
```

### **GitHub PR Review:**

```
Comments threaded by diff line, not by reply chain
──────────────────────────────────────────────────
POST /repos/:owner/:repo/pulls/:pull/comments
{
  body: "This needs a null check",
  commit_id: "abc123",
  path: "src/utils.ts",
  line: 42
}

Thread = all comments on same (path, line) pair
Max depth: 1 level (flat thread per line)
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Answer:**

> *"For a nested comment system, I'd start with the data model: each comment has an `id`, `parentId`, `postId`, `body`, `score`, and `userVote`. The API returns a flat array with cursor pagination — the client builds the tree in O(n) using a Map.*
>
> *Rendering: recursive `CommentNode` component that renders its children array. Each level indents by 24px. Depth-capped at 8-10 levels with a 'Continue this thread →' link (Reddit pattern). Collapse/expand via a vertical line — clicking it hides the entire subtree.*
>
> *Voting: optimistic updates via TanStack Query's `onMutate`. I snapshot the previous state, update the score immediately, and roll back on error. Reply: optimistic insert with a temp ID, replaced by the server's real ID on success.*
>
> *For scale (1000+ comments): flatten the visible tree (skip collapsed subtrees) and virtualize with @tanstack/virtual. Variable height estimation based on depth level. Lazy-load deep threads via Intersection Observer.*
>
> *Real-time: WebSocket subscription per post, handling NEW_COMMENT, VOTE_UPDATE, and DELETE events by patching the query cache.*
>
> *At SAP, we built threaded comment systems in collaboration tools — the key lesson was always sanitize markdown with DOMPurify before rendering, and cap recursion depth to prevent rendering attacks."*

### **Follow-up Questions & Answers:**

- **"How do you prevent XSS in user-generated comments?"** → Sanitize on server (store clean HTML) AND on client (DOMPurify before rendering). Never use `dangerouslySetInnerHTML` without sanitization.
- **"How would you handle editing a comment?"** → PUT endpoint, `editedAt` timestamp, show "(edited)" badge. Optimistic update body text locally.
- **"How does sorting work across nested levels?"** → Sort children at each depth independently (by score, by time, by controversial ratio). Reddit's "best" sort uses Wilson score interval.
- **"What about deleted comments with replies?"** → Soft delete: show "[deleted]" placeholder but keep children visible. Hard delete only if no children.

────────────────────────────────────
## 5. Comparison Table
────────────────────────────────────

| Dimension | Reddit | Hacker News | GitHub | Slack | Disqus |
|-----------|--------|-------------|--------|-------|--------|
| Max Depth | ~10 | Unlimited | 1 | 1 | 5 |
| Nesting Visual | Thread lines | Indent only | Grouped by line | Sidebar thread | Thread lines |
| Collapse | Subtree | Subtree | Thread | No | Subtree |
| Voting | Up/Down | Up only | Reaction emoji | Emoji | Up/Down |
| Sort Options | Best/Top/New/Old/Controversial/Q&A | By time only | By time | By time | Best/Newest/Oldest |
| Pagination | Flat + "more" objects | Per-item fetch | Per-page | Load more | Cursor |
| Real-time | WebSocket + polling | Firebase | WebSocket | WebSocket | Polling |
| Rich Text | Markdown + inline media | Plain text + links | GitHub Markdown | Blocks/Markdown | Rich editor |

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

**Why:** Nested comments are a staple machine coding round question — it tests recursion, tree data structures, optimistic updates, virtualization, and real-time patterns all in one problem. Every FAANG-level frontend role expects fluency here.
**How:** Flat API → Map-based tree construction (O(n)) → recursive rendering with depth cap → CSS Grid indent + thread lines → optimistic vote/reply mutations → virtualization for scale → WebSocket for real-time.
**Companies:** Reddit (threaded comments), Meta (Facebook comments), Microsoft (Teams/GitHub), Google (YouTube threaded replies), Amazon (product Q&A).
