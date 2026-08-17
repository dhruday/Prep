# 242 – LinkedIn-Style Feed

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A LinkedIn-Style Feed is a socially-ranked, infinite-scrolling content stream featuring posts with rich media, reactions, comments, shares, and personalized ranking. Unlike a simple reverse-chronological feed, it uses **algorithmic ranking** (relevance, engagement, recency), **diverse content types** (text, images, videos, articles, polls, job posts), **engagement interactions** (like, comment, share with different reaction types), and **connection-aware features** (show mutual connections, "X liked this"). It tests feed rendering, content hydration, SEO for public profiles, and engagement-driven UX patterns.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
Backend (Feed Service)
    │
    ├── REST API (paginated, cursor-based)
    │
    └── Feed Items (ranked by algorithm)
         │
         ▼
┌─────────────────────────────────────┐
│            Feed Container            │
│  ┌─────────────────────────────┐    │
│  │    FeedItem (Post)           │    │
│  │    ┌────────────────────┐   │    │
│  │    │ Author Header       │   │    │  ← avatar, name, title, time
│  │    │ Content (text/media)│   │    │  ← expandable "...see more"
│  │    │ Engagement Stats    │   │    │  ← "42 likes · 5 comments"
│  │    │ Action Bar          │   │    │  ← Like | Comment | Repost | Send
│  │    │ Comments (nested)   │   │    │  ← expandable, nested replies
│  │    └────────────────────┘   │    │
│  ├─────────────────────────────┤    │
│  │    FeedItem (Article Share) │    │
│  │    ...                      │    │
│  ├─────────────────────────────┤    │
│  │    FeedItem (Poll)          │    │
│  │    ...                      │    │
│  ├────── Sentinel (IntersectionObs) │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Data Model

```typescript
interface FeedItem {
  id: string;
  type: 'post' | 'article' | 'poll' | 'job' | 'event' | 'ad';
  author: { id: string; name: string; title: string; avatar: string; connectionDegree: 1 | 2 | 3 };
  content: {
    text: string;
    media?: { type: 'image' | 'video' | 'document'; url: string; thumbnail?: string }[];
    link?: { url: string; title: string; description: string; image: string };
  };
  engagement: {
    reactions: Record<ReactionType, number>;  // { like: 42, celebrate: 5, ... }
    commentCount: number;
    shareCount: number;
    myReaction: ReactionType | null;
  };
  socialProof: string;     // "Jane Doe and 3 others liked this"
  timestamp: string;
  visibility: 'public' | 'connections' | 'group';
}
```

### Feed Composition: Diverse Content Types

Each content type needs a dedicated renderer:
```typescript
function FeedItemRenderer({ item }: { item: FeedItem }) {
  switch (item.type) {
    case 'post': return <PostCard item={item} />;
    case 'article': return <ArticleCard item={item} />;
    case 'poll': return <PollCard item={item} />;
    case 'job': return <JobCard item={item} />;
    case 'event': return <EventCard item={item} />;
    case 'ad': return <AdCard item={item} />;
    default: return null;
  }
}
```

### "See More" Text Truncation

```typescript
function ExpandableText({ text, maxLines = 3 }: { text: string; maxLines: number }) {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    if (textRef.current) {
      setIsClamped(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [text]);

  return (
    <>
      <p ref={textRef} style={expanded ? {} : { 
        display: '-webkit-box', WebkitLineClamp: maxLines, 
        WebkitBoxOrient: 'vertical', overflow: 'hidden' 
      }}>
        {text}
      </p>
      {isClamped && !expanded && (
        <button onClick={() => setExpanded(true)}>...see more</button>
      )}
    </>
  );
}
```

### Reactions (Multiple Types)

LinkedIn has 6 reaction types: Like, Celebrate, Support, Love, Insightful, Funny.

```typescript
// Optimistic reaction toggle
function toggleReaction(postId: string, reactionType: ReactionType) {
  const current = posts[postId].engagement.myReaction;
  
  // Optimistic update
  if (current === reactionType) {
    dispatch(removeReaction(postId));          // un-react
  } else {
    dispatch(setReaction(postId, reactionType)); // change or add reaction
  }
  
  // API call
  api.post(`/posts/${postId}/react`, { type: current === reactionType ? null : reactionType });
}
```

### Performance

- **Image optimization**: `srcset` for responsive images. Lazy load media below fold.
- **Video**: Don't autoplay ALL videos. Use IntersectionObserver to play/pause based on visibility.
- **Virtualization**: For long feeds, use react-virtuoso (auto height measurement for varied card sizes).
- **Preload**: Prefetch next page when user is 80% through current page.

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: LinkedIn (Microsoft)
LinkedIn's feed uses algorithmic ranking based on engagement probability, recency, and connection relevance. Posts are SSR for SEO (public profiles). The feed uses cursor-based pagination with aggressive prefetching. Content type diversity (posts, articles, polls, ads) is managed by a feed composition layer.

### Hruday @ SAP Labs
At SAP, Fiori collaboration features display activity feeds similar to LinkedIn — user actions, approvals, comments in a timeline format. The feed card pattern (header → content → actions) is identical across enterprise and social platforms.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd design the feed as a virtualized infinite-scrolling list with diverse content cards. Each card type (post, article, poll, job, ad) has a dedicated renderer selected by a factory component based on `item.type`.*

*Pagination: cursor-based API with IntersectionObserver sentinel. I prefetch the next page when the user reaches 80% of the current batch. Items are cached in normalized state (`posts.byId`).*

*Engagement: reactions use optimistic UI — clicking 'Like' updates the count and icon immediately, then sends a PATCH. Comments expand inline with lazy loading (load first 2, 'Show more comments' loads rest). Social proof ('Jane and 3 others liked this') comes from the API.*

*Performance: Images use `srcset` with responsive breakpoints. Videos only autoplay when in viewport (IntersectionObserver). Text truncation uses CSS `-webkit-line-clamp` with a 'See more' button. Virtualization via react-virtuoso handles varied card heights.*

*SSR: Public feed items are server-rendered for SEO. Authenticated feed uses CSR after initial SSR hydration."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// LinkedIn-Style Feed with Diverse Content Types
function Feed() {
  const { items, isLoading, hasMore, loadMore } = useInfiniteFeed('/api/feed');

  return (
    <Virtuoso
      data={items}
      endReached={loadMore}
      itemContent={(index, item) => <FeedItemRenderer item={item} />}
      components={{
        Footer: () => isLoading ? <FeedSkeleton count={2} /> : null,
      }}
    />
  );
}

// Reaction Bar with Optimistic Update
function ReactionBar({ postId, engagement }: { postId: string; engagement: Engagement }) {
  const [myReaction, setMyReaction] = useState(engagement.myReaction);
  const [counts, setCounts] = useState(engagement.reactions);

  const handleReact = async (type: ReactionType) => {
    const prev = myReaction;
    // Optimistic
    if (prev === type) {
      setMyReaction(null);
      setCounts(c => ({ ...c, [type]: c[type] - 1 }));
    } else {
      setMyReaction(type);
      setCounts(c => ({
        ...c,
        [type]: c[type] + 1,
        ...(prev ? { [prev]: c[prev] - 1 } : {}),
      }));
    }
    // Server
    await fetch(`/api/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ type: prev === type ? null : type }),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  return (
    <div role="group" aria-label="Reactions">
      {reactionTypes.map(type => (
        <button key={type} aria-pressed={myReaction === type}
                onClick={() => handleReact(type)}>
          {reactionEmojis[type]} {counts[type] > 0 && counts[type]}
        </button>
      ))}
    </div>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"LinkedIn Feed = Diverse Cards + Cursor Scroll + Reactions + See More + Virtuoso."** Content types: post, article, poll, job, ad — factory pattern for rendering. Cursor-based infinite scroll with prefetch at 80%. Reactions: optimistic toggle with ReactionType array. Text: CSS line-clamp + "see more". Videos: autopause offscreen. Virtualized for varied card heights.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Tests feed composition (diverse content types), algorithmic ranking awareness, engagement interactions, media optimization, and infinite scroll — the complete social platform frontend.
**How:** Factory pattern for diverse card types. Cursor-based infinite scroll with virtualization. Optimistic reactions. CSS line-clamp for text truncation. IntersectionObserver for video autoplay. SSR for SEO, CSR for authenticated content.
**Companies:** Microsoft (LinkedIn — they OWN this), Adobe (Behance feed), Salesforce (Chatter feed), Cisco (Webex social features).
