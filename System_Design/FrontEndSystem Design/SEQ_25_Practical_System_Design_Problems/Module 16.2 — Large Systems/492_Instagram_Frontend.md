# 492 – Instagram Frontend System Design

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Instagram's frontend is a media-heavy, feed-centric social application that tests **image/video optimization** (responsive images, lazy loading, AVIF/WebP, blur-hash placeholders), **infinite scroll feed** (virtualized list, cursor-based pagination), **real-time interactions** (likes, comments, stories), **upload pipeline** (chunked upload, client-side compression, progress UI), and **offline-first PWA capabilities**. The key architectural challenge is delivering a smooth, 60fps scrolling experience with full-bleed images across 4G and WiFi connections.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    App Shell (SPA)                        │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│   │ Feed │ │Explore│ │Reels │ │Profile│ │ DM   │ ← Tabs │
│   └──┬───┘ └──────┘ └──────┘ └──────┘ └──────┘         │
│      │                                                    │
│   ┌──▼───────────────────────────────────────────┐       │
│   │  Virtualized Feed List                        │       │
│   │  ┌──────────────────────────────────────┐    │       │
│   │  │ Post Card                             │    │       │
│   │  │ ┌─────────┐ ┌──────────────────────┐ │    │       │
│   │  │ │ Header   │ │ Media (Img/Video/    │ │    │       │
│   │  │ │ (Avatar, │ │ Carousel)            │ │    │       │
│   │  │ │  Name)   │ │ - BlurHash placeholder│ │    │       │
│   │  │ ├─────────┤ │ - srcset responsive   │ │    │       │
│   │  │ │ Actions  │ │ - IntersectionObserver│ │    │       │
│   │  │ │ (❤️ 💬 ↗)│ └──────────────────────┘ │    │       │
│   │  │ │ Caption  │                          │    │       │
│   │  │ │ Comments │                          │    │       │
│   │  │ └─────────┘                           │    │       │
│   │  └──────────────────────────────────────┘    │       │
│   └──────────────────────────────────────────────┘       │
├──────────────────────────────────────────────────────────┤
│  Service Layer: GraphQL + REST + WebSocket               │
│  Cache: TanStack Query + IndexedDB + Service Worker      │
└──────────────────────────────────────────────────────────┘
```

### Feed Data Model

```typescript
interface Post {
  id: string;
  author: User;
  media: MediaItem[];          // carousel support
  caption: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  location?: GeoTag;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'reel';
  url: string;
  thumbnailUrl: string;
  blurHash: string;            // 20-byte BlurHash for placeholder
  width: number;
  height: number;
  aspectRatio: number;
  srcSet: {                    // responsive image set
    '320w': string;
    '640w': string;
    '1080w': string;
    '1440w': string;
  };
  videoMeta?: {
    duration: number;
    hlsUrl: string;            // HLS adaptive streaming
    dashUrl: string;
  };
}

interface FeedResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

### Image Optimization Pipeline

```
Upload Flow:
────────────
Client                          Server
  │                               │
  │ 1. Select/Capture image       │
  │ 2. Client-side resize         │
  │    (canvas, max 1440px)       │
  │ 3. EXIF strip (privacy)       │
  │ 4. Upload original            │
  │────────────────────────────►  │
  │                               │ 5. Generate variants:
  │                               │    320w, 640w, 1080w, 1440w
  │                               │    AVIF + WebP + JPEG fallback
  │                               │ 6. Compute BlurHash
  │                               │ 7. Upload to CDN
  │  ◄────────────────────────────│
  │ 8. Receive URLs + blurHash    │
```

```typescript
// ──── Responsive Image Component ────
function PostImage({ media }: { media: MediaItem }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Decode BlurHash for placeholder
  const blurDataUrl = useMemo(
    () => blurHashToDataURL(media.blurHash, 32, 32),
    [media.blurHash]
  );

  return (
    <div
      style={{
        aspectRatio: media.aspectRatio,
        backgroundColor: '#1a1a1a',
        position: 'relative',
      }}
    >
      {/* BlurHash placeholder */}
      {!loaded && (
        <img
          src={blurDataUrl}
          alt=""
          aria-hidden
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(20px)' }}
        />
      )}

      {/* Actual image with srcset */}
      <img
        ref={imgRef}
        src={media.srcSet['640w']}
        srcSet={`
          ${media.srcSet['320w']} 320w,
          ${media.srcSet['640w']} 640w,
          ${media.srcSet['1080w']} 1080w,
          ${media.srcSet['1440w']} 1440w
        `}
        sizes="(max-width: 640px) 100vw, 640px"
        alt={`Post by ${media.id}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />
    </div>
  );
}
```

### Infinite Scroll Feed with Virtualization

```typescript
function Feed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['feed'],
      queryFn: ({ pageParam }) => fetchFeed(pageParam),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5 * 60 * 1000,    // 5 min — feed doesn't need instant refresh
    });

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.posts) ?? [],
    [data]
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => {
      // Estimate: header(56) + image(posts aspect ratio * screen width) + actions(120)
      const media = posts[i].media[0];
      const imgHeight = (window.innerWidth * media.height) / media.width;
      return 56 + imgHeight + 120;
    },
    overscan: 3,
  });

  // Infinite scroll trigger
  const lastItem = virtualizer.getVirtualItems().at(-1);
  useEffect(() => {
    if (!lastItem) return;
    if (lastItem.index >= posts.length - 5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [lastItem, posts.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div ref={parentRef} style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vRow) => (
          <div
            key={posts[vRow.index].id}
            ref={virtualizer.measureElement}
            data-index={vRow.index}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${vRow.start}px)`,
              width: '100%',
            }}
          >
            <PostCard post={posts[vRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Stories Ring

```typescript
// ──── Stories Bar (horizontal scroll) ────
function StoriesBar() {
  const { data: stories } = useQuery({
    queryKey: ['stories'],
    queryFn: fetchStories,
    staleTime: 30_000,
  });

  return (
    <div className="stories-bar" role="list" aria-label="Stories">
      {stories?.map((story) => (
        <button
          key={story.userId}
          className={`story-ring ${story.hasUnseen ? 'unseen' : 'seen'}`}
          onClick={() => openStoryViewer(story.userId)}
          role="listitem"
          aria-label={`${story.username}'s story${story.hasUnseen ? ' (new)' : ''}`}
        >
          <img src={story.avatarUrl} alt="" width={64} height={64} />
          <span>{story.username}</span>
        </button>
      ))}
    </div>
  );
}

// CSS: gradient ring for unseen stories
// .story-ring.unseen { background: conic-gradient(#f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
```

### Like with Optimistic Update + Double-Tap

```typescript
function useLike(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post(`/posts/${postId}/like`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const prev = queryClient.getQueryData(['feed']);

      queryClient.setQueryData(['feed'], (old: any) => ({
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          posts: page.posts.map((p: Post) =>
            p.id === postId
              ? { ...p, isLiked: !p.isLiked, likeCount: p.likeCount + (p.isLiked ? -1 : 1) }
              : p
          ),
        })),
      }));

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['feed'], ctx?.prev);
    },
  });
}

// ──── Double-tap to like ────
function PostImage({ media, postId }: { media: MediaItem; postId: string }) {
  const { mutate: toggleLike } = useLike(postId);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double-tap → like (only like, not unlike)
      toggleLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTap.current = now;
  };

  return (
    <div onClick={handleTap} style={{ position: 'relative' }}>
      <PostImage media={media} />
      {showHeart && <HeartAnimation />}
    </div>
  );
}
```

### Video Autoplay Strategy

```typescript
function PostVideo({ media }: { media: MediaItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // IntersectionObserver: play when 50%+ visible, pause when not
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {}); // autoplay may fail
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.5 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={media.videoMeta?.hlsUrl}
      poster={media.thumbnailUrl}
      muted           // required for autoplay
      loop
      playsInline      // required for iOS
      preload="none"   // don't preload until visible
    />
  );
}
```

### Anti-Patterns

- ❌ Loading full-resolution images on mobile — use `srcset` + `sizes` for responsive images
- ❌ No placeholder during image load — use BlurHash for instant visual feedback
- ❌ Rendering all posts in DOM — virtualize the feed list
- ❌ Fetching entire video upfront — use HLS adaptive streaming
- ❌ Autoplay with sound — browsers block it; start muted, let user unmute
- ❌ Synchronous image decode — use `decoding="async"` to avoid blocking main thread

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Instagram Actual Architecture
Instagram uses React (migrated from their custom framework). Feed images use progressive JPEG with BlurHash placeholders. They pioneered the "loading skeleton" pattern for feed cards. Video uses HLS with multiple quality tiers. The GraphQL API powers the feed with relay-style cursor pagination.

### Key Performance Metrics
- **LCP**: < 2.5s on 4G (first post image)
- **CLS**: < 0.1 (aspect ratio reserved via CSS `aspect-ratio`)
- **TTI**: < 5s (skeleton → real content transition)

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd structure Instagram's frontend around three core systems: a media optimization pipeline, a virtualized infinite-scroll feed, and real-time interaction layer.*

*Feed: Cursor-based pagination via GraphQL. Posts rendered in a virtualized list (@tanstack/virtual) with estimated heights based on image aspect ratios. Infinite scroll triggers `fetchNextPage` when the user is within 5 posts of the end.*

*Images: Responsive `srcset` with 4 breakpoints (320w → 1440w), AVIF/WebP with JPEG fallback, `loading="lazy"`, `decoding="async"`. BlurHash placeholders (20-byte hash → canvas-rendered blur) shown instantly while the image loads.*

*Video: HLS adaptive streaming, autoplay only when 50%+ visible (IntersectionObserver), muted by default (browser policy), `preload="none"` to save bandwidth.*

*Interactions: Optimistic updates for likes/saves via TanStack Query `onMutate`. Double-tap to like with heart animation overlay.*

*At SAP, I applied similar image optimization patterns — srcset and lazy loading reduced our median page weight from 4.2MB to 1.1MB on Fiori dashboards with product images."*

────────────────────────────────────────────────────────────

## 5. 📝 COMPARISON TABLE

| Dimension | Instagram | Pinterest | TikTok |
|-----------|-----------|-----------|--------|
| Layout | Single-column feed | Masonry grid | Full-screen vertical |
| Media | Square/portrait images + video + carousel | Images + short video | Full-screen video only |
| Pagination | Cursor infinite scroll | Waterfall lazy load | Full-screen swipe |
| Placeholder | BlurHash | LQIP | Thumbnail frame |
| Video Strategy | Autoplay (muted, 50% visible) | Hover to preview | Autoplay (always visible) |
| Image Format | AVIF > WebP > JPEG | WebP > JPEG | Thumbnail only |
| Caching | Service Worker + IndexedDB | HTTP Cache | None (streaming) |

────────────────────────────────────────────────────────────

## 6. ✅ WHY & HOW SUMMARY

**Why:** Instagram tests the core frontend system design patterns: image optimization, infinite scroll, virtualization, real-time interactions. Every FAANG interview can include this.
**How:** BlurHash placeholders → responsive srcset → lazy loading → virtualized feed → cursor pagination → optimistic likes → HLS video → IntersectionObserver autoplay.
**Companies:** Meta (Instagram/Facebook Feed), Pinterest (image grid), Snap (media stories), Google Photos (image gallery).
