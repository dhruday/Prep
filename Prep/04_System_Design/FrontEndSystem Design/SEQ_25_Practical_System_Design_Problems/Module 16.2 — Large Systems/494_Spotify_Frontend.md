# 494 – Spotify Frontend System Design

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Spotify's frontend is an audio streaming and discovery platform that tests **audio streaming** (Web Audio API, gapless playback, crossfade), **offline-first architecture** (IndexedDB cache, Service Worker, download queue), **real-time sync** (cross-device playback via Spotify Connect), **complex state management** (player state, queue, playlists, search), and a **desktop app via web tech** (Electron + custom protocol). The core challenge is delivering gapless, instant-feeling audio playback while keeping the browse experience snappy across web, desktop (Electron), and mobile.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Spotify Client Shell                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                Navigation + Search Bar                   │ │
│  ├──────────┬──────────────────────────────┬───────────────┤ │
│  │ Sidebar  │     Main Content Area        │ Now Playing   │ │
│  │          │                              │ (Right Panel) │ │
│  │ Library  │  ┌────────────────────┐      │               │ │
│  │ Playlists│  │ Home / Browse      │      │ Queue         │ │
│  │ Podcasts │  │ Artist / Album     │      │ Lyrics        │ │
│  │ Liked    │  │ Playlist View      │      │ Related       │ │
│  │          │  │ Search Results     │      │               │ │
│  │          │  └────────────────────┘      │               │ │
│  ├──────────┴──────────────────────────────┴───────────────┤ │
│  │              Player Bar (Fixed Bottom)                   │ │
│  │  ◄◄  ▶  ►►  |  ───●──────────  2:31 / 3:45  🔊 ────   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Audio Playback Architecture

```
Audio Pipeline:
───────────────
Encrypted Audio Stream (OGG Vorbis / AAC)
          │
          ▼
   ┌──────────────┐
   │ Fetch/Stream  │ ← Range requests for audio segments
   │ Controller    │ ← Pre-fetch next track's first 30s
   └──────┬───────┘
          │
   ┌──────▼───────┐
   │ Decryption    │ ← Widevine CDM (EME API)
   │ Layer         │ ← DRM-protected content
   └──────┬───────┘
          │
   ┌──────▼───────┐
   │ Web Audio API │ ← AudioContext → GainNode → AnalyserNode
   │ Graph         │ ← Crossfade: two sources, fade gain
   └──────┬───────┘
          │
   ┌──────▼───────┐
   │ AudioContext  │ ← Output to speakers
   │ .destination  │ ← Volume control via GainNode
   └──────────────┘
```

```typescript
// ──── Audio Player Core ────
class SpotifyPlayer {
  private audioContext: AudioContext;
  private currentSource: AudioBufferSourceNode | null = null;
  private nextSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private analyser: AnalyserNode;

  constructor() {
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.analyser = this.audioContext.createAnalyser();
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  async play(trackUrl: string) {
    const response = await fetch(trackUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = audioBuffer;
    this.currentSource.connect(this.gainNode);
    this.currentSource.start();

    // Pre-fetch next track for gapless playback
    this.currentSource.onended = () => this.playNext();
  }

  // ──── Crossfade between tracks ────
  async crossfadeTo(nextTrackUrl: string, fadeMs = 3000) {
    const response = await fetch(nextTrackUrl);
    const buffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(buffer);

    // Create new gain nodes for crossfade
    const fadeOutGain = this.audioContext.createGain();
    const fadeInGain = this.audioContext.createGain();

    // Ramp current track gain to 0
    fadeOutGain.gain.setValueAtTime(1, this.audioContext.currentTime);
    fadeOutGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeMs / 1000);

    // Ramp new track gain from 0 to 1
    fadeInGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    fadeInGain.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + fadeMs / 1000);

    this.nextSource = this.audioContext.createBufferSource();
    this.nextSource.buffer = audioBuffer;
    this.nextSource.connect(fadeInGain).connect(this.audioContext.destination);
    this.nextSource.start();

    // Clean up old source after fade
    setTimeout(() => {
      this.currentSource?.stop();
      this.currentSource = this.nextSource;
    }, fadeMs);
  }

  setVolume(value: number) {
    // value: 0.0 → 1.0
    this.gainNode.gain.setValueAtTime(value, this.audioContext.currentTime);
  }
}
```

### Queue & State Management

```typescript
// ──── Player State (Zustand) ────
interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];           // for "previous" button
  isPlaying: boolean;
  position: number;           // current time in seconds
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'track' | 'context';

  // Actions
  play: (track: Track, context?: Track[]) => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (position: number) => void;
  addToQueue: (track: Track) => void;
  toggleShuffle: () => void;
  setRepeat: (mode: 'off' | 'track' | 'context') => void;
}

const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  history: [],
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 0.8,
  shuffle: false,
  repeat: 'off',

  play: (track, context) => {
    const state = get();
    if (context) {
      const idx = context.findIndex(t => t.id === track.id);
      set({
        currentTrack: track,
        queue: state.shuffle
          ? shuffleArray(context.filter(t => t.id !== track.id))
          : context.slice(idx + 1),
        isPlaying: true,
      });
    } else {
      set({ currentTrack: track, isPlaying: true });
    }
  },

  next: () => {
    const { queue, currentTrack, repeat, history } = get();
    if (repeat === 'track') {
      // Replay same track
      set({ position: 0 });
      return;
    }
    if (queue.length === 0) {
      if (repeat === 'context') {
        // Restart context — re-queue history
        set({ queue: history, history: [], position: 0 });
      }
      return;
    }
    const next = queue[0];
    set({
      currentTrack: next,
      queue: queue.slice(1),
      history: currentTrack ? [...history, currentTrack] : history,
      position: 0,
    });
  },

  previous: () => {
    const { history, currentTrack, queue, position } = get();
    // If > 3s into track, restart current track
    if (position > 3) {
      set({ position: 0 });
      return;
    }
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      currentTrack: prev,
      history: history.slice(0, -1),
      queue: currentTrack ? [currentTrack, ...queue] : queue,
      position: 0,
    });
  },

  // ... other actions
}));
```

### Spotify Connect (Cross-Device Sync)

```
Cross-Device Architecture:
──────────────────────────
 Phone                   Desktop                  Speaker
 (Controller)            (Player)                 (Player)
    │                       │                        │
    │ "Play X on Desktop"   │                        │
    │───────────────────►   │                        │
    │    WebSocket           │                        │
    │                       │ Starts playback         │
    │                       │                        │
    │ "Transfer to Speaker" │                        │
    │────────────────────────────────────────────►    │
    │                       │ Stops                   │ Starts
    │                       │                        │
    │ Position sync every 5s (via MQTT / WebSocket)  │
    │◄──────────────────────────────────────────────► │
```

```typescript
// ──── Spotify Connect Client ────
class SpotifyConnect {
  private ws: WebSocket;
  private deviceId: string;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.ws = new WebSocket('wss://connect.spotify.com');
    this.ws.onmessage = this.handleMessage;
  }

  private handleMessage = (event: MessageEvent) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case 'TRANSFER_PLAYBACK':
        if (msg.targetDeviceId === this.deviceId) {
          // This device becomes the active player
          usePlayerStore.getState().play(msg.track, msg.context);
          usePlayerStore.getState().seek(msg.position);
        }
        break;

      case 'POSITION_SYNC':
        // Sync position from active device
        if (msg.deviceId !== this.deviceId) {
          usePlayerStore.setState({ position: msg.position });
        }
        break;

      case 'COMMAND':
        // Remote control: play/pause/next/prev
        const store = usePlayerStore.getState();
        if (msg.command === 'pause') store.pause();
        if (msg.command === 'next') store.next();
        if (msg.command === 'previous') store.previous();
        break;
    }
  };

  transferPlayback(targetDeviceId: string) {
    const state = usePlayerStore.getState();
    this.ws.send(JSON.stringify({
      type: 'TRANSFER_PLAYBACK',
      targetDeviceId,
      track: state.currentTrack,
      context: state.queue,
      position: state.position,
    }));
  }
}
```

### Offline Download Manager

```typescript
// ──── Service Worker + IndexedDB for Offline ────
class DownloadManager {
  private db: IDBDatabase;
  private downloadQueue: Track[] = [];

  async downloadPlaylist(playlist: Playlist) {
    for (const track of playlist.tracks) {
      this.downloadQueue.push(track);
    }
    this.processQueue();
  }

  private async processQueue() {
    while (this.downloadQueue.length > 0) {
      const track = this.downloadQueue[0];
      try {
        // Download audio file
        const response = await fetch(track.audioUrl);
        const blob = await response.blob();

        // Store in IndexedDB
        const tx = this.db.transaction('tracks', 'readwrite');
        tx.objectStore('tracks').put({
          id: track.id,
          metadata: track,
          audioBlob: blob,
          downloadedAt: Date.now(),
        });

        this.downloadQueue.shift();
        this.emitProgress(track.id, 'complete');
      } catch (err) {
        this.emitProgress(track.id, 'error');
        break; // retry later
      }
    }
  }

  async getOfflineTrack(trackId: string): Promise<Blob | null> {
    const tx = this.db.transaction('tracks', 'readonly');
    const record = await tx.objectStore('tracks').get(trackId);
    return record?.audioBlob ?? null;
  }
}
```

### Playlist View with Virtualization

```typescript
function PlaylistView({ playlistId }: { playlistId: string }) {
  const { data } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: () => fetchPlaylist(playlistId),
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: data?.tracks.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // fixed row height
    overscan: 10,
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      {/* Playlist Header */}
      <PlaylistHeader playlist={data} />

      {/* Virtualized Track List */}
      <div
        role="table"
        aria-label={`${data?.name} tracks`}
        style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
      >
        <div role="rowgroup">
          {virtualizer.getVirtualItems().map(vRow => {
            const track = data!.tracks[vRow.index];
            return (
              <div
                key={track.id}
                role="row"
                ref={virtualizer.measureElement}
                data-index={vRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${vRow.start}px)`,
                  width: '100%',
                  height: 56,
                }}
                onClick={() => usePlayerStore.getState().play(track, data!.tracks)}
              >
                <TrackRow track={track} index={vRow.index + 1} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

### Anti-Patterns

- ❌ Using `<audio>` tag directly — no crossfade, gapless, or visualizer support. Use Web Audio API.
- ❌ Fetching entire audio file before playing — stream with Range requests for instant start.
- ❌ No pre-fetch of next track — causes gap between songs. Pre-fetch next track's first 30s.
- ❌ Global state for everything — separate player state (Zustand) from UI state (React Query).
- ❌ Re-rendering entire playlist on position update — isolate player progress bar updates.
- ❌ No offline support — use Service Worker + IndexedDB for downloaded tracks.

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Spotify Actual Tech Stack
- **Desktop**: Electron app with custom C++ audio engine
- **Web**: React + TypeScript, Web Audio API
- **State**: Custom internal state management (similar to Redux)
- **Design System**: "Encore" — internal design system
- **Audio**: OGG Vorbis (320kbps premium), AAC (256kbps)
- **Streaming Protocol**: Custom protocol over HTTPS, not HLS/DASH
- **A/B Testing**: Every feature tested with 1-5% of users first

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd design Spotify's frontend around four core systems: audio playback, content browsing, queue/state management, and cross-device sync.*

*Audio: Web Audio API with an AudioContext graph — source → gain → analyser → destination. Crossfade: overlap two sources and ramp their GainNodes linearly. Gapless: pre-fetch and decode the next track so it's ready to start the instant the current one ends.*

*Queue State: Zustand store with currentTrack, queue array, and history stack. Shuffle: Fisher-Yates on context minus current track. Repeat: 'track' restarts current, 'context' re-queues history when queue empties. Previous: if > 3s into track, restart; else pop from history.*

*Browse: TanStack Query for playlists, albums, search. Playlist view virtualized with @tanstack/virtual (fixed 56px row height, 10k+ tracks in some playlists). Prefetch adjacent content on hover.*

*Spotify Connect: WebSocket connection per device. Transfer playback sends track + position to target device. Position synced every 5s. Commands (play/pause/next) forwarded to active device."*

────────────────────────────────────────────────────────────

## 5. ✅ WHY & HOW SUMMARY

**Why:** Spotify tests audio streaming, real-time sync, offline-first, and complex state management — patterns that transfer to any media application.
**How:** Web Audio API graph → crossfade via GainNode ramp → Zustand player state → WebSocket device sync → IndexedDB offline → virtualized playlists.
**Companies:** Spotify, Apple Music, YouTube Music, Amazon Music, SoundCloud.
