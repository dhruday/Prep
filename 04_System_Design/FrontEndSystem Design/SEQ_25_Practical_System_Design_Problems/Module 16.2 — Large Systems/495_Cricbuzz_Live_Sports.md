# 495 – Cricbuzz / Live Sports Score Frontend

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A live sports scoring frontend (Cricbuzz, ESPN Cricinfo, ESPN) tests **real-time data delivery** (WebSocket/SSE for ball-by-ball updates), **efficient DOM updates** (updating only changed cells in a scorecard), **push notifications** (Service Worker, fcm), **pagination of historical data** (ball-by-ball commentary), and **graceful degradation** (polling fallback, offline scorecard). The key challenge is delivering sub-second live score updates to millions of concurrent users while keeping the UI responsive during rapid multi-match scenarios.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌────────────────────────────────────────────────────┐
│                   Live Match Page                    │
│  ┌───────────────────────────────────────────────┐  │
│  │          Match Header                          │  │
│  │  IND 287/4 (42.3)  vs  AUS 312/10 (50.0)     │  │
│  │  ▶ LIVE — India need 26 runs from 46 balls    │  │
│  ├───────────────────────────────────────────────┤  │
│  │ Tabs: Scorecard | Commentary | Squads | Stats │  │
│  ├───────────────────────────────────────────────┤  │
│  │                                               │  │
│  │  ┌─────────── Mini Scorecard ──────────────┐  │  │
│  │  │ Batsman     R    B   4s  6s   SR        │  │  │
│  │  │ V. Kohli*  87   62   9   3   140.32     │  │  │
│  │  │ R. Jadeja   42   31   4   2   135.48     │  │  │
│  │  │ Bowler      O    M    R    W   Econ      │  │  │
│  │  │ P. Cummins  8.3  0   48   2   5.65      │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │                                               │  │
│  │  ┌─────── Ball-by-Ball Commentary ─────────┐  │  │
│  │  │ 42.3 — Cummins to Kohli, FOUR!          │  │  │
│  │  │        Short ball, pulled to boundary    │  │  │
│  │  │ 42.2 — Cummins to Kohli, 1 run          │  │  │
│  │  │ 42.1 — Cummins to Jadeja, no run        │  │  │
│  │  │        [Load more commentary...]         │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │                                               │  │
│  │  ┌──── Over Summary Bar ────┐                 │  │
│  │  │ 42: . 1 4 | 41: 1 W . 2 1 6 │             │  │
│  │  └──────────────────────────┘                 │  │
│  └───────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface LiveMatch {
  id: string;
  status: 'upcoming' | 'live' | 'completed' | 'abandoned';
  teams: [TeamScore, TeamScore];
  currentInnings: number;
  result?: string;
  venue: string;
  startTime: string;
  lastUpdated: string;
}

interface TeamScore {
  team: Team;
  innings: Innings[];
}

interface Innings {
  number: number;
  runs: number;
  wickets: number;
  overs: number;           // decimal: 42.3 = 42 overs 3 balls
  runRate: number;
  batting: BatsmanScore[];
  bowling: BowlerFigures[];
  fallOfWickets: FallOfWicket[];
  extras: Extras;
}

interface BallEvent {
  id: string;
  over: number;
  ball: number;
  bowler: Player;
  batsman: Player;
  runs: number;
  extras: number;
  isWicket: boolean;
  isBoundary: boolean;
  isSix: boolean;
  commentary: string;
  timestamp: string;
  videoClipUrl?: string;   // highlight replay
}
```

### Real-Time Update Strategy

```
Transport Selection:
────────────────────
                  ┌──────────────┐
                  │ WebSocket     │ ← Primary (ball-by-ball events)
                  │ wss://live..  │   Latency: ~100ms
                  └──────┬───────┘
                         │ falls back to
                  ┌──────▼───────┐
                  │ SSE           │ ← Fallback (uni-directional)
                  │ /stream/match │   Latency: ~200ms
                  └──────┬───────┘
                         │ falls back to
                  ┌──────▼───────┐
                  │ Short Polling │ ← Last resort
                  │ GET /score    │   Latency: 3-5s
                  │ every 3s      │
                  └──────────────┘
```

```typescript
// ──── Live Score Connection with Fallback Chain ────
class LiveScoreConnection {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private pollInterval: number | null = null;

  connect(matchId: string, onUpdate: (event: ScoreUpdate) => void) {
    this.tryWebSocket(matchId, onUpdate);
  }

  private tryWebSocket(matchId: string, onUpdate: (event: ScoreUpdate) => void) {
    try {
      this.ws = new WebSocket(`wss://live.cricbuzz.com/ws/match/${matchId}`);

      this.ws.onmessage = (e) => {
        const event: ScoreUpdate = JSON.parse(e.data);
        onUpdate(event);
      };

      this.ws.onerror = () => {
        console.warn('WebSocket failed, falling back to SSE');
        this.ws?.close();
        this.trySSE(matchId, onUpdate);
      };

      this.ws.onclose = (e) => {
        if (e.code !== 1000) {
          // Abnormal close — reconnect with backoff
          setTimeout(() => this.tryWebSocket(matchId, onUpdate), 2000);
        }
      };
    } catch {
      this.trySSE(matchId, onUpdate);
    }
  }

  private trySSE(matchId: string, onUpdate: (event: ScoreUpdate) => void) {
    try {
      this.sse = new EventSource(`/api/stream/match/${matchId}`);

      this.sse.addEventListener('ball', (e) => {
        onUpdate(JSON.parse(e.data));
      });

      this.sse.onerror = () => {
        console.warn('SSE failed, falling back to polling');
        this.sse?.close();
        this.startPolling(matchId, onUpdate);
      };
    } catch {
      this.startPolling(matchId, onUpdate);
    }
  }

  private startPolling(matchId: string, onUpdate: (event: ScoreUpdate) => void) {
    this.pollInterval = window.setInterval(async () => {
      const res = await fetch(`/api/match/${matchId}/score`);
      const data = await res.json();
      onUpdate(data);
    }, 3000);
  }

  disconnect() {
    this.ws?.close();
    this.sse?.close();
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
```

### Efficient Scorecard Updates (Patch, Not Replace)

```typescript
// ──── Granular Score Updates ────
type ScoreUpdate =
  | { type: 'BALL'; ball: BallEvent; score: PartialScore }
  | { type: 'WICKET'; ball: BallEvent; fallOfWicket: FallOfWicket; score: PartialScore }
  | { type: 'OVER_END'; overSummary: OverSummary; score: PartialScore }
  | { type: 'INNINGS_END'; innings: number; finalScore: Innings }
  | { type: 'MATCH_END'; result: string };

// Only update changed fields — not the entire scorecard
function applyScoreUpdate(state: LiveMatch, update: ScoreUpdate): LiveMatch {
  switch (update.type) {
    case 'BALL': {
      const innings = state.teams[state.currentInnings].innings.at(-1)!;
      return {
        ...state,
        lastUpdated: new Date().toISOString(),
        teams: state.teams.map((team, i) =>
          i === state.currentInnings
            ? {
                ...team,
                innings: team.innings.map((inn, j) =>
                  j === team.innings.length - 1
                    ? {
                        ...inn,
                        runs: update.score.runs,
                        wickets: update.score.wickets,
                        overs: update.score.overs,
                        runRate: update.score.runRate,
                        // Update only the on-strike batsman's score
                        batting: inn.batting.map(b =>
                          b.player.id === update.ball.batsman.id
                            ? { ...b, runs: b.runs + update.ball.runs, balls: b.balls + 1 }
                            : b
                        ),
                      }
                    : inn
                ),
              }
            : team
        ),
      };
    }
    // ... WICKET, OVER_END, etc.
  }
}
```

### Multi-Match Dashboard

```typescript
// ──── Live Matches List (All Games Today) ────
function LiveMatchesDashboard() {
  const { data: matches } = useQuery({
    queryKey: ['live-matches'],
    queryFn: fetchLiveMatches,
    refetchInterval: 10_000, // poll for new matches every 10s
  });

  return (
    <div role="feed" aria-label="Live matches">
      {matches?.map(match => (
        <LiveMatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}

// Each card subscribes to its own WebSocket
function LiveMatchCard({ match }: { match: LiveMatch }) {
  const [score, setScore] = useState(match);
  const connectionRef = useRef<LiveScoreConnection>();

  useEffect(() => {
    if (match.status !== 'live') return;

    const conn = new LiveScoreConnection();
    conn.connect(match.id, (update) => {
      setScore(prev => applyScoreUpdate(prev, update));
    });
    connectionRef.current = conn;

    return () => conn.disconnect();
  }, [match.id, match.status]);

  return (
    <article aria-label={`${score.teams[0].team.name} vs ${score.teams[1].team.name}`}>
      <ScoreHeader score={score} />
      <MiniScorecard score={score} />
    </article>
  );
}
```

### Push Notifications (Service Worker)

```typescript
// ──── Service Worker: Background Notifications ────
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data?.json();

  if (data.type === 'WICKET') {
    event.waitUntil(
      self.registration.showNotification(`🏏 Wicket! ${data.matchTitle}`, {
        body: `${data.batsman} out for ${data.runs} — ${data.score}`,
        icon: '/cricket-icon-192.png',
        badge: '/cricket-badge-72.png',
        tag: `match-${data.matchId}`, // replace previous notification
        data: { url: `/match/${data.matchId}` },
        vibrate: [200, 100, 200],
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

### Anti-Patterns

- ❌ Replacing entire scorecard DOM on every ball — patch only changed cells
- ❌ Single WebSocket for all matches — separate connections per match for isolation
- ❌ No fallback transport — always provide SSE → polling fallback chain
- ❌ Polling every 1s at scale — uses server resources; use WebSocket + 3s poll fallback
- ❌ Raw score number without animation — use CSS counter + transition for score updates
- ❌ No stale indicator — show "last updated X seconds ago" during connection drops

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Cricbuzz Architecture
- WebSocket for ball-by-ball during peak traffic (IPL: 50M+ concurrent users)
- CDN-cached scorecard snapshots (5s TTL) as fallback for non-WebSocket clients
- Push notifications via FCM for wickets, boundaries, milestones
- Mobile-first responsive design — 70%+ traffic from mobile

### ESPN Cricinfo
- SSE-based live scoring
- Rich ball-by-ball commentary with video highlights
- Wagon wheel + pitch map visualizations (SVG + Canvas)

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd design a live cricket scoring frontend with three main systems: real-time transport, efficient DOM updates, and push notifications.*

*Transport: Primary is WebSocket for ball-by-ball events, with SSE fallback, and 3-second polling as last resort. Each match gets its own connection for isolation.*

*Updates: Events are typed (BALL, WICKET, OVER_END, INNINGS_END, MATCH_END). On each ball event, I patch only the changed fields — update the on-strike batsman's score, the team total, overs. Not a full re-render. React handles this efficiently with the immutable update pattern.*

*Multi-match: Dashboard subscribes to multiple WebSocket connections. Each match card is a self-contained component managing its own connection lifecycle.*

*Push: Service Worker handles background push notifications (FCM) for wickets and milestones. Tag-based notification replacement so users don't get spammed.*

*At SAP, I built a similar real-time dashboard for IoT sensor data at Bosch — WebSocket delivery with per-sensor subscriptions anda  patch-based state update strategy that kept CPU under 5% even with 100 concurrent data streams."*

────────────────────────────────────────────────────────────

## 5. ✅ WHY & HOW SUMMARY

**Why:** Live sports scoring is a canonical real-time system design question — tests WebSocket/SSE, efficient state patching, push notifications, and multi-connection management.
**How:** WebSocket ball events → typed ScoreUpdate discriminated union → immutable state patch → per-match connection isolation → Service Worker push → SSE/polling fallback chain.
**Companies:** Cricbuzz, ESPN, Google (live sports cards), Microsoft (Bing sports), Dream11.
