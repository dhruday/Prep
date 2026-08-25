# 243 – Comment System

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A Comment System at scale handles threaded discussions with nested replies, reactions, sorting (top/newest/oldest), pagination, real-time updates, rich text (mentions, links, emoji), moderation, and optimistic updates. Unlike a simple nested comment thread widget, this is a **full system design** covering the data architecture, API design (pagination strategy for nested comments), real-time delivery, abuse prevention (rate limiting, content filtering), and rendering performance for deep threads. It's asked frequently because it combines CRUD operations with real-time features and complex data structures.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Data Model

```typescript
interface Comment {
  id: string;
  parentId: string | null;         // null = root comment
  entityId: string;                 // the post/article being commented on
  entityType: 'post' | 'article' | 'video';
  author: { id: string; name: string; avatar: string };
  content: string;                  // rich text with @mentions
  mentions: string[];               // mentioned user IDs
  reactions: Record<string, number>;
  myReaction: string | null;
  replyCount: number;              // total nested replies
  status: 'active' | 'deleted' | 'flagged' | 'moderated';
  createdAt: string;
  editedAt: string | null;
}
```

### API Design: Paginated Nested Comments

```
GET /api/posts/{postId}/comments?sort=top&cursor=abc&limit=20
→ Returns root-level comments (top 20)
→ Each comment has `replyCount` but NOT inline replies

GET /api/comments/{commentId}/replies?cursor=def&limit=10
→ Returns replies to a specific comment (lazy loaded)
→ First 2 replies may be preloaded ("Show 8 more replies")
```

This two-level API avoids loading the entire comment tree upfront.

### State Management: Normalized

```typescript
interface CommentsState {
  byId: Record<string, Comment>;
  rootIds: string[];                    // root-level comment IDs
  repliesByParent: Record<string, string[]>;  // parentId → childIds
  sortOrder: 'top' | 'newest' | 'oldest';
  rootCursor: string | null;
  replyCursors: Record<string, string | null>;
  replyExpanded: Set<string>;           // which parents have loaded replies
}
```

### Real-Time Updates

```typescript
// WebSocket events for comments
ws.on('comment.new', (comment) => {
  dispatch(addComment(comment));
  if (comment.parentId) {
    dispatch(incrementReplyCount(comment.parentId));
  }
  // Show "New comments" pill instead of auto-inserting 
  // (avoid disrupting reading position)
});

ws.on('comment.deleted', ({ commentId }) => {
  dispatch(markDeleted(commentId)); // Show "[deleted]" placeholder
});
```

### Mentions System

```typescript
// @mention autocomplete in comment input
function CommentInput({ entityId }: { entityId: string }) {
  const [text, setText] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<User[]>([]);

  const handleChange = (value: string) => {
    setText(value);
    // Detect @mention trigger
    const match = value.match(/@(\w+)$/);
    if (match) {
      setMentionQuery(match[1]);
      fetchUsers(match[1]).then(setMentionResults);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (user: User) => {
    setText(text.replace(/@\w+$/, `@${user.name} `));
    setMentionQuery(null);
  };
  // ...
}
```

### Moderation & Abuse Prevention

- **Rate limiting**: Max 5 comments per minute per user
- **Content filtering**: Profanity filter + AI toxicity detection (server-side)
- **Spam detection**: Same content repeated, URL patterns
- **User blocking**: Blocked user's comments hidden client-side
- **Report flow**: Flag comment → moderator queue → action (delete/warn/ban)

### Anti-Patterns

- ❌ Loading the full comment tree upfront — use lazy-loaded replies
- ❌ Auto-inserting new comments while user reads — show "New comments" pill
- ❌ Allowing raw HTML in comments — XSS vulnerability (sanitize with DOMPurify)
- ❌ No optimistic updates — comment appears only after server roundtrip (feels slow)
- ❌ Hard-deleting comments with replies — replies become orphans (use soft delete with "[deleted]" placeholder)

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: YouTube Comments
YouTube uses a two-level comment system: root comments + one level of replies. Replies are lazy-loaded ("View X replies"). Sort options: Top, Newest. Comments are paginated with cursor-based API. Real-time updates for new comments use a polling mechanism (not WebSocket).

### Hruday @ SAP Labs
At SAP, collaboration features in Fiori apps include threaded comments on documents and records. Comments are stored as OData entities with parentId for threading. The same normalized state + lazy reply loading architecture applies.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd design a two-level comment system: root comments are paginated (cursor-based, 20 per page), and replies are lazy-loaded per parent ('View 8 more replies').*

*State: normalized `byId` map with `rootIds` array and `repliesByParent` map. This gives O(1) lookups and easy nested rendering without deep state cloning.*

*API: `GET /posts/{id}/comments?sort=top&cursor=x&limit=20` for roots, `GET /comments/{id}/replies?cursor=y&limit=10` for replies. First 2 replies preloaded inline.*

*Posting: optimistic insert — comment appears immediately with 'posting...' status, server confirms with real ID. Mentions use an @-trigger autocomplete (detect `@\w+` regex, show user suggestions).*

*Real-time: WebSocket pushes new comments. Instead of auto-inserting (disrupts reading), I show a 'New comments' pill that user clicks to load. Deleted comments become '[deleted]' placeholders (soft delete preserves reply thread structure).*

*Security: All comment content sanitized server-side. Client-side renders text-only (no HTML). @mentions resolved to user IDs, not raw HTML links."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Comment Thread Component
function CommentThread({ entityId }: { entityId: string }) {
  const rootIds = useSelector(s => s.comments.rootIds);
  const byId = useSelector(s => s.comments.byId);
  const [sortOrder, setSortOrder] = useState<'top' | 'newest'>('top');

  return (
    <section aria-label="Comments">
      <SortSelector value={sortOrder} onChange={setSortOrder} />
      <CommentInput entityId={entityId} parentId={null} />
      <div role="feed" aria-busy={isLoading}>
        {rootIds.map(id => (
          <CommentNode key={id} comment={byId[id]} depth={0} />
        ))}
      </div>
      {hasMore && <button onClick={loadMoreRoots}>Load more comments</button>}
    </section>
  );
}

function CommentNode({ comment, depth }: { comment: Comment; depth: number }) {
  const replies = useSelector(s => s.comments.repliesByParent[comment.id] ?? []);
  const byId = useSelector(s => s.comments.byId);
  const [showReplies, setShowReplies] = useState(false);

  return (
    <article style={{ marginLeft: Math.min(depth, 4) * 24 }}
             aria-label={`Comment by ${comment.author.name}`}>
      <header>{comment.author.name} · {timeAgo(comment.createdAt)}</header>
      <p>{comment.status === 'deleted' ? '[deleted]' : comment.content}</p>
      <ReactionBar commentId={comment.id} />
      <button onClick={() => setShowReplies(!showReplies)}>
        {comment.replyCount} replies
      </button>
      {showReplies && (
        <>
          {replies.map(id => <CommentNode key={id} comment={byId[id]} depth={depth + 1} />)}
          {comment.replyCount > replies.length && (
            <button onClick={() => loadReplies(comment.id)}>Show more replies</button>
          )}
        </>
      )}
    </article>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Comment System = Two-Level Pagination + Normalized State + Lazy Replies + Soft Delete."** Roots paginated by cursor (top/newest sort). Replies lazy-loaded per parent ("Show X replies"). State: `byId` + `rootIds` + `repliesByParent`. Optimistic posting. Real-time: "New comments" pill instead of auto-insert. Soft delete: "[deleted]" preserves thread. Mentions: @-trigger autocomplete. Security: no raw HTML rendering.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Tests nested data structures, pagination design (especially nested pagination), real-time updates, moderation, and content security — common in every content platform.
**How:** Two-level API (roots + lazy replies). Normalized state. Cursor-based pagination with sort options. Optimistic posting. WebSocket for live updates with "new comments" pill. Soft-delete preserves threads. DOMPurify for XSS prevention.
**Companies:** Microsoft (Teams discussions, LinkedIn comments), Adobe (Behance comments), Salesforce (Chatter comments), Cisco (Webex Space threads).
