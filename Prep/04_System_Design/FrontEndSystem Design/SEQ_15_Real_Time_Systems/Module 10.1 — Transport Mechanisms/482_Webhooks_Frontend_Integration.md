# 482 — Webhooks: Frontend Integration Patterns

────────────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

Webhooks are HTTP POST callbacks that external services send to your server when an event occurs.
Unlike polling (client asks repeatedly) or WebSockets (persistent connection), webhooks are
**event-driven, server-to-server** — the external service pushes data to a URL you registered.

Frontend engineers must understand webhooks because:
- Payment confirmations (Stripe), CI/CD status (GitHub), messaging (Slack) all arrive via webhooks
- The browser **never** receives webhooks directly — a server intermediary is mandatory
- Bridging webhook events to the browser requires SSE, WebSocket, or polling patterns
- Security (HMAC verification, replay prevention) is entirely the receiver's responsibility

```
External Service          Your Server           Browser (React/Angular)
    │                        │                        │
    │── POST /webhook ──────→│                        │
    │  (signed payload)      │── verify HMAC ─────────│
    │←── 200 OK ────────────│                        │
    │                        │── store event ────────│
    │                        │── push via SSE/WS ───→│
    │                        │                        │── update UI
```

────────────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior / Staff Level)

### A. Complete Architecture — Webhook to Browser

```
┌─────────────────┐     ┌──────────────────────────────┐     ┌─────────────────┐
│ External Service │     │         Your Backend          │     │    Browser UI    │
│ (Stripe, GitHub, │     │                              │     │  (React app)     │
│  Slack, etc.)    │     │  ┌─────────────────────┐    │     │                  │
│                  │     │  │ Webhook Controller   │    │     │  ┌────────────┐ │
│  Event occurs:   │     │  │ • Verify signature   │    │     │  │ SSE Client │ │
│  payment.success │────→│  │ • Check timestamp    │    │     │  │ or WS      │ │
│                  │POST │  │ • Check idempotency  │    │     │  └─────┬──────┘ │
│                  │     │  │ • Store event in DB  │    │     │        │        │
│                  │     │  └──────────┬──────────┘    │     │  ┌─────▼──────┐ │
│                  │     │             │                │     │  │ Event      │ │
│                  │     │  ┌──────────▼──────────┐    │     │  │ Handler    │ │
│                  │     │  │ Message Broker       │    │     │  │ (setState) │ │
│                  │     │  │ (Redis Pub/Sub)      │───────→│  └────────────┘ │
│                  │     │  └──────────┬──────────┘    │     │                  │
│                  │     │             │                │     │                  │
│                  │     │  ┌──────────▼──────────┐    │     │                  │
│                  │     │  │ SSE / WebSocket      │    │     │                  │
│                  │     │  │ Connection Manager   │────────→│                  │
│                  │     │  └─────────────────────┘    │     │                  │
│                  │     │                              │     │                  │
│                  │     │  ┌─────────────────────┐    │     │                  │
│  Retry on 5xx   │←────│  │ Dead Letter Queue    │    │     │                  │
│  (exponential)   │     │  │ (failed processing)  │    │     │                  │
│                  │     │  └─────────────────────┘    │     │                  │
└─────────────────┘     └──────────────────────────────┘     └─────────────────┘
```

**Two integration patterns:**

```
PATTERN 1: Webhook → Redis Pub/Sub → SSE → Browser  (recommended, real-time)
─────────────────────────────────────────────────────────────────────────────
Stripe ──POST──→ /webhook ──verify──→ Redis.publish("payments", event)
                                          │
Browser ←──SSE──── /api/events/stream ←───┘  (subscribed to "payments" channel)

PATTERN 2: Webhook → Database → Client Polls  (simpler, eventual consistency)
─────────────────────────────────────────────────────────────────────────────
Stripe ──POST──→ /webhook ──verify──→ INSERT INTO events(...)
                                          │
Browser ──GET──→ /api/events?since=... ←──┘  (polls every 5–10s)
```

### B. Full Webhook Receiver — Node.js/Express with HMAC-SHA256

```typescript
// webhook-server.ts
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Redis from 'ioredis';

const app = express();
const redis = new Redis(process.env.REDIS_URL!);

// ─── CRITICAL: Raw body required for HMAC verification ─────────────
// Must parse raw body BEFORE JSON parsing for signature check
app.use('/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json()); // other routes use normal JSON parsing

// ─── Idempotency store (in production, use Redis or DB) ────────────
const processedEvents = new Set<string>();

// ─── HMAC Signature Verification ────────────────────────────────────
function verifyWebhookSignature(
  payload: Buffer,
  signatureHeader: string,
  secret: string
): boolean {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const providedSig = signatureHeader.replace('sha256=', '');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedSig, 'hex'),
    Buffer.from(providedSig, 'hex')
  );
}

// ─── Replay Attack Prevention ───────────────────────────────────────
function isReplayAttack(timestamp: string, toleranceMs: number = 300_000): boolean {
  const eventTime = parseInt(timestamp, 10) * 1000; // Unix seconds → ms
  const now = Date.now();
  return Math.abs(now - eventTime) > toleranceMs; // reject if > 5 minutes old
}

// ─── Stripe Webhook Endpoint ────────────────────────────────────────
app.post('/webhooks/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const timestamp = req.headers['x-stripe-timestamp'] as string;
  const rawBody = req.body as Buffer;

  // 1. Verify signature
  if (!signature || !verifyWebhookSignature(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)) {
    console.warn('Webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Check replay attack
  if (timestamp && isReplayAttack(timestamp)) {
    console.warn('Webhook replay attack detected');
    return res.status(403).json({ error: 'Timestamp too old' });
  }

  // 3. Parse and extract event
  const event = JSON.parse(rawBody.toString());

  // 4. Idempotency check — prevent duplicate processing
  if (processedEvents.has(event.id)) {
    // Already processed — return 200 to stop retries
    return res.status(200).json({ received: true, duplicate: true });
  }
  processedEvents.add(event.id);

  // 5. Respond 200 IMMEDIATELY — process async
  // Stripe retries on 4xx/5xx or timeout > 20s
  res.status(200).json({ received: true });

  // 6. Process event asynchronously
  try {
    await processWebhookEvent(event);
  } catch (err) {
    console.error('Webhook processing failed:', err);
    await pushToDeadLetterQueue(event);
  }
});

async function processWebhookEvent(event: any): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Store in DB
      await storePaymentSuccess(event.data.object);
      // Publish to Redis for real-time notification
      await redis.publish('payment-events', JSON.stringify({
        type: 'payment.success',
        userId: event.data.object.metadata.userId,
        amount: event.data.object.amount,
        timestamp: Date.now(),
      }));
      break;

    case 'payment_intent.payment_failed':
      await redis.publish('payment-events', JSON.stringify({
        type: 'payment.failed',
        userId: event.data.object.metadata.userId,
        error: event.data.object.last_payment_error?.message,
        timestamp: Date.now(),
      }));
      break;

    case 'invoice.paid':
      await redis.publish('billing-events', JSON.stringify({
        type: 'invoice.paid',
        userId: event.data.object.customer,
        invoiceId: event.data.object.id,
        timestamp: Date.now(),
      }));
      break;

    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }
}

async function storePaymentSuccess(paymentIntent: any): Promise<void> {
  // DB insert — implementation depends on your ORM
  console.log(`Payment ${paymentIntent.id} succeeded for ${paymentIntent.amount}`);
}

async function pushToDeadLetterQueue(event: any): Promise<void> {
  await redis.rpush('webhook-dlq', JSON.stringify({
    event,
    failedAt: new Date().toISOString(),
    retryCount: 0,
  }));
}
```

### C. GitHub Webhook Receiver (CI/CD Status)

```typescript
// github-webhook.ts
import crypto from 'crypto';
import { Request, Response } from 'express';

function verifyGitHubSignature(payload: Buffer, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

app.post('/webhooks/github', async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;
  const deliveryId = req.headers['x-github-delivery'] as string;
  const rawBody = req.body as Buffer;

  // Verify signature
  if (!verifyGitHubSignature(rawBody, signature, process.env.GITHUB_WEBHOOK_SECRET!)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Idempotency via delivery ID
  if (processedEvents.has(deliveryId)) {
    return res.status(200).json({ received: true });
  }
  processedEvents.add(deliveryId);

  res.status(200).json({ received: true });

  const payload = JSON.parse(rawBody.toString());

  switch (event) {
    case 'push':
      await redis.publish('ci-events', JSON.stringify({
        type: 'push',
        repo: payload.repository.full_name,
        branch: payload.ref,
        pusher: payload.pusher.name,
        commits: payload.commits.length,
      }));
      break;

    case 'workflow_run':
      await redis.publish('ci-events', JSON.stringify({
        type: 'workflow',
        repo: payload.repository.full_name,
        workflow: payload.workflow_run.name,
        status: payload.workflow_run.status,
        conclusion: payload.workflow_run.conclusion,
      }));
      break;

    case 'pull_request':
      await redis.publish('pr-events', JSON.stringify({
        type: 'pull_request',
        action: payload.action,
        title: payload.pull_request.title,
        author: payload.pull_request.user.login,
        repo: payload.repository.full_name,
      }));
      break;
  }
});
```

### D. SSE Bridge — Redis Pub/Sub to Browser

```typescript
// sse-bridge.ts
import { Request, Response } from 'express';
import Redis from 'ioredis';

// Each SSE connection gets its own Redis subscriber
app.get('/api/events/stream', (req: Request, res: Response) => {
  const userId = req.user?.id; // from auth middleware

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // disable Nginx buffering
  });

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  // Subscribe to user-specific and broadcast channels
  const subscriber = new Redis(process.env.REDIS_URL!);
  const channels = [`user:${userId}:events`, 'broadcast-events', 'payment-events'];
  subscriber.subscribe(...channels);

  let eventId = 0;

  subscriber.on('message', (channel: string, message: string) => {
    const parsed = JSON.parse(message);

    // Filter: only send events relevant to this user
    if (channel === 'payment-events' && parsed.userId !== userId) return;

    eventId++;
    res.write(`id: ${eventId}\n`);
    res.write(`event: ${parsed.type}\n`);
    res.write(`data: ${message}\n\n`);
  });

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30_000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    subscriber.unsubscribe();
    subscriber.quit();
  });
});
```

### E. React Component — Subscribing to Webhook Events via SSE

```tsx
// useWebhookEvents.ts
import { useEffect, useRef, useCallback, useReducer } from 'react';

interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
  receivedAt: number;
}

type EventAction =
  | { type: 'ADD_EVENT'; event: WebhookEvent }
  | { type: 'CLEAR' };

function eventReducer(state: WebhookEvent[], action: EventAction): WebhookEvent[] {
  switch (action.type) {
    case 'ADD_EVENT':
      return [action.event, ...state].slice(0, 100); // keep last 100
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export function useWebhookEvents(eventTypes: string[]) {
  const [events, dispatch] = useReducer(eventReducer, []);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/events/stream', { withCredentials: true });
    esRef.current = es;

    // Register handlers for each event type
    for (const eventType of eventTypes) {
      es.addEventListener(eventType, (e: Event) => {
        const messageEvent = e as MessageEvent;
        dispatch({
          type: 'ADD_EVENT',
          event: {
            type: eventType,
            data: JSON.parse(messageEvent.data),
            receivedAt: Date.now(),
          },
        });
      });
    }

    es.addEventListener('connected', () => {
      console.log('SSE connected successfully');
    });

    es.onerror = () => {
      console.warn('SSE error — EventSource will auto-reconnect');
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [eventTypes]);

  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  return { events, clear };
}

// ─── Payment Status Component ───────────────────────────────────────
// PaymentTracker.tsx

import React, { useMemo } from 'react';
import { useWebhookEvents } from './useWebhookEvents';

const PAYMENT_EVENTS = ['payment.success', 'payment.failed'] as const;

export function PaymentTracker() {
  const { events } = useWebhookEvents([...PAYMENT_EVENTS]);

  const latestPayment = useMemo(() => events[0], [events]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {latestPayment?.type === 'payment.success' && (
        <div className="payment-success">
          Payment of ${(latestPayment.data.amount as number) / 100} succeeded!
        </div>
      )}
      {latestPayment?.type === 'payment.failed' && (
        <div className="payment-failed" role="alert">
          Payment failed: {latestPayment.data.error as string}
        </div>
      )}
      <h3>Recent Payment Events</h3>
      <ul>
        {events.map((evt, i) => (
          <li key={`${evt.type}-${evt.receivedAt}-${i}`}>
            [{new Date(evt.receivedAt).toLocaleTimeString()}]{' '}
            {evt.type}: {JSON.stringify(evt.data)}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### F. Security Deep Dive

```
WEBHOOK SECURITY CHECKLIST
──────────────────────────

1. HMAC-SHA256 Signature Verification
   ┌──────────────────────────────────────────────────────────┐
   │ Sender:  HMAC-SHA256(raw_body, shared_secret) → header  │
   │ Receiver: HMAC-SHA256(raw_body, shared_secret) → compare│
   │ MUST use crypto.timingSafeEqual() — NOT === or ==        │
   │ String comparison leaks timing info for side-channel     │
   └──────────────────────────────────────────────────────────┘

2. Replay Attack Prevention
   ┌──────────────────────────────────────────────────────────┐
   │ Check: abs(now - event_timestamp) < 5 minutes           │
   │ Stripe includes timestamp in signature computation      │
   │ Reject events older than tolerance window                │
   └──────────────────────────────────────────────────────────┘

3. Idempotency
   ┌──────────────────────────────────────────────────────────┐
   │ Store processed event IDs (Redis SET or DB unique index) │
   │ Return 200 for duplicates (stops provider retries)       │
   │ TTL on idempotency keys: 7 days (match retry window)    │
   └──────────────────────────────────────────────────────────┘

4. Network Security
   ┌──────────────────────────────────────────────────────────┐
   │ • HTTPS only (never accept webhooks over HTTP)           │
   │ • IP allowlist (Stripe publishes their IP ranges)        │
   │ • Webhook endpoint URL should be unguessable (/wh/abc123)│
   │ • Rate limiting on webhook endpoint                      │
   └──────────────────────────────────────────────────────────┘

5. Respond Fast, Process Async
   ┌──────────────────────────────────────────────────────────┐
   │ Return 200 within 3–5 seconds                            │
   │ Stripe/GitHub retry on timeout (30s Stripe, 10s GitHub)  │
   │ Offload heavy processing to a background queue           │
   └──────────────────────────────────────────────────────────┘
```

**Idempotency implementation with Redis TTL:**

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);
const IDEMPOTENCY_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

async function isProcessed(eventId: string): Promise<boolean> {
  // SETNX returns 1 if key was set (new event), 0 if already exists (duplicate)
  const result = await redis.set(
    `webhook:processed:${eventId}`,
    '1',
    'EX', IDEMPOTENCY_TTL,
    'NX'
  );
  return result === null; // null means key already existed → duplicate
}

// Usage in webhook handler
app.post('/webhooks/stripe', async (req, res) => {
  // ... signature verification ...
  const event = JSON.parse((req.body as Buffer).toString());

  if (await isProcessed(event.id)) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  res.status(200).json({ received: true });
  await processWebhookEvent(event);
});
```

### G. Production Considerations

**Retry Logic (Provider Side):**

```
Stripe retry schedule:     GitHub retry schedule:
─────────────────────     ──────────────────────
Attempt 1: immediate      Attempt 1: immediate
Attempt 2: 1 hour         Attempt 2: 5 minutes
Attempt 3: 2 hours        Attempt 3: 20 minutes
Attempt 4: 4 hours        (total: 3 attempts)
...up to 8 attempts
over ~3 days
```

**Dead Letter Queue (DLQ) pattern:**

```typescript
// dlq-processor.ts — Runs as a separate worker process

async function processDLQ(): Promise<void> {
  while (true) {
    const item = await redis.lpop('webhook-dlq');
    if (!item) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    const dlqEntry = JSON.parse(item);

    if (dlqEntry.retryCount >= 5) {
      // Permanently failed — alert ops team
      console.error('PERMANENT FAILURE:', dlqEntry.event.id);
      await redis.rpush('webhook-permanent-failures', item);
      continue;
    }

    try {
      await processWebhookEvent(dlqEntry.event);
    } catch (err) {
      // Re-enqueue with incremented retry count
      dlqEntry.retryCount++;
      dlqEntry.lastError = (err as Error).message;
      dlqEntry.lastRetry = new Date().toISOString();
      await redis.rpush('webhook-dlq', JSON.stringify(dlqEntry));
    }
  }
}
```

**Webhook debugging dashboard:**

```typescript
// webhook-debug.ts — Admin endpoint for debugging webhook issues

app.get('/admin/webhooks/recent', async (req, res) => {
  // Return last 50 webhook events with processing status
  const events = await db.query(`
    SELECT id, source, event_type, status, received_at, processed_at, error
    FROM webhook_events
    ORDER BY received_at DESC
    LIMIT 50
  `);
  res.json(events);
});

app.post('/admin/webhooks/replay/:id', async (req, res) => {
  // Replay a specific webhook event for debugging
  const event = await db.query(
    'SELECT raw_payload FROM webhook_events WHERE id = $1',
    [req.params.id]
  );
  if (!event.rows[0]) return res.status(404).json({ error: 'Not found' });

  try {
    await processWebhookEvent(JSON.parse(event.rows[0].raw_payload));
    res.json({ status: 'replayed' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/admin/webhooks/dlq', async (req, res) => {
  const length = await redis.llen('webhook-dlq');
  const items = await redis.lrange('webhook-dlq', 0, 49);
  res.json({ queueLength: length, items: items.map(JSON.parse) });
});
```

### H. Anti-Patterns

| Anti-Pattern | Risk | Correct Approach |
|---|---|---|
| **Exposing webhook URL without signature verification** | Attacker can forge events, trigger fake payments | Always verify HMAC signature with constant-time compare |
| **Using `===` for signature comparison** | Timing side-channel leaks valid signature bytes | Use `crypto.timingSafeEqual()` |
| **Processing synchronously before responding 200** | Provider times out, retries, causes duplicates | Respond 200 immediately, process via queue |
| **Not checking timestamp** | Replay attacks — attacker resends captured events | Reject events with timestamp > 5min drift |
| **No idempotency handling** | Duplicate payments, double notifications | Track event IDs with TTL in Redis |
| **Sending webhook data directly to browser via WS** | Exposes internal event structure, signature data | Transform/filter events before forwarding |
| **Logging raw webhook payloads** | Secrets, PII in logs (payment details, tokens) | Redact sensitive fields before logging |
| **Using GET for webhook endpoints** | Breaks HTTP semantics, no request body | Always POST — that's the webhook contract |
| **Hardcoding webhook secrets** | Secret rotation becomes impossible | Use environment variables, rotate via secret manager |
| **No DLQ for failed webhook processing** | Events silently lost on processing errors | Dead letter queue with retry + alerting |

────────────────────────────────────────────────────────────────────────

## 3. Clear Real-World Examples

**Example 1 — Hruday's Micro-Frontend Payment Flow:**
In the micro-frontend architecture, Hruday integrated Stripe webhooks for real-time payment
tracking. The architecture:
- Stripe sends `payment_intent.succeeded` → Express webhook receiver (HMAC verified)
- Event stored in PostgreSQL for audit trail
- Published to Redis Pub/Sub channel `payment-events`
- SSE bridge subscribes to Redis → streams to React checkout micro-frontend
- React component uses `aria-live="polite"` for WCAG AA compliance
- Result: zero missed payment confirmations, <500ms browser notification latency

**Example 2 — Bosch CI/CD Dashboard (GitHub Webhooks):**
For the Bosch WebSocket dashboard, GitHub webhooks drove deploy status:
- GitHub `workflow_run` webhook → Node.js receiver → Redis → WebSocket → dashboard
- Combined with sensor data streams on the same WebSocket connection
- Idempotency via GitHub's `X-GitHub-Delivery` header (UUID per delivery)

**Example 3 — SAP Notification System (Slack Webhooks):**
As part of Hruday's security hardening (80% vulnerability reduction), the team implemented:
- Incoming webhooks from security scanners → verified, filtered, stored
- Outgoing Slack webhook notifications for critical alerts
- Signature verification caught 12 spoofed webhook attempts in the first month

────────────────────────────────────────────────────────────────────────

## 4. Interview-Oriented Explanation

**Common interview questions:**
1. "How do webhooks differ from WebSockets?"
2. "How would you handle Stripe payment webhooks in a frontend application?"
3. "What security concerns exist with webhooks?"
4. "How do you ensure no webhook events are lost?"

> **Sample Answer (Question 2 — Stripe Payment Webhooks):**
>
> "The browser never receives webhooks directly — they're server-to-server. Here's the
> architecture I implemented in a micro-frontend payment system:
>
> Stripe sends a POST to our `/webhooks/stripe` endpoint when a payment event occurs.
> The first thing we do is verify the HMAC-SHA256 signature using `crypto.timingSafeEqual()`
> — never a plain `===` comparison, which leaks timing information. We also check the
> timestamp to prevent replay attacks (reject events older than 5 minutes).
>
> We respond with 200 immediately — before processing — because Stripe retries on timeout
> after 20 seconds. The actual event processing happens asynchronously: we store the event
> in PostgreSQL for the audit trail, then publish to a Redis Pub/Sub channel.
>
> On the frontend side, the React app opens an SSE connection to `/api/events/stream`.
> Our server subscribes to the Redis channel and forwards relevant events through SSE.
> The React component uses `useReducer` for event state and `aria-live='polite'` for
> accessibility — part of our WCAG AA certification work.
>
> For reliability, we use idempotency keys (Stripe's event ID stored in Redis with a
> 7-day TTL) so duplicate deliveries are safely ignored. Failed processing goes to a
> dead letter queue with retry logic and alerting.
>
> This pattern gave us zero missed payment events and sub-500ms notification latency
> to the browser."

**Follow-up questions to prepare:**
- "How do you handle webhook secret rotation?" → Dual-secret validation during rotation window
- "What if Redis goes down?" → Fall back to database polling; events are persisted first
- "How do you scale this to millions of events?" → Kafka instead of Redis for durability, partitioned by userId
- "What about webhook event ordering?" → Store sequence numbers, client-side reordering buffer

────────────────────────────────────────────────────────────────────────

## 5. Code Examples

See Section 2 for complete implementations:
- **Section 2B**: Full Stripe webhook receiver with HMAC verification
- **Section 2C**: GitHub webhook receiver for CI/CD events
- **Section 2D**: SSE bridge from Redis Pub/Sub to browser
- **Section 2E**: React component and `useWebhookEvents` hook
- **Section 2F**: Security deep-dive with idempotency implementation
- **Section 2G**: Dead letter queue processor and debug dashboard

**Additional — Testing webhooks locally:**

```bash
# Stripe CLI — forward webhooks to local dev server
stripe listen --forward-to localhost:3000/webhooks/stripe
# stripe trigger payment_intent.succeeded  (simulate event)

# ngrok — expose local server for any webhook provider
ngrok http 3000
# Use the ngrok URL as webhook endpoint in provider dashboard

# curl — manual webhook testing
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: sha256=$(echo -n '{"id":"evt_test","type":"payment_intent.succeeded"}' | openssl dgram -sha256 -hmac 'whsec_test')" \
  -d '{"id":"evt_test","type":"payment_intent.succeeded","data":{"object":{"amount":2000}}}'
```

**Integration test:**

```typescript
// webhook.test.ts
import crypto from 'crypto';
import request from 'supertest';
import { app } from '../webhook-server';

const WEBHOOK_SECRET = 'whsec_test_secret';

function generateSignature(payload: string): string {
  return 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(Buffer.from(payload))
    .digest('hex');
}

describe('Stripe Webhook', () => {
  const validPayload = JSON.stringify({
    id: 'evt_123',
    type: 'payment_intent.succeeded',
    data: { object: { amount: 5000, metadata: { userId: 'user_1' } } },
  });

  it('accepts valid signed webhook', async () => {
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', generateSignature(validPayload))
      .set('X-Stripe-Timestamp', String(Math.floor(Date.now() / 1000)))
      .send(Buffer.from(validPayload));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('rejects invalid signature', async () => {
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 'sha256=invalid')
      .send(Buffer.from(validPayload));

    expect(res.status).toBe(401);
  });

  it('handles duplicate events idempotently', async () => {
    const sig = generateSignature(validPayload);
    const timestamp = String(Math.floor(Date.now() / 1000));

    // First delivery
    await request(app)
      .post('/webhooks/stripe')
      .set('Stripe-Signature', sig)
      .set('X-Stripe-Timestamp', timestamp)
      .send(Buffer.from(validPayload))
      .expect(200);

    // Duplicate delivery
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Stripe-Signature', sig)
      .set('X-Stripe-Timestamp', timestamp)
      .send(Buffer.from(validPayload));

    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);
  });
});
```

────────────────────────────────────────────────────────────────────────

## 6. Why & How Summary

| Question | Answer |
|---|---|
| **Why does this matter?** | Webhooks are how 80% of third-party integrations deliver events — Stripe, GitHub, Slack, Twilio |
| **Why should frontend engineers care?** | You must design the bridge: webhook → server → browser; affects UX for payments, notifications, CI |
| **When does it come up in interviews?** | "Design a payment system", "Real-time notification arch", "Third-party integration patterns" |
| **How to explain quickly?** | "Webhooks are server-to-server HTTP callbacks. I bridge them to the browser via SSE or WebSocket through a Redis Pub/Sub layer." |
| **How did Hruday apply this?** | Stripe webhooks in micro-frontend arch, GitHub webhooks for Bosch CI dashboard, security hardening (80% vuln reduction) with HMAC verification |
| **Key security checklist** | HMAC-SHA256 + timingSafeEqual, timestamp check (<5min), idempotency keys, HTTPS only, IP allowlist |
| **Scale path** | Redis Pub/Sub → Kafka for 1M+ events/day; partition by userId; DLQ for failures |
| **Accessibility tie-in** | `aria-live="polite"` on payment status updates — WCAG AA compliance from Hruday's SAP Lighthouse optimization |

────────────────────────────────────────────────────────────────────────
*Prep file for Hruday — Microsoft, Adobe, Salesforce, Cisco interviews*
