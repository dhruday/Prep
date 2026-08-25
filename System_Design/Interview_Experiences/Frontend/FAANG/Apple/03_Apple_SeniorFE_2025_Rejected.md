# Apple — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | ICT4 Frontend Engineer |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Cupertino, CA (Remote) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Apple Music Web |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)
- **Rejection Reason:** CSS deep dive — couldn't implement container queries correctly

---

## Round 1: CSS / Visual Design
**Duration:** 60 minutes

### Questions Asked
1. **Implement a responsive music player UI** (like Apple Music mini player)
   - Album art with blur background
   - Progress bar (draggable scrubber)
   - Responsive: mini → compact → full
2. **Explain container queries vs media queries — when to use which**

### 💡 Music Player CSS

```css
/* Mini player styles */
.music-player {
  --player-bg: var(--album-color-dominant, #1a1a1a);
  --player-accent: var(--album-color-vibrant, #ff375f);
  
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--player-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  color: white;
  transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  container-type: inline-size;
  container-name: player;
}

/* Container query responsive layouts */
/* Compact: < 400px (sidebar, widget) */
@container player (max-width: 400px) {
  .player-layout {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    height: 64px;
  }
  
  .album-art { width: 48px; height: 48px; border-radius: 6px; }
  .track-info { flex: 1; min-width: 0; }
  .track-title { font-size: 14px; }
  .controls-secondary { display: none; }
  .progress-bar { display: none; }
}

/* Medium: 400-700px (standard) */
@container player (min-width: 400px) and (max-width: 700px) {
  .player-layout {
    display: grid;
    grid-template-areas:
      "art info controls"
      "progress progress progress";
    grid-template-columns: 56px 1fr auto;
    gap: 12px;
    padding: 12px 16px;
  }
  
  .album-art { grid-area: art; width: 56px; height: 56px; border-radius: 8px; }
  .track-info { grid-area: info; }
  .controls-primary { grid-area: controls; }
  .progress-bar { grid-area: progress; }
  .controls-secondary { display: none; }
}

/* Full: > 700px (desktop) */
@container player (min-width: 700px) {
  .player-layout {
    display: grid;
    grid-template-columns: 260px 1fr 260px;
    align-items: center;
    padding: 8px 24px;
    height: 90px;
  }
  
  .left-section { display: flex; align-items: center; gap: 16px; }
  .center-section { text-align: center; }
  .right-section { display: flex; justify-content: flex-end; gap: 8px; }
  
  .album-art { width: 56px; height: 56px; border-radius: 8px; }
}

/* Progress bar with custom scrubber */
.progress-bar {
  position: relative;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  cursor: pointer;
  transition: height 0.15s ease;
}

.progress-bar:hover {
  height: 6px;
}

.progress-bar:hover .scrubber {
  opacity: 1;
  transform: scale(1);
}

.progress-fill {
  height: 100%;
  background: var(--player-accent);
  border-radius: inherit;
  position: relative;
}

.scrubber {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%) scale(0);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 0 4px rgba(0,0,0,0.3);
  opacity: 0;
  transition: opacity 0.15s, transform 0.15s;
}

/* Album art with blur background effect */
.album-art-wrapper {
  position: relative;
}

.album-art-wrapper::before {
  content: '';
  position: absolute;
  inset: -20%;
  background: var(--album-art-url);
  background-size: cover;
  filter: blur(40px) brightness(0.4);
  z-index: -1;
}
```

```jsx
function MusicPlayer({ track, isPlaying, progress, onSeek, onPlayPause }) {
  const progressRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Draggable progress bar
  const handleSeek = (clientX) => {
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(percent * track.duration);
  };
  
  const handlePointerDown = (e) => {
    setIsDragging(true);
    handleSeek(e.clientX);
    progressRef.current.setPointerCapture(e.pointerId);
  };
  
  const handlePointerMove = (e) => {
    if (isDragging) handleSeek(e.clientX);
  };
  
  const handlePointerUp = () => setIsDragging(false);
  
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="music-player" style={{ '--album-color-dominant': track.dominantColor }}>
      <div className="player-layout">
        <div className="left-section">
          <div className="album-art-wrapper">
            <img src={track.albumArt} alt={`${track.album} album art`} className="album-art" />
          </div>
          <div className="track-info">
            <div className="track-title" title={track.title}>{track.title}</div>
            <div className="track-artist">{track.artist}</div>
          </div>
        </div>
        
        <div className="center-section">
          <div className="controls-primary">
            <button aria-label="Previous track">⏮</button>
            <button onClick={onPlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button aria-label="Next track">⏭</button>
          </div>
          
          <div className="progress-wrapper">
            <span className="time-current" aria-hidden="true">{formatTime(progress)}</span>
            <div
              ref={progressRef}
              className="progress-bar"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              role="slider"
              aria-label="Track progress"
              aria-valuemin={0}
              aria-valuemax={track.duration}
              aria-valuenow={Math.round(progress)}
              aria-valuetext={`${formatTime(progress)} of ${formatTime(track.duration)}`}
            >
              <div className="progress-fill" style={{ width: `${(progress / track.duration) * 100}%` }}>
                <div className="scrubber" />
              </div>
            </div>
            <span className="time-total" aria-hidden="true">{formatTime(track.duration)}</span>
          </div>
        </div>
        
        <div className="right-section controls-secondary">
          <button aria-label="Volume">🔊</button>
          <button aria-label="Queue">☰</button>
        </div>
      </div>
    </div>
  );
}
```

**Container Queries vs Media Queries:**
```
Container Queries:
- Respond to PARENT container size, not viewport
- Use case: reusable components that adapt to their container
  (e.g., music player in sidebar vs main content vs widget)
- @container player (min-width: 400px) { }
- Requires: container-type: inline-size on parent
- Limitation: can't query height (would cause layout cycle)

Media Queries:
- Respond to VIEWPORT size
- Use case: page-level layouts (sidebar collapse, nav → hamburger)
- @media (min-width: 768px) { }
- More browser support (container queries: ~95% as of 2025)

Apple Music uses BOTH:
- Media queries for page layout (Library/Browse/Search tabs)
- Container queries for player (adapts in sidebar, mini-player, full-screen)
```

---

## 🎯 Key Takeaways
- Apple FE = **CSS mastery + pixel-perfect design + accessibility**
- **Container queries** (`@container`) = respond to parent size, not viewport — essential for reusable components
- **Pointer Events API**: `setPointerCapture` for drag — works for both mouse and touch
- **backdrop-filter: blur()**: Apple's signature frosted glass effect
- **Scrubber UX**: hidden by default, appears on hover with scale transition
- **Progress bar as slider**: ARIA `role="slider"` with `aria-valuetext` for screen readers
- Apple rejected on **container queries**: couldn't explain `container-type: inline-size` prevents height query circular dependency
- Know **Apple Human Interface Guidelines** (HIG) for UI design principles

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| CSS / Visual | Very Hard | Container Queries, Blur, Custom Slider |
| JavaScript | Medium-Hard | Pointer Events, Animation |
| System Design | Hard | Music Streaming, Offline, DRM |
| Behavioral | Medium | Apple Values, Collaboration |
