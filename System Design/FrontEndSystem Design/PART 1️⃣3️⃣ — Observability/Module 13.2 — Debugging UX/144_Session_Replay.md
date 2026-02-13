# 144. Session Replay

## 1. High-Level Explanation (Frontend Interview Level)

**Session Replay** is the capture and playback of user interactions—including DOM changes, mouse movements, clicks, scrolls, inputs, and network activity—enabling developers to "watch" exactly what users experienced, especially during errors or unexpected behavior, for debugging and UX analysis.

- **What**: Record DOM snapshots incrementally, capture interactions (clicks/scrolls/inputs), replay like video—see exactly what user saw
- **Why**: Debug visual issues, understand error context, improve UX, reproduce hard-to-replicate bugs, validate fixes
- **When**: Critical for production debugging, essential for UX research, required for error investigations, helpful for support tickets
- **Role**: Visual time-travel debugging replacing "cannot reproduce" with "watch it happen"

**Key Principle**: "Show, don't tell"—replace user descriptions ("button didn't work") with actual recording of the issue.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Session Recording Architecture

**1. DOM Snapshot & Incremental Updates**:
```typescript
// Record DOM as serialized tree
interface DOMSnapshot {
  type: 'full-snapshot' | 'incremental-snapshot';
  timestamp: number;
  data: {
    node?: SerializedNode;
    adds?: AddedNode[];
    removes?: RemovedNode[];
    texts?: TextMutation[];
    attributes?: AttributeMutation[];
  };
}

interface SerializedNode {
  type: number;          // Element, Text, Comment
  tagName?: string;
  attributes?: Record<string, string>;
  childNodes?: SerializedNode[];
  textContent?: string;
  id: number;            // Unique node ID
}

// Capture full snapshot initially
function captureFullSnapshot(): DOMSnapshot {
  return {
    type: 'full-snapshot',
    timestamp: Date.now(),
    data: {
      node: serializeNode(document.documentElement)
    }
  };
}

function serializeNode(node: Node, idMap: Map<Node, number> = new Map()): SerializedNode {
  const id = idMap.size;
  idMap.set(node, id);
  
  if (node.nodeType === Node.TEXT_NODE) {
    return {
      type: Node.TEXT_NODE,
      textContent: node.textContent,
      id
    };
  }
  
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    
    return {
      type: Node.ELEMENT_NODE,
      tagName: element.tagName.toLowerCase(),
      attributes: Array.from(element.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {} as Record<string, string>),
      childNodes: Array.from(element.childNodes).map(child => 
        serializeNode(child, idMap)
      ),
      id
    };
  }
  
  return { type: node.nodeType, id };
}

// Capture incremental changes (mutations)
function observeMutations(callback: (snapshot: DOMSnapshot) => void) {
  const observer = new MutationObserver((mutations) => {
    const snapshot: DOMSnapshot = {
      type: 'incremental-snapshot',
      timestamp: Date.now(),
      data: {
        adds: [],
        removes: [],
        texts: [],
        attributes: []
      }
    };
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          snapshot.data.adds!.push({
            parentId: getNodeId(mutation.target),
            nextId: getNodeId(mutation.nextSibling),
            node: serializeNode(node)
          });
        });
        
        mutation.removedNodes.forEach(node => {
          snapshot.data.removes!.push({
            parentId: getNodeId(mutation.target),
            id: getNodeId(node)
          });
        });
      }
      
      if (mutation.type === 'characterData') {
        snapshot.data.texts!.push({
          id: getNodeId(mutation.target),
          value: (mutation.target as Text).textContent
        });
      }
      
      if (mutation.type === 'attributes') {
        snapshot.data.attributes!.push({
          id: getNodeId(mutation.target),
          name: mutation.attributeName!,
          value: (mutation.target as Element).getAttribute(mutation.attributeName!)
        });
      }
    });
    
    callback(snapshot);
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    attributes: true,
    characterData: true,
    subtree: true,
    attributeOldValue: false,
    characterDataOldValue: false
  });
  
  return observer;
}

// Node ID mapping
const nodeIdMap = new WeakMap<Node, number>();
let nextNodeId = 1;

function getNodeId(node: Node | null): number {
  if (!node) return -1;
  
  if (!nodeIdMap.has(node)) {
    nodeIdMap.set(node, nextNodeId++);
  }
  
  return nodeIdMap.get(node)!;
}
```

**2. Interaction Recording**:
```typescript
// Capture user interactions
interface InteractionEvent {
  type: 'mousemove' | 'mousedown' | 'mouseup' | 'click' | 'scroll' | 'input' | 'focus' | 'blur';
  timestamp: number;
  data: {
    x?: number;
    y?: number;
    target?: number;  // Node ID
    value?: string;
    scrollTop?: number;
    scrollLeft?: number;
  };
}

class InteractionRecorder {
  private events: InteractionEvent[] = [];
  private throttleInterval = 50; // 50ms throttle for mousemove
  
  startRecording(callback: (event: InteractionEvent) => void) {
    // Mouse events
    this.recordMouseEvents(callback);
    
    // Scroll events
    this.recordScrollEvents(callback);
    
    // Input events
    this.recordInputEvents(callback);
    
    // Focus events
    this.recordFocusEvents(callback);
  }
  
  private recordMouseEvents(callback: (event: InteractionEvent) => void) {
    let lastMouseMoveTime = 0;
    
    // Mouse move (throttled)
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastMouseMoveTime < this.throttleInterval) return;
      lastMouseMoveTime = now;
      
      callback({
        type: 'mousemove',
        timestamp: now,
        data: { x: e.clientX, y: e.clientY }
      });
    }, { passive: true });
    
    // Mouse down/up
    document.addEventListener('mousedown', (e) => {
      callback({
        type: 'mousedown',
        timestamp: Date.now(),
        data: {
          x: e.clientX,
          y: e.clientY,
          target: getNodeId(e.target as Node)
        }
      });
    });
    
    document.addEventListener('mouseup', (e) => {
      callback({
        type: 'mouseup',
        timestamp: Date.now(),
        data: {
          x: e.clientX,
          y: e.clientY,
          target: getNodeId(e.target as Node)
        }
      });
    });
    
    // Click
    document.addEventListener('click', (e) => {
      callback({
        type: 'click',
        timestamp: Date.now(),
        data: {
          x: e.clientX,
          y: e.clientY,
          target: getNodeId(e.target as Node)
        }
      });
    }, true); // Capture phase
  }
  
  private recordScrollEvents(callback: (event: InteractionEvent) => void) {
    let scrollTimeout: NodeJS.Timeout;
    
    document.addEventListener('scroll', (e) => {
      clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        const target = e.target as Element;
        
        callback({
          type: 'scroll',
          timestamp: Date.now(),
          data: {
            target: getNodeId(target),
            scrollTop: target.scrollTop,
            scrollLeft: target.scrollLeft
          }
        });
      }, 100); // Debounce
    }, { passive: true, capture: true });
  }
  
  private recordInputEvents(callback: (event: InteractionEvent) => void) {
    document.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      
      // Skip password fields
      if (target.type === 'password') return;
      
      callback({
        type: 'input',
        timestamp: Date.now(),
        data: {
          target: getNodeId(target),
          value: this.maskSensitiveData(target)
        }
      });
    }, true);
  }
  
  private recordFocusEvents(callback: (event: InteractionEvent) => void) {
    document.addEventListener('focus', (e) => {
      callback({
        type: 'focus',
        timestamp: Date.now(),
        data: { target: getNodeId(e.target as Node) }
      });
    }, true);
    
    document.addEventListener('blur', (e) => {
      callback({
        type: 'blur',
        timestamp: Date.now(),
        data: { target: getNodeId(e.target as Node) }
      });
    }, true);
  }
  
  private maskSensitiveData(input: HTMLInputElement): string {
    // Mask credit cards, SSN, etc.
    const value = input.value;
    
    if (input.autocomplete?.includes('cc-number')) {
      return value.replace(/\d/g, '*');
    }
    
    if (input.name?.match(/ssn|social.?security/i)) {
      return value.replace(/\d/g, '*');
    }
    
    return value;
  }
}
```

**3. Network Activity Recording**:
```typescript
// Capture API calls and responses
interface NetworkEvent {
  type: 'fetch' | 'xhr';
  timestamp: number;
  data: {
    method: string;
    url: string;
    status?: number;
    duration?: number;
    requestBody?: any;
    responseBody?: any;
    error?: string;
  };
}

class NetworkRecorder {
  startRecording(callback: (event: NetworkEvent) => void) {
    this.interceptFetch(callback);
    this.interceptXHR(callback);
  }
  
  private interceptFetch(callback: (event: NetworkEvent) => void) {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      const method = (args[1]?.method || 'GET').toUpperCase();
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        // Clone response to read body
        const clonedResponse = response.clone();
        let responseBody;
        
        try {
          responseBody = await clonedResponse.json();
        } catch {
          responseBody = await clonedResponse.text();
        }
        
        callback({
          type: 'fetch',
          timestamp: startTime,
          data: {
            method,
            url,
            status: response.status,
            duration,
            requestBody: args[1]?.body,
            responseBody: this.sanitizeResponse(responseBody)
          }
        });
        
        return response;
      } catch (error) {
        callback({
          type: 'fetch',
          timestamp: startTime,
          data: {
            method,
            url,
            duration: Date.now() - startTime,
            error: (error as Error).message
          }
        });
        
        throw error;
      }
    };
  }
  
  private interceptXHR(callback: (event: NetworkEvent) => void) {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method: string, url: string) {
      (this as any)._method = method;
      (this as any)._url = url;
      (this as any)._startTime = Date.now();
      
      return originalOpen.apply(this, arguments as any);
    };
    
    XMLHttpRequest.prototype.send = function(body?: any) {
      const xhr = this;
      const startTime = (xhr as any)._startTime;
      
      xhr.addEventListener('load', () => {
        callback({
          type: 'xhr',
          timestamp: startTime,
          data: {
            method: (xhr as any)._method,
            url: (xhr as any)._url,
            status: xhr.status,
            duration: Date.now() - startTime,
            requestBody: body,
            responseBody: xhr.responseText
          }
        });
      });
      
      xhr.addEventListener('error', () => {
        callback({
          type: 'xhr',
          timestamp: startTime,
          data: {
            method: (xhr as any)._method,
            url: (xhr as any)._url,
            duration: Date.now() - startTime,
            error: 'Network error'
          }
        });
      });
      
      return originalSend.apply(this, arguments as any);
    };
  }
  
  private sanitizeResponse(response: any): any {
    // Remove sensitive data from response
    if (typeof response === 'object') {
      const sanitized = { ...response };
      delete sanitized.password;
      delete sanitized.creditCard;
      delete sanitized.ssn;
      return sanitized;
    }
    return response;
  }
}
```

### Privacy-Safe Recording

**1. Automatic Masking**:
```typescript
// Mask sensitive inputs during recording
class PrivacyManager {
  private sensitiveSelectors = [
    'input[type="password"]',
    'input[type="email"]',
    'input[autocomplete*="cc-"]',
    '[data-private]',
    '.sensitive'
  ];
  
  shouldMask(element: Element): boolean {
    return this.sensitiveSelectors.some(selector => 
      element.matches(selector)
    );
  }
  
  maskElement(node: SerializedNode): SerializedNode {
    if (node.tagName === 'input' && node.attributes) {
      const type = node.attributes['type'];
      
      if (type === 'password' || type === 'email') {
        node.attributes['value'] = '***';
      }
      
      if (node.attributes['autocomplete']?.includes('cc-')) {
        node.attributes['value'] = '****-****-****-****';
      }
    }
    
    if (node.attributes?.['data-private'] === 'true') {
      node.textContent = '[REDACTED]';
    }
    
    // Recursively mask children
    if (node.childNodes) {
      node.childNodes = node.childNodes.map(child => this.maskElement(child));
    }
    
    return node;
  }
  
  blockMedia(): void {
    // Block images, videos (privacy concern)
    const style = document.createElement('style');
    style.textContent = `
      img, video, canvas, iframe {
        filter: blur(10px);
      }
    `;
    document.head.appendChild(style);
  }
}
```

**2. Consent Management**:
```typescript
// Only record with user consent (GDPR)
class SessionReplayConsent {
  private hasConsent = false;
  
  async requestConsent(): Promise<boolean> {
    // Show consent banner
    this.hasConsent = await this.showConsentBanner();
    
    if (this.hasConsent) {
      localStorage.setItem('session_replay_consent', 'true');
    }
    
    return this.hasConsent;
  }
  
  checkConsent(): boolean {
    return localStorage.getItem('session_replay_consent') === 'true';
  }
  
  revokeConsent(): void {
    localStorage.removeItem('session_replay_consent');
    this.hasConsent = false;
  }
  
  private async showConsentBanner(): Promise<boolean> {
    return new Promise(resolve => {
      // UI to accept/reject
      // ...
    });
  }
}
```

### Session Replay Integration

**1. Sentry Replay**:
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_DSN',
  
  integrations: [
    new Sentry.Replay({
      // Sample 10% of normal sessions
      sessionSampleRate: 0.1,
      
      // Replay 100% of sessions with errors
      errorSampleRate: 1.0,
      
      // Privacy settings
      maskAllText: false,
      maskAllInputs: true,
      blockAllMedia: true,
      
      // Network capture
      networkDetailAllowUrls: ['https://api.example.com'],
      networkCaptureBodies: true,
      
      // Mask specific elements
      mask: ['.sensitive', '[data-private]'],
      block: ['.ad', 'iframe']
    })
  ]
});

// Replay automatically attached to errors
// View in Sentry dashboard: Issues → Replays tab
```

**2. LogRocket**:
```typescript
import LogRocket from 'logrocket';

LogRocket.init('your-app/project', {
  // Privacy settings
  dom: {
    inputSanitizer: true,
    textSanitizer: true
  },
  
  network: {
    requestSanitizer: (request) => {
      // Sanitize request body
      if (request.body) {
        delete request.body.password;
        delete request.body.creditCard;
      }
      return request;
    },
    
    responseSanitizer: (response) => {
      // Sanitize response
      if (response.body) {
        delete response.body.ssn;
      }
      return response;
    }
  },
  
  // Performance
  mergeIframes: true,
  parentDomain: 'https://example.com'
});

// Get session URL
LogRocket.getSessionURL((sessionURL) => {
  // Attach to support ticket or error report
  console.log('Session:', sessionURL);
});

// React integration
import setupLogRocketReact from 'logrocket-react';
setupLogRocketReact(LogRocket);
```

**3. FullStory**:
```typescript
// FullStory snippet
window['_fs_host'] = 'fullstory.com';
window['_fs_script'] = 'edge.fullstory.com/s/fs.js';
window['_fs_org'] = 'YOUR_ORG_ID';
window['_fs_namespace'] = 'FS';

// Privacy rules (server-side configuration)
// Exclude: .sensitive, input[type="password"], [data-private]

// Identify user
FS.identify(userId, {
  displayName: user.name,
  email: user.email
});

// Track custom events
FS.event('Purchase Completed', {
  orderId: '123',
  total: 99.99
});
```

### What NOT to Do

- ❌ **Record without consent** (GDPR violation)
- ❌ **Capture passwords** (security risk)
- ❌ **No masking** (PII exposure)
- ❌ **Record everything** (storage cost, performance impact)
- ❌ **Expose raw recordings** (privacy breach)

---

## 3. Clear Real-World Examples

### Example 1: Sentry Session Replay

```typescript
// Install: npm install @sentry/react

import * as Sentry from '@sentry/react';
import { Replay } from '@sentry/replay';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  integrations: [
    new Replay({
      sessionSampleRate: 0.1,  // 10% of sessions
      errorSampleRate: 1.0,     // 100% of errors
      
      maskAllText: false,
      maskAllInputs: true,
      blockAllMedia: true
    })
  ],
  
  tracesSampleRate: 0.1
});

// Replay automatically recorded
// View: Sentry → Issues → Click error → Replays tab → Watch video
```

### Example 2: LogRocket Error Tracking

```typescript
import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';

LogRocket.init('your-app/project');
setupLogRocketReact(LogRocket);

// Identify user
LogRocket.identify(user.id, {
  name: user.name,
  email: user.email,
  plan: user.plan
});

// Integrate with error tracking
window.addEventListener('error', (event) => {
  LogRocket.getSessionURL((sessionURL) => {
    // Send to backend or support system
    fetch('/api/errors', {
      method: 'POST',
      body: JSON.stringify({
        error: event.error.message,
        sessionURL
      })
    });
  });
});
```

### Example 3: Custom Replay System

```typescript
// Minimal replay recorder
import rrweb from 'rrweb';

let events: any[] = [];

// Start recording
rrweb.record({
  emit(event) {
    events.push(event);
    
    // Batch send to server
    if (events.length > 100) {
      sendBatch();
    }
  },
  
  // Privacy
  maskAllInputs: true,
  maskInputOptions: {
    password: true,
    email: true
  },
  
  blockClass: 'sensitive'
});

function sendBatch() {
  fetch('/api/replay', {
    method: 'POST',
    body: JSON.stringify({ events })
  });
  events = [];
}

// Replay
import { Replayer } from 'rrweb';

fetch('/api/replay/session-123')
  .then(res => res.json())
  .then(({ events }) => {
    const replayer = new Replayer(events);
    replayer.play();
  });
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How does session replay work, and what are the privacy considerations?"

**Answer**:

"Session replay **records DOM + interactions** to enable playback:

**1. Recording Architecture**:

Three components:
1. **DOM Snapshot**: Serialize DOM tree (full + incremental mutations)
2. **Interactions**: Mousemove, clicks, scrolls, inputs
3. **Network**: API calls with timing

**2. Implementation**:

```typescript
// Full snapshot initially
const snapshot = serializeDOM(document);

// Then observe mutations
const observer = new MutationObserver(mutations => {
  captureIncrementalChanges(mutations);
});

// Capture interactions
document.addEventListener('click', captureClick);
document.addEventListener('input', captureInput);
```

**3. Efficient Storage**:

- **Full snapshot**: ~500KB (initial page)
- **Incremental**: ~10KB/min (only changes)
- **Compression**: Gzip reduces 80%
- **Total**: 1MB for 5min session

**4. Privacy Masking**:

Critical: Mask sensitive data automatically:
```typescript
// Passwords
input[type="password"] → value: "***"

// Credit cards
input[autocomplete="cc-number"] → "****-****-****-1234"

// Custom
<div data-private>John's SSN</div> → "[REDACTED]"
```

**5. Consent (GDPR)**:

Only record with user consent:
```typescript
if (userConsent('session_replay')) {
  startRecording();
}
```

**6. Sampling**:

Don't record 100% (cost):
- 10% of normal sessions
- 100% of sessions with errors

**7. Real-World Platforms**:

**Sentry Replay**:
```typescript
new Sentry.Replay({
  sessionSampleRate: 0.1,
  errorSampleRate: 1.0,
  maskAllInputs: true
});
```

Auto-attached to errors. Watch in Sentry dashboard.

**LogRocket**:
```typescript
LogRocket.init('app/project');
LogRocket.getSessionURL(url => console.log(url));
```

Get URL to share with support team.

**8. Use Cases**:

- **Bug Reports**: "Button didn't work" → Watch replay, see button was hidden
- **Error Context**: JS error → Replay shows user clicked 10x rapidly (race condition)
- **UX Research**: Watch real user flows, identify friction

**9. Performance Impact**:

- **Bundle size**: +50KB (rrweb library)
- **CPU**: ~2-5% overhead (MutationObserver)
- **Network**: 1MB per 5min session

Acceptable for debugging value.

**10. What NOT to Do**:

- ❌ Record without consent (GDPR violation, €20M fine)
- ❌ Expose passwords/SSN (security breach)
- ❌ No masking (PII leak)
- ❌ Public access (privacy risk)

**Real-World Example**:

At my last company, checkout intermittently failed. Session replay showed:
1. User filled form
2. Clicked "Pay"
3. Modal appeared (not visible in normal testing)
4. User clicked background (closed modal inadvertently)
5. No payment processed

Fix: Make modal un-dismissable during payment. Replay was critical—we couldn't reproduce otherwise."

---

## 6. Why & How Summary

### Why It Matters

**Reproduce Bugs**: See exactly what user experienced  
**Error Context**: Understand actions leading to error  
**UX Research**: Watch real user behavior

### How It Works

**1. Record**: Full DOM snapshot + incremental mutations (MutationObserver)  
**2. Interactions**: Mouse, clicks, scrolls, inputs  
**3. Network**: API calls with timing  
**4. Privacy**: Mask passwords, emails, credit cards, PII  
**5. Playback**: Reconstruct DOM + replay interactions like video

**FAANG**: Session replay (Sentry Replay, LogRocket, FullStory), privacy masking (automatic PII redaction), sampling (10% sessions, 100% errors), GDPR compliance (consent required)
