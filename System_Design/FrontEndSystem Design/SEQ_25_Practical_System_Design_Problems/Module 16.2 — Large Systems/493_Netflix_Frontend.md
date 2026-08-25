# 493 – Netflix Frontend System Design

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Netflix's frontend is a content discovery and adaptive video streaming platform that tests **adaptive bitrate streaming** (HLS/DASH, ABR algorithms), **personalized content catalog** (rows of carousels, A/B tested layouts), **pre-fetching and buffering** (predictive content loading), **TV/remote-friendly navigation** (spatial navigation, focus management), and **SSR + edge caching** (Node.js BFF, personalized at edge). The key challenge is delivering smooth 4K video startup in < 2s while dynamically personalizing the browse experience across web, Smart TVs, game consoles, and mobile.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
                    ┌─────────────────────────┐
                    │     Edge CDN (OCA)       │  ← Netflix Open Connect
                    │  Video chunks + images   │     Appliances in ISPs
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼──────────────────────┐
        │                        │                      │
   ┌────▼─────┐           ┌─────▼──────┐         ┌─────▼──────┐
   │  Browse   │           │  Playback  │         │  Search    │
   │  Page     │           │  Page      │         │  Page      │
   │           │           │            │         │            │
   │ Hero      │           │ Video      │         │ Type-ahead │
   │ Billboard │           │ Player     │         │ Results    │
   │ Rows of   │           │ (custom)   │         │ Voice      │
   │ Carousels │           │ ABR engine │         │ Search     │
   │ Preview   │           │ Subtitles  │         │            │
   │ Hover     │           │ Controls   │         │            │
   └───────────┘           └────────────┘         └────────────┘
        │                        │
   ┌────▼────────────────────────▼─────────────────────────────┐
   │  Data Layer: Falcor (JSON Graph) → GraphQL migration       │
   │  - Personalization API (ranked rows)                       │
   │  - Playback manifest API (ABR profiles)                    │
   │  - A/B test config (UI experiments)                        │
   └───────────────────────────────────────────────────────────┘
```

### Browse Page: Personalized Row Carousels

```typescript
// ──── Data Model ────
interface BrowsePage {
  hero: HeroBillboard;
  rows: ContentRow[];
}

interface ContentRow {
  id: string;
  title: string;            // "Because you watched Breaking Bad"
  rowType: 'standard' | 'top10' | 'continue-watching' | 'new-releases';
  items: ContentCard[];
  pagination: {
    nextPage: string | null;
    totalItems: number;
  };
}

interface ContentCard {
  id: string;
  title: string;
  synopsis: string;
  artworkUrl: {
    landscape: string;     // 16:9 — browse rows
    portrait: string;      // 2:3 — mobile
    logo: string;          // title treatment overlay
  };
  maturityRating: string;
  type: 'movie' | 'series';
  episodeInfo?: { season: number; episode: number; title: string };
  matchScore: number;       // personalization match %
  previewVideoUrl?: string; // auto-preview on hover
}
```

### Carousel with Keyboard/Remote/Touch Support

```typescript
function ContentCarousel({ row }: { row: ContentRow }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const itemsPerPage = useMediaQuery('(min-width: 1400px)') ? 6 : 4;

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;

    const newPage = direction === 'right'
      ? Math.min(page + 1, Math.ceil(row.items.length / itemsPerPage) - 1)
      : Math.max(page - 1, 0);

    container.scrollTo({
      left: newPage * container.clientWidth,
      behavior: 'smooth',
    });
    setPage(newPage);
  };

  return (
    <section aria-label={row.title}>
      <h2>{row.title}</h2>
      <div className="carousel-wrapper">
        {page > 0 && (
          <button className="carousel-arrow left" onClick={() => scroll('left')}
                  aria-label="Previous">‹</button>
        )}
        <div
          ref={scrollRef}
          className="carousel-track"
          role="list"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {row.items.map((item) => (
            <div key={item.id} role="listitem" style={{ scrollSnapAlign: 'start' }}>
              <ContentTile item={item} />
            </div>
          ))}
        </div>
        <button className="carousel-arrow right" onClick={() => scroll('right')}
                aria-label="Next">›</button>
      </div>
    </section>
  );
}
```

### Content Tile with Hover Preview

```typescript
function ContentTile({ item }: { item: ContentCard }) {
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<number>();
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    // Delay preview start by 1.5s (Netflix pattern)
    hoverTimer.current = window.setTimeout(() => setHovered(true), 1500);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current);
    setHovered(false);
    videoRef.current?.pause();
  };

  return (
    <div
      className={`tile ${hovered ? 'tile--expanded' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}  // keyboard/remote focus
      onBlur={handleMouseLeave}
      tabIndex={0}
      role="button"
      aria-label={`${item.title}, ${item.matchScore}% match`}
    >
      <img
        src={item.artworkUrl.landscape}
        alt=""
        loading="lazy"
        width={300}
        height={169}
      />
      {hovered && item.previewVideoUrl && (
        <div className="tile-preview">
          <video
            ref={videoRef}
            src={item.previewVideoUrl}
            autoPlay muted
            style={{ width: '100%' }}
          />
          <div className="tile-info">
            <h3>{item.title}</h3>
            <span className="match">{item.matchScore}% Match</span>
            <p>{item.synopsis}</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Video Playback: Adaptive Bitrate Streaming

```
ABR (Adaptive Bitrate) Flow:
─────────────────────────────
1. Client requests manifest (.mpd or .m3u8)
   → Contains available quality profiles:
     ┌─────────────────────────────────────┐
     │ Profile │ Resolution │ Bitrate      │
     ├─────────┼────────────┼──────────────┤
     │ 0       │ 240p       │ 235 kbps     │
     │ 1       │ 360p       │ 560 kbps     │
     │ 2       │ 720p       │ 2350 kbps    │
     │ 3       │ 1080p      │ 4500 kbps    │
     │ 4       │ 4K HDR     │ 15000 kbps   │
     └─────────┴────────────┴──────────────┘

2. ABR algorithm selects initial quality based on:
   - Network bandwidth estimate (navigator.connection.downlink)
   - Buffer health (buffered seconds ahead)
   - Device capabilities (screen resolution, DRM support)

3. During playback:
   - Monitor buffer level (target: 30-60s ahead)
   - If bandwidth drops → switch to lower profile
   - If buffer is healthy → gradually upgrade
   - Netflix "VMAF-optimized" encodes: same quality at lower bitrate
```

```typescript
// ──── Simplified ABR Controller ────
class ABRController {
  private profiles: QualityProfile[];
  private bandwidthEstimator: BandwidthEstimator;
  private bufferController: BufferController;

  selectQuality(): QualityProfile {
    const bandwidth = this.bandwidthEstimator.getEstimate();
    const bufferHealth = this.bufferController.getBufferedSeconds();

    // Conservative: use 80% of estimated bandwidth
    const safeBandwidth = bandwidth * 0.8;

    // Find highest profile that fits bandwidth
    let selected = this.profiles[0];
    for (const profile of this.profiles) {
      if (profile.bitrate <= safeBandwidth) {
        selected = profile;
      }
    }

    // If buffer is low (< 10s), force lower quality for faster fill
    if (bufferHealth < 10) {
      const idx = this.profiles.indexOf(selected);
      selected = this.profiles[Math.max(0, idx - 1)];
    }

    return selected;
  }
}

// ──── Buffer Controller ────
class BufferController {
  private video: HTMLVideoElement;

  getBufferedSeconds(): number {
    const buffered = this.video.buffered;
    if (buffered.length === 0) return 0;
    return buffered.end(buffered.length - 1) - this.video.currentTime;
  }
}
```

### TV / Remote Spatial Navigation

```typescript
// ──── Spatial Navigation for Smart TVs ────
// Netflix uses a custom spatial navigation engine because
// Smart TV browsers don't support standard focus management well.

type Direction = 'up' | 'down' | 'left' | 'right';

function useSpatialNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const direction = keyToDirection(e.key); // ArrowUp → 'up'
      if (!direction) return;

      e.preventDefault();
      const current = document.activeElement as HTMLElement;
      const candidates = document.querySelectorAll('[data-focusable]');
      const next = findNearestInDirection(current, candidates, direction);
      next?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}

function findNearestInDirection(
  from: HTMLElement,
  candidates: NodeListOf<Element>,
  direction: Direction
): HTMLElement | null {
  const fromRect = from.getBoundingClientRect();
  let best: HTMLElement | null = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    if (candidate === from) continue;
    const rect = candidate.getBoundingClientRect();

    // Check if candidate is in the right direction
    const isValid =
      (direction === 'right' && rect.left > fromRect.left) ||
      (direction === 'left' && rect.right < fromRect.right) ||
      (direction === 'down' && rect.top > fromRect.top) ||
      (direction === 'up' && rect.bottom < fromRect.bottom);

    if (!isValid) continue;

    const distance = Math.hypot(
      rect.left - fromRect.left,
      rect.top - fromRect.top
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate as HTMLElement;
    }
  }

  return best;
}
```

### Anti-Patterns

- ❌ Loading all rows upfront — lazy-load rows as they scroll into view
- ❌ Autoplay preview immediately on hover — delay 1-2s to avoid accidental triggers
- ❌ Fixed video quality — use ABR with bandwidth estimation and buffer monitoring
- ❌ No pre-buffering — pre-fetch first 30s of likely-next content (Continue Watching)
- ❌ Standard focus management on TVs — need custom spatial navigation engine
- ❌ Huge artwork images — serve different sizes per device (TV: landscape, mobile: portrait)

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Netflix Actual Tech Stack
- **Framework**: Custom React-based framework for web; native SDKs for TV/mobile
- **Data**: Migrating from Falcor (JSON Graph) to GraphQL Federation
- **Video**: Custom video player with MSE (Media Source Extensions), EME (Encrypted Media Extensions) for DRM (Widevine, FairPlay, PlayReady)
- **CDN**: Open Connect Appliances — Netflix boxes inside ISP data centers
- **A/B Testing**: Everything is tested — row order, artwork, synopsis, hover delay

### Netflix Performance Budget
- **Time to first meaningful row**: < 1s (SSR + edge cache)
- **Video start time**: < 2s (pre-buffer + aggressive ABR start)
- **Browse page JS bundle**: < 300KB gzipped (code-split per route)

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd design Netflix's frontend around three core experiences: Browse (content discovery), Playback (video streaming), and Search.*

*Browse: Server renders personalized rows (each row = carousel of content cards). Rows load lazily as user scrolls vertically. Each carousel supports horizontal scroll/swipe/arrow-key navigation. Content tiles expand on hover after a 1.5s delay, showing a muted preview video and metadata.*

*Video: Use MSE (Media Source Extensions) with a custom ABR engine. The manifest lists quality profiles (240p → 4K). ABR selects quality based on bandwidth estimate × 0.8 and buffer health. Target 30-60s buffer ahead. If buffer < 10s, downgrade quality for faster fill. Start at mid-quality and ramp up.*

*TV: Custom spatial navigation engine. Arrow keys move focus to nearest focusable element in that direction, using bounding rect distance calculations.*

*Data: GraphQL with edge caching. Personalization happens server-side (ML ranking). Client receives pre-ranked rows. Artwork variants (landscape/portrait/logo) served per device.*

*At SAP, I implemented similar carousel patterns in Fiori — lazy-loaded horizontal scrollers with keyboard navigation for accessibility compliance, including spatial focus management for touch-screen kiosk deployments."*

────────────────────────────────────────────────────────────

## 5. ✅ WHY & HOW SUMMARY

**Why:** Netflix is the canonical video streaming system design question — tests ABR, MSE, buffer management, personalized catalogs, carousel UX, and multi-device support.
**How:** SSR personalized rows → lazy-load carousels → hover preview with delay → ABR video player with MSE → spatial navigation for TV → edge CDN for video chunks.
**Companies:** Netflix, Disney+, YouTube, Amazon Prime Video, Spotify (for audio streaming parallels).
