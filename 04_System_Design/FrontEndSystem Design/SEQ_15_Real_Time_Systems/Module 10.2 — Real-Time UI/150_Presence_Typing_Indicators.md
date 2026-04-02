# 150. Presence & Typing Indicators ★★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Presence indicators** tell users which other users are online/active (the green dot in Slack, Google Docs' avatar ring). **Typing indicators** tell users when someone is currently composing a message ("Alice is typing..."). Both are essential UX patterns in collaborative and messaging applications that require **real-time state broadcast** from each client to all others in the same context (room/document/channel). The key engineering challenges are: (1) efficiently broadcasting ephemeral state without overwhelming the server with WebSocket messages on every keystroke, (2) cleaning up "is typing" and "online" state when users disconnect or become idle, (3) scaling presence data to thousands of concurrent users without every client maintaining connections to every other client. The Bosch real-time dashboard work maps directly here — broadcasting operator presence and "currently editing" indicators across concurrent shift workers.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Presence System Architecture

```
Client A (typing) → WebSocket → Server (pub/sub per room) → WebSocket → Client B, C, D
                                      ↕
                              Redis pub/sub (cross-instance)
                              (for multiple WebSocket server pods)
```

### Typing Indicator — The Debounce/Throttle Problem

```typescript
// NAIVE APPROACH (WRONG — floods server):
inputElement.addEventListener('input', () => {
  socket.send(JSON.stringify({ type: 'TYPING', userId: currentUser.id }));
});

// CORRECT APPROACH: Throttle sending + auto-clear after idle
class TypingIndicator {
  private isTyping = false;
  private stopTypingTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSentAt = 0;
  
  private readonly THROTTLE_MS = 2000;    // Send "typing" at most every 2 seconds
  private readonly STOP_TYPING_MS = 3000; // Auto-clear after 3s of no input
  
  constructor(
    private socket: WebSocket,
    private userId: string,
    private channelId: string,
  ) {}
  
  onKeystroke(): void {
    const now = Date.now();
    
    // Clear the auto-stop timer every keystroke
    if (this.stopTypingTimer) {
      clearTimeout(this.stopTypingTimer);
    }
    
    // Only send "typing" message if we haven't sent recently (throttle)
    if (!this.isTyping || now - this.lastSentAt > this.THROTTLE_MS) {
      this.isTyping = true;
      this.lastSentAt = now;
      this.sendTypingStatus(true);
    }
    
    // Auto-clear: if no keystroke for STOP_TYPING_MS, send stopped
    this.stopTypingTimer = setTimeout(() => {
      this.isTyping = false;
      this.sendTypingStatus(false);
    }, this.STOP_TYPING_MS);
  }
  
  onSubmit(): void {
    // Message sent — immediately clear typing indicator
    if (this.stopTypingTimer) clearTimeout(this.stopTypingTimer);
    if (this.isTyping) {
      this.isTyping = false;
      this.sendTypingStatus(false);
    }
  }
  
  private sendTypingStatus(typing: boolean): void {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({
      type: typing ? 'TYPING_START' : 'TYPING_STOP',
      userId: this.userId,
      channelId: this.channelId,
      timestamp: Date.now(),
    }));
  }
}
```

### Presence State Machine

```typescript
// Each user has a presence state that transitions based on events
type PresenceStatus = 'online' | 'idle' | 'offline';

interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeen: number;
  currentPage?: string;   // For product analytics
}

class PresenceManager {
  private presenceMap = new Map<string, UserPresence>();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  
  private readonly IDLE_AFTER_MS = 120_000;       // 2 minutes without activity = idle
  private readonly HEARTBEAT_INTERVAL_MS = 30_000; // Check in with server every 30s
  private readonly HEARTBEAT_TIMEOUT_MS = 60_000;  // Absent for 60s = offline
  
  constructor(
    private socket: WebSocket,
    private userId: string,
  ) {
    this.setupActivityTracking();
    this.startHeartbeat();
  }
  
  private setupActivityTracking(): void {
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, () => this.onActivity(), { passive: true });
    });
    
    // Tab visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.setStatus('idle');
      } else {
        this.onActivity();
      }
    });
    
    // Cleanup on page close
    window.addEventListener('beforeunload', () => {
      this.setStatus('offline');
    });
  }
  
  private onActivity(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    
    // Transition back to online if was idle
    const current = this.presenceMap.get(this.userId);
    if (current?.status !== 'online') {
      this.setStatus('online');
    }
    
    // Schedule transition to idle after inactivity
    this.idleTimer = setTimeout(() => {
      this.setStatus('idle');
    }, this.IDLE_AFTER_MS);
  }
  
  private setStatus(status: PresenceStatus): void {
    const presence: UserPresence = {
      userId: this.userId,
      status,
      lastSeen: Date.now(),
      currentPage: window.location.pathname,
    };
    
    this.presenceMap.set(this.userId, presence);
    
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'PRESENCE_UPDATE', ...presence }));
    }
  }
  
  private startHeartbeat(): void {
    // Periodic heartbeat lets server know we're still connected
    // Server marks users offline if heartbeat absent for HEARTBEAT_TIMEOUT_MS
    this.heartbeatInterval = setInterval(() => {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'HEARTBEAT', userId: this.userId }));
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }
  
  destroy(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.setStatus('offline');
  }
}
```

### React + Zustand — Presence State Store

```typescript
import { create } from 'zustand';

interface PresenceState {
  userPresence: Record<string, UserPresence>;
  typingUsers: Record<string, Set<string>>;   // channelId → Set of userIds
  
  updatePresence: (presence: UserPresence) => void;
  setTyping: (channelId: string, userId: string, isTyping: boolean) => void;
  clearStalePresence: () => void;
}

const usePresenceStore = create<PresenceState>((set, get) => ({
  userPresence: {},
  typingUsers: {},
  
  updatePresence: (presence) => set(state => ({
    userPresence: { ...state.userPresence, [presence.userId]: presence }
  })),
  
  setTyping: (channelId, userId, isTyping) => set(state => {
    const current = new Set(state.typingUsers[channelId] ?? []);
    if (isTyping) {
      current.add(userId);
    } else {
      current.delete(userId);
    }
    return { typingUsers: { ...state.typingUsers, [channelId]: current } };
  }),
  
  // Remove users who haven't sent a heartbeat in 90s (stale presence)
  clearStalePresence: () => set(state => {
    const threshold = Date.now() - 90_000;
    const fresh = Object.fromEntries(
      Object.entries(state.userPresence).filter(([, p]) => p.lastSeen > threshold)
    );
    return { userPresence: fresh };
  }),
}));

// React components
function TypingIndicatorDisplay({ channelId, users }: { channelId: string; users: UserProfile[] }) {
  const typingUserIds = usePresenceStore(s => s.typingUsers[channelId]);
  
  if (!typingUserIds?.size) return null;
  
  const typingNames = [...typingUserIds]
    .map(id => users.find(u => u.id === id)?.name)
    .filter(Boolean);
  
  const text = typingNames.length === 1
    ? `${typingNames[0]} is typing...`
    : typingNames.length === 2
    ? `${typingNames[0]} and ${typingNames[1]} are typing...`
    : `${typingNames.length} people are typing...`;
  
  return (
    <div className="typing-indicator" aria-live="polite">
      <span className="typing-dots" aria-hidden="true">···</span>
      {text}
    </div>
  );
}

function OnlineAvatars({ documentId }: { documentId: string }) {
  const presenceMap = usePresenceStore(s => s.userPresence);
  
  const onlineUsers = Object.values(presenceMap)
    .filter(p => p.currentPage?.includes(documentId) && p.status !== 'offline');
  
  return (
    <div className="presence-avatars">
      {onlineUsers.map(user => (
        <div
          key={user.userId}
          className={`avatar ${user.status}`}
          title={`${user.userId} — ${user.status}`}
        >
          {user.userId[0].toUpperCase()}
          <span className={`status-dot ${user.status}`} />
        </div>
      ))}
    </div>
  );
}
```

### Angular + RxJS Implementation

```typescript
// services/presence.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, interval, merge, fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PresenceService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private socket: WebSocket | null = null;
  
  presenceMap$ = new BehaviorSubject<Record<string, UserPresence>>({});
  typingUsers$ = new BehaviorSubject<Record<string, string[]>>({});  // channelId -> userIds
  
  connect(wsUrl: string): void {
    this.socket = new WebSocket(wsUrl);
    this.socket.onmessage = (event) => this.handleMessage(JSON.parse(event.data));
    
    // Heartbeat every 30 seconds
    interval(30_000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.socket?.send(JSON.stringify({ type: 'HEARTBEAT' }));
    });
    
    // Cleanup stale presence every minute
    interval(60_000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.clearStalePresence();
    });
  }
  
  // Typing indicator — automatically throttled via RxJS
  watchTyping(inputEl: HTMLElement, channelId: string): void {
    const userId = 'currentUser';  // From auth service in practice
    
    fromEvent(inputEl, 'input').pipe(
      takeUntil(this.destroy$),
      debounceTime(300),  // Don't fire more than once per 300ms
    ).subscribe(() => {
      this.sendTypingStart(channelId, userId);
    });
    
    // Auto-stop typing indicator after 3 seconds of no input
    fromEvent(inputEl, 'input').pipe(
      takeUntil(this.destroy$),
      debounceTime(3000),  // No input for 3s
    ).subscribe(() => {
      this.sendTypingStop(channelId, userId);
    });
  }
  
  private handleMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'PRESENCE_UPDATE':
        this.presenceMap$.next({
          ...this.presenceMap$.value,
          [msg['userId'] as string]: msg as unknown as UserPresence,
        });
        break;
      case 'TYPING_START':
        this.updateTyping(msg['channelId'] as string, msg['userId'] as string, true);
        break;
      case 'TYPING_STOP':
        this.updateTyping(msg['channelId'] as string, msg['userId'] as string, false);
        break;
    }
  }
  
  private updateTyping(channelId: string, userId: string, isTyping: boolean): void {
    const current = this.typingUsers$.value;
    const channelTypers = new Set(current[channelId] ?? []);
    isTyping ? channelTypers.add(userId) : channelTypers.delete(userId);
    this.typingUsers$.next({ ...current, [channelId]: [...channelTypers] });
  }
  
  private clearStalePresence(): void {
    const threshold = Date.now() - 90_000;
    const fresh = Object.fromEntries(
      Object.entries(this.presenceMap$.value).filter(([, p]) => p.lastSeen > threshold)
    );
    this.presenceMap$.next(fresh);
  }
  
  private sendTypingStart(channelId: string, userId: string): void {
    this.socket?.send(JSON.stringify({ type: 'TYPING_START', channelId, userId }));
  }
  
  private sendTypingStop(channelId: string, userId: string): void {
    this.socket?.send(JSON.stringify({ type: 'TYPING_STOP', channelId, userId }));
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.socket?.close();
  }
}
```

### Scaling Presence to 10K+ Users

```typescript
// Problem: 1000 users in a room, each sends heartbeat every 30s = 33 messages/sec
// With 10K rooms = 330K messages/sec — Redis pub/sub can handle this

// Pattern: Presence via Redis EXPIRE key

// Server-side pseudocode (Node.js):
// On heartbeat receive:
//   SETEX presence:{roomId}:{userId} 60 "online"  ← expires in 60s if no heartbeat
//   PUBLISH presence:{roomId} "{userId}:online"

// On page load (get all present users):
//   SCAN presence:{roomId}:* → returns all non-expired keys → list of online users

// Client pattern for large rooms: pagination of presence
class PaginatedPresence {
  private loadedUsers = new Map<string, UserPresence>();
  private page = 0;
  private readonly PAGE_SIZE = 50;
  
  async loadMore(): Promise<void> {
    const users = await fetch(`/api/rooms/${this.roomId}/presence?page=${this.page}&limit=${this.PAGE_SIZE}`);
    const data: UserPresence[] = await users.json();
    data.forEach(u => this.loadedUsers.set(u.userId, u));
    this.page++;
  }
  
  // Only show count for rooms > 100 users to avoid rendering thousands of avatars
  get displayMode(): 'avatars' | 'count' {
    return this.loadedUsers.size > 100 ? 'count' : 'avatars';
  }
}
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Slack — Typing Indicator:**
Slack sends a `user_typing` WebSocket event (throttled, not on every keystroke). If no more events received within 5 seconds, Slack automatically removes the "... is typing" indicator. Implemented with per-channel pub/sub via Slack's internal messaging infrastructure.

**Google Docs — Cursor Presence:**
Google Docs shows colored cursors for each active user. Each cursor position is a cheap presence update: small payload (x,y position + selection range) sent every ~100ms during active editing. Multiplied by N users — this is why Google Docs struggles with 50+ simultaneous editors.

**Microsoft Teams — "Away" Status:**
Teams tracks keyboard/mouse activity and marks users as "Away" after 5 minutes of inactivity. This uses the Windows Activity API on desktop. The web version uses page visibility + mouse activity events. Heartbeats to server every 60s maintain the "available" status.

**Figma — Multiplayer Cursors:**
Figma sends cursor position via WebSocket, but only for cursors that moved (delta). Each cursor update is ~20 bytes. With N users, Figma throttles to N * 100ms = manageable.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Presence and typing indicators are about efficiently broadcasting ephemeral state to all participants. The key engineering decisions are: (1) Never send a WebSocket message on every keystroke — throttle to once every 2 seconds and auto-clear after 3s of idle. (2) Use heartbeats for presence rather than disconnect events — TCP connections can silently drop, so server-side TTL-based presence (Redis EXPIRE) is more reliable than waiting for a disconnect event. (3) Handle cleanup on `beforeunload`, tab visibility change, and timeout. (4) For scale, separate presence state from application state in Redis — each user's presence key expires if heartbeat stops. In large rooms (1000+ users), don't render every avatar — show a count and lazy-load the list. I built something similar at Bosch where our manufacturing dashboard needed to show which operators were viewing each machine's dashboard, so supervisors knew who was actively monitoring."

**Follow-up Questions:**
1. *How do you prevent the "ghost user" problem (user shows as online after disconnect)?* → Server-side TTL: each heartbeat extends a Redis key's TTL; if no heartbeat, key expires and user goes offline. Don't rely on WebSocket disconnect event alone.
2. *How do you scale presence to 100K users?* → Shard by room/channel. Use Redis pub/sub per room. For rooms > 50 users, switch from "list all" to "show count + paginated load." Consider separate presence microservice.
3. *What's the bandwidth cost of typing indicators?* → Per typing event: ~100 bytes. 2-second throttle means max 0.5 messages/user/sec. For 100 active chatters: 50 messages/sec = ~5KB/s — negligible.

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

```typescript
// Complete React hook for typing indicators
function useTypingIndicator(channelId: string, socket: WebSocket) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const throttleRef = useRef<boolean>(false);
  
  // Listen for others' typing events
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.channelId !== channelId) return;
      
      if (msg.type === 'TYPING_START') {
        setTypingUsers(prev => [...new Set([...prev, msg.userId])]);
        
        // Auto-remove if stop event never comes (safety net)
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== msg.userId));
        }, 6000);
      } else if (msg.type === 'TYPING_STOP') {
        setTypingUsers(prev => prev.filter(id => id !== msg.userId));
      }
    };
    
    socket.addEventListener('message', handler);
    return () => socket.removeEventListener('message', handler);
  }, [channelId, socket]);
  
  // Send our own typing status (throttled)
  const onKeystroke = useCallback(() => {
    if (!throttleRef.current) {
      throttleRef.current = true;
      socket.send(JSON.stringify({ type: 'TYPING_START', channelId }));
      setTimeout(() => { throttleRef.current = false; }, 2000);
    }
    
    clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      socket.send(JSON.stringify({ type: 'TYPING_STOP', channelId }));
    }, 3000);
  }, [channelId, socket]);
  
  const onSubmit = useCallback(() => {
    clearTimeout(stopTimerRef.current);
    socket.send(JSON.stringify({ type: 'TYPING_STOP', channelId }));
  }, [channelId, socket]);
  
  return { typingUsers, onKeystroke, onSubmit };
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Typing Indicator Rule of 3:**
- Throttle: send at most every **2 seconds**
- Auto-clear: no keystrokes for **3 seconds** → send STOP
- Safety net: auto-remove display after **6 seconds** (in case STOP event is lost)

**Presence "Ghost User" Prevention:**
- Server-side **TTL key in Redis** (not just WebSocket disconnect event)
- Heartbeat every **30 seconds** extends TTL
- Miss **2 heartbeats** (60s) → offline

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ Typing indicators dramatically improve conversation UX — users stop double-typing if they know someone is already responding
→ Presence awareness enables better collaboration — Figma, Notion, Google Docs all use it to coordinate who's working where
→ Without proper throttling and cleanup, a naive implementation generates 10–100x more server traffic than necessary

**How it works:**
→ Client throttles typing events (dedounce/throttle) → server broadcasts to room subscribers → display auto-clears on stop or timeout
→ Presence uses heartbeat + server-side TTL rather than relying on disconnect events (TCP connections silently drop)
→ Scale: Redis pub/sub sharded per room, expire keys for presence, paginate for large rooms

**Company relevance:**
→ **Microsoft**: Teams and Viva Engage both implement typing indicators and presence "Available/Away/Busy/DND" states
→ **Adobe**: Frame.io and Creative Cloud collab tools show who's reviewing/editing a shared project
→ **Salesforce**: Slack (acquired 2021) — industry reference implementation for typing indicators at scale
→ **Cisco**: WebEx messaging presence system is central to their unified communications platform
