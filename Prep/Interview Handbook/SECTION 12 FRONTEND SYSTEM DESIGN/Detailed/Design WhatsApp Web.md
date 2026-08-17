# Design WhatsApp Web

*Chat, Typing Indicators, Presence, Read Receipts, Media & E2E Encryption*

**Frontend System Design Handbook — Staff/Principal-Level Interview Preparation**

---

# PART 1 — Problem Statement

## Business Requirements

- WhatsApp Web is a **companion client**: it extends an identity anchored on a phone (or, in the modern multi-device architecture, an independently linked device) into the browser, trading on the parent product's core brand promise — **end-to-end encrypted, low-friction messaging at global scale** — with no ads and minimal monetization pressure on the consumer product itself (monetization instead comes via the separate Business/Cloud API).
- Trust is existential to the product: any architecture decision that could plausibly let a server operator read message content undermines the entire value proposition, so **encryption is a frontend architecture constraint, not a backend afterthought**.
- Must work acceptably on weak, high-latency, or intermittent connections, since a huge fraction of the user base is in markets where this is the norm, not the exception.

## Functional Requirements

- **One-to-one and group chat** with text, images, video, voice notes, documents, and stickers.
- **Typing indicators** and **online/last-seen presence**, both user-configurable for privacy.
- **Read receipts**: per-message delivery and read state (the familiar single-tick/double-tick/blue-tick progression), with **per-recipient** granularity in group chats.
- Message **reactions, replies/quoting, forwarding, and deletion** (delete-for-me vs. delete-for-everyone, with a time window for the latter).
- **Multi-device linking**: a web session is established by scanning a QR code, after which (in the modern architecture) the web client can continue operating with reduced dependency on the originating phone being online.
- Chat list features: search, archive, pin, mute, unread counts.
- Desktop/browser notifications for new messages when the tab isn't focused.

## Non-Functional Requirements

- **End-to-end encryption** for all message content and media, using a Signal-protocol-style **double ratchet** — each message is encrypted with a per-message key derived from an evolving per-chat session, giving forward secrecy.
- **Low latency**: typical message delivery to an online recipient in well under a second; the client must never make the *sender's own* message feel delayed by encryption or network overhead — local echo is immediate.
- **Reliability under poor networks**: messages must queue, retry, and eventually deliver or clearly fail — never silently vanish.
- **Scale**: billions of users, tens of billions of messages per day, a meaningful fraction of which are sent and received entirely via web/desktop companion sessions.
- **Data minimization**: server-side infrastructure should retain as little plaintext (ideally none) as the encryption model allows — this shapes what the *frontend* can rely on the server for (e.g., no server-side message search, since the server can't read content).

## User Scale Assumptions

- 2B+ users; web/desktop sessions are a secondary but very high-volume surface, with single popular group chats running into hundreds of participants.
- Assume a long tail of users on low-end devices and unreliable connections is the **majority case to design for**, not the edge case.

## Performance Expectations

- Chat list open-to-interactive in under ~1 second; opening a specific conversation should render recent messages near-instantly from local cache.
- Local message send echo (the message appearing in the conversation, in a "sending" state) must be effectively instantaneous, decoupled from actual network delivery.
- Media (especially voice notes and images) should show a thumbnail/waveform immediately, with full content streamed/decrypted progressively.

## Accessibility Requirements

- Full keyboard navigation between chats and within a conversation; screen reader announcements of new messages that **summarize rather than read aloud every single message**, to avoid overwhelming a user in an active group chat.
- WCAG 2.1 AA baseline; accessible labeling of message status icons (sent/delivered/read) which are otherwise purely iconographic.

## Security Requirements

- **Signal-protocol-style end-to-end encryption**: private keys are generated and held on-device, never transmitted to or stored by the server in usable form.
- **Device linking security**: the QR-code pairing flow performs an authenticated key exchange so a linked web session is cryptographically tied to the user's identity, not just "logged in" in the conventional sense.
- **Local data protection**: message history cached in the browser is itself encrypted at rest where the platform allows, given that a browser profile is a more exposed storage environment than a dedicated mobile OS sandbox.
- Safety-number/security-code verification: the client must be able to detect and clearly surface when a conversation's underlying keys have changed (e.g., a contact reinstalled the app or linked a new device), since this is the visible signal of the entire trust model.

---

# PART 2 — Interviewer's Expectations

## What Interviewers Evaluate

- Does the candidate understand that **end-to-end encryption is a frontend architecture constraint** — it determines what the server can and can't do (no server-side search/indexing of content, no plaintext push notification bodies), not just a backend implementation detail?
- Can they separate **durable, acknowledged message delivery** from **ephemeral, lossy presence/typing signals**, and explain why those two need fundamentally different reliability guarantees?
- Do they reason correctly about **per-recipient delivery/read state** in group chats, rather than treating "read" as a single global boolean per message?
- Can they describe, at a conceptual level, how a **double ratchet** gives forward secrecy, without needing to derive the cryptography from scratch?

## Common Mistakes

- Designing a generic real-time chat app and never mentioning encryption at all — a serious omission for this specific product.
- Treating typing indicators and read receipts with the same reliability/retry guarantees as message content — they don't need to be, and over-engineering them wastes effort that should go toward message delivery correctness.
- Assuming "read" is a single per-message flag, which breaks immediately for group chats where each participant reads at a different time.
- No discussion of offline message queuing and what happens to that queue across a page reload or browser crash.

## Red Flags

- Proposing that the server stores or has access to plaintext message content "for search" or "for moderation" without acknowledging the direct conflict with the E2EE requirement.
- Storing cryptographic private keys in a way that's recoverable by the server, or treating key storage as an afterthought rather than a first-class security design decision.
- No concept of message ordering/deduplication — proposing that messages "just arrive in order," which doesn't hold under retries, reconnects, or multi-device delivery.
- Assuming push notifications can include the message text — under true E2EE, the push payload itself typically can't contain plaintext content (it has to be a "silent" trigger telling the client to fetch and decrypt locally).

## Strong Signals

- Explicitly distinguishes the **message relay/transport channel** (durable, acknowledged, retried, ciphertext-only) from the **presence/typing channel** (ephemeral, best-effort, fine to drop).
- Describes the **QR-code linking flow** as a real key-exchange step, not just a login convenience.
- Discusses **per-recipient delivery and read receipts** for groups, and how the UI aggregates them into the familiar single/double/blue-tick summary for the sender.
- Mentions that **link previews** (rendering a thumbnail/title for a shared URL) are a subtle privacy and security trap in an E2EE product — fetching the URL client-side can leak the user's IP/activity to the linked site, and fetching it server-side would require the server to see plaintext URLs.

## Staff-Level Signals

- Frames the **phone-dependent vs. independently-linked multi-device architecture** as a deliberate evolution with real trade-offs (availability of the web client when the phone is offline, vs. the added complexity of synchronizing encrypted state across multiple independently-keyed devices).
- Discusses how the crypto module is typically owned and audited as **its own hardened, separately-reviewed component**, with an unusually high bar for change review given the catastrophic blast radius of a cryptographic implementation bug.
- Reasons about **protocol versioning**: how a web client built today continues to interoperate correctly with phone clients running both older and newer protocol versions, across a userbase that updates asynchronously over months.
- Connects encryption constraints to concrete product trade-offs: e.g., why server-side full-text message search isn't offered, and what client-side alternatives (local, on-device search of decrypted history) exist instead.

---

# PART 3 — Requirement Gathering

- Is end-to-end encryption a hard requirement for this design, or are we designing a simpler chat product where transport-layer (TLS) encryption is acceptable?
- Should the web client be a true companion device (dependent on the phone being online to relay), or an independently linked device with its own delivery path, as in WhatsApp's modern multi-device architecture?
- What's the expected group chat size ceiling we need to design read-receipt aggregation and fan-out for?
- Do we need to support voice/video calling from the web client, or is this design scoped to messaging only?
- What's our policy on server-side retention of message ciphertext — deleted immediately after delivery, or retained briefly for offline recipients?
- Do we need local, on-device search across message history, given that server-side content search isn't possible under E2EE?
- What's the expected behavior when a contact's encryption keys change (e.g., they reinstalled the app) — silent re-encryption, or an explicit user-facing warning?
- Should typing indicators and last-seen presence be user-configurable privacy settings, and does that affect the architecture (e.g., per-relationship visibility rules)?
- Do we need to support link previews for shared URLs, and if so, what's the acceptable privacy trade-off for fetching them?
- What's the offline tolerance — how long should queued outbound messages persist locally before we consider the send permanently failed?
- Is there a desktop notification requirement, and should notification content be redacted (e.g., "New message" instead of the actual text) for privacy?
- Should we assume a single primary device of record (the phone) for this design, or design from the start for N independently-linked devices per account?
- What's our approach to media: do large videos/documents need resumable upload, and are they encrypted client-side before upload or relies on transport encryption only?
- Do we need to support business/enterprise use cases (e.g., the Business API) in this design, or is this scoped to the consumer messaging product only?

---

# PART 4 — High-Level Architecture

## Architecture Diagram (ASCII)

```
                         CLIENT (Browser — linked/companion device)
┌────────────────┐  ┌──────────────────────┐  ┌────────────────────┐  ┌───────────────────┐
│ Chat List      │  │ Conversation View    │  │ Composer / Media   │  │ Presence / Typing │
│ (virtualized,  │  │ (virtualized message │  │ (text, voice note, │  │ (ephemeral, lossy │
│ unread/pinned) │  │ list, receipts)      │  │ image/doc upload)  │  │ channel)          │
└────────────────┘  └──────────────────────┘  └────────────────────┘  └───────────────────┘
                                             ▼
                  ┌─────────────────────────────────────────────────────┐
                  │ E2EE Crypto Module (Signal-style double ratchet)    │
                  │ per-chat session keys · encrypt/decrypt · key store │
                  └─────────────────────────────────────────────────────┘
                                             ▼
                   ┌───────────────────────────────────────────────────┐
                   │ Local Encrypted Store (IndexedDB)                 │
                   │ ciphertext history · outbound queue · device keys │
                   └───────────────────────────────────────────────────┘
                                             ▼
                          ┌────────────────────────────────────┐
                          │ Persistent WebSocket               │
                          │ (message relay + presence, in/out) │
                          └────────────────────────────────────┘
                                             ▼
                        ┌────────────────────────────────────────┐
                        │ Message Relay / Fan-out Service        │
                        │ orders + delivers per-recipient,       │
                        │ stores ciphertext only until delivered │
                        └────────────────────────────────────────┘
                                             ▼
          ┌─────────────────┐   ┌───────────────────────┐   ┌───────────────────┐
          │ Encrypted Media │   │ Push Notification     │   │ Device / Key      │
          │ Blob Storage    │   │ Service (silent push) │   │ Directory Service │
          └─────────────────┘   └───────────────────────┘   └───────────────────┘
```

## Component Breakdown

- **Chat list / Conversation view / Composer**: the standard messaging UI surfaces, each virtualized (chat list can have thousands of conversations; a single conversation can have tens of thousands of messages).
- **Presence/typing**: deliberately drawn as a separate path from the message UI components because it's backed by a different (ephemeral) channel.
- **E2EE crypto module**: sits between the UI/data layer and the transport layer — every outbound message passes through it to be encrypted, and every inbound ciphertext passes through it to be decrypted, before the rest of the app ever sees plaintext.
- **Local encrypted store**: the client's durable cache of message history (as ciphertext or re-encrypted-at-rest plaintext, depending on platform storage protections) plus the outbound send queue and the device's own key material.
- **Message relay/fan-out service**: routes ciphertext between devices; critically, it operates on **opaque ciphertext** — it can route and store-briefly without being able to read content.
- **Device/key directory service**: the public-key infrastructure side — published per-device public keys that other clients fetch to establish or update encrypted sessions, and the mechanism the QR-linking flow uses to register a new device.

## Frontend Layers

1. **UI layer** — chat list, conversation view, composer, presence indicators.
2. **Crypto layer** — encrypt/decrypt, session/key management, the most security-critical layer in the app.
3. **Data layer** — normalized message store, local encrypted cache, outbound queue.
4. **Transport layer** — persistent WebSocket for messages and presence; separate path for media blob upload/download.

## Backend Dependencies

- Message relay/fan-out service (ciphertext routing, not a content store of record).
- Encrypted media blob storage.
- Push notification service (delivers a "silent" wake signal, not message content).
- Device/key directory service (public key distribution and device linking).

## Data Flow

- **Send a message**: composer hands plaintext to the crypto module → encrypted using the current ratchet state for that chat/recipient(s) → ciphertext appended to the outbound queue and rendered locally as "sending" → sent over the WebSocket → relay delivers to recipient device(s) and returns an ack → client updates the message to "sent," and later to "delivered"/"read" as receipts arrive.
- **Receive a message**: ciphertext arrives over the WebSocket → crypto module decrypts using the corresponding session state, advancing the ratchet → plaintext is stored in the local encrypted cache and rendered → a delivery (and, once viewed, read) receipt is sent back through the same encrypted channel.
- **Link a new device (QR flow)**: the web client generates a key pair and displays a QR code encoding its public key and a session nonce; the phone scans it, performs an authenticated key exchange, and registers the new device with the key directory service — establishing a session the new device can use independently going forward.

---

# PART 5 — Frontend Architecture

## Folder Structure

```
src/
  chat-list/             // virtualized conversation list, unread/pinned state
  conversation/           // virtualized message list, receipts, reactions
  composer/                // text input, voice note recording, media attach
  media/                    // upload/download, thumbnailing, progressive decrypt
  crypto/
    ratchet/                 // double-ratchet session state per chat
    key-store/                // local key material, device registration
  presence/                  // typing + online/last-seen, ephemeral channel
  device-linking/             // QR generation/scan flow, key exchange
  shared/
    data/                      // normalized message store, outbound queue
    persistence/                // encrypted IndexedDB wrapper
    ui/
```

## Component Architecture

- The **crypto module is deliberately isolated** behind a narrow interface (`encrypt(plaintext, sessionId)` / `decrypt(ciphertext, sessionId)`) so the rest of the app never touches raw key material directly — this containment is itself a security property, not just a code-organization preference.
- **Message rows are pure, memoized components** keyed by message ID + status, so a receipt update (delivered → read) re-renders only that one row.

## State Management

- The normalized message store holds **decrypted plaintext in memory** for rendering, backed by an encrypted-at-rest local cache — the in-memory/render layer and the persistence layer have intentionally different security postures.
- Presence/typing state is fully separate, ephemeral, and explicitly allowed to be lossy or stale by a few hundred milliseconds.

## Data Fetching

- On open, recent messages render instantly from the local encrypted cache; any messages that arrived while the client was offline are fetched and decrypted incrementally, oldest-pending-first.
- Older history beyond local cache retention loads on demand (scroll-up pagination within a conversation).

## Caching Strategy

- Local cache is the **primary source of message history** for the web client in most architectures — not because the server can't be queried, but because the server fundamentally shouldn't (and often can't) serve back plaintext it never had.

## Error Handling

- A **decryption failure** is treated as a distinct, elevated error class (possible key mismatch, corrupted session) — surfaced to the user as a clear "couldn't decrypt this message" state rather than silently dropped or, worse, shown as garbled text.
- A failed send retries automatically; after exhausting retries, the message is marked with a clear, user-visible "not delivered, tap to retry" state.

## Retry Strategy

- Outbound queue persists across reloads (in the local encrypted store) and retries with backoff on reconnect; messages carry a client-generated unique ID so a retried send can't be delivered twice as separate messages.

## Loading States

- Optimistic local echo: a sent message appears immediately in "sending" (single gray tick equivalent) state, transitioning to "sent," "delivered," and "read" as the corresponding acks/receipts arrive — never blocking the UI on network round-trips.

## Feature Flags

- Changes to the crypto/ratchet implementation are the highest-risk class of change in the app and ship behind the most conservative possible rollout process, often with extensive interop testing against multiple client versions before any real rollout begins.

## Analytics Integration

- Analytics are unusually constrained here: **no message content, ever**, and even metadata is minimized — counts and durations only (e.g., "message sent," "media upload duration"), consistent with the product's privacy commitments.

---

# PART 6 — Performance Engineering

## Initial Load Optimization

- The crypto module and the chat-list shell are part of the critical initial bundle, since essentially no useful interaction is possible without them; richer features (stickers, advanced media editing) load lazily.

## Bundle Splitting

- Media editing tools (image crop/filters, video trimming) and the device-linking/QR flow are separate, lazily-loaded chunks not needed for the core send/receive path.

## Lazy Loading

- Voice note waveforms, video thumbnails, and document previews generate/load only as a conversation scrolls them into view.

## Prefetching

- Prefetch decryption of the next likely-to-be-opened conversation's most recent messages when the user's attention (hover/focus) suggests they're about to open it.

## Virtualization

- Both the **chat list** (potentially thousands of conversations) and **each conversation's message list** (potentially tens of thousands of messages) are independently virtualized.

## Memoization

- Memoize message rows by ID + status so a receipt transition (delivered → read) doesn't re-render the surrounding messages or, critically, re-trigger any decryption work for already-decrypted content.

## Rendering Optimization

- Avoid re-decrypting already-decrypted, already-cached messages on every render — decryption is a one-time cost per message, cached in the in-memory store afterward.

## API Optimization

- Batch outgoing read receipts (e.g., "read up to message N" as a single watermark) rather than one receipt message per individual message read, especially relevant in fast-scrolling group chats.

## Browser Optimization

- Run cryptographic operations (encryption, decryption, key derivation) in a **Web Worker** wherever the platform allows, so a burst of incoming messages in an active group chat doesn't janky the main UI thread.

---

# PART 7 — Scalability

| Scale | Architecture Characteristics | Primary Bottlenecks | Mitigations |
|---|---|---|---|
| 10K users | Single relay service instance, simple per-chat ratchet sessions, basic WebSocket | Minimal; focus on correctness of the encryption flow | Straightforward implementation, thorough crypto correctness testing even at small scale |
| 100K users | Relay sharded by user/device, push notification service introduced for backgrounded clients | Connection volume on the relay; push payload design under E2EE constraints | Consistent-hash sharding by recipient; silent push payloads that trigger a client-side fetch-and-decrypt |
| 1M users | Multi-device support formalized (independently linked devices, not just phone-dependent), media blob storage scaled independently | Synchronizing encrypted state correctly across multiple devices per account; media storage/bandwidth costs | Per-device session state with a defined sync protocol; media stored encrypted with content-addressed deduplication where possible |
| 100M+ users | Global multi-region relay infrastructure, dedicated team owning the crypto protocol as an internal platform, protocol versioning across years of client versions in the wild | Backward/forward compatibility across a huge installed base updating asynchronously; the sheer correctness-verification surface of the crypto protocol at this scale | Strict protocol versioning with negotiated capabilities; extensive interop test matrices across client versions; treat any crypto correctness issue as a top-severity incident |

## Bottlenecks and Solutions, Explained

- Unlike most consumer apps, the dominant scaling challenge here is not purely infrastructural throughput — it's **maintaining cryptographic correctness and interoperability** across a massive, slowly-and-asynchronously-updating client population. A relay service scaling issue is operationally painful; a crypto protocol compatibility bug can silently break message delivery or, worse, security guarantees, for a subset of users in a way that's hard to detect.
- **Multi-device support** is itself a major scaling-driven architectural shift: phone-dependent relay (web client only works while the phone is reachable) is simpler but limits availability; independently-linked devices remove that dependency at the cost of needing to synchronize encrypted session state correctly across N devices per account.

---

# PART 8 — Accessibility

## WCAG Compliance

- WCAG 2.1 AA baseline, with specific attention to message status icons (sent/delivered/read ticks) which are purely visual/iconographic by default and need accessible text equivalents.

## Keyboard Navigation

- Full keyboard movement between chats in the list and between messages within a conversation; composer fully keyboard-operable including media attachment and voice note recording triggers.

## Screen Readers

- New-message announcements are **summarized, not exhaustive** — a screen reader user actively engaged in a fast-moving group chat should hear "3 new messages in Project Team," not have every individual message interrupt their current task.

## ARIA Strategy

- Each message exposes an accessible name combining sender, content (or a content-type label like "voice message, 0:14" for non-text content), and status, so status isn't communicated by icon color/shape alone.

## Focus Management

- Opening a conversation moves focus sensibly into the message list or composer; sending a message keeps focus in the composer for rapid successive sends rather than relocating focus unexpectedly.

## Enterprise Accessibility Requirements

- Less contractually driven than in Workspace-style B2B products, but still important given the product's massive, globally diverse user base, which includes a meaningful population of assistive-technology users.

---

# PART 9 — Security

## Authentication

- Account identity is anchored to a phone number (in the consumer product) and a phone-based primary authentication flow; the web client authenticates the *session* via the device-linking key exchange, not a separate password.

## Authorization

- Authorization here is almost entirely about **which devices are linked to which account and what keys they hold** — there isn't a complex permission model beyond "is this device a legitimately linked device for this account."

## Session Management

- A user can view and revoke linked devices from the primary device; revoking a device must invalidate its session and key material promptly, not just stop showing it in a list.

## XSS Protection

- Message text is user-generated and must be rendered safely (no execution of embedded scripts/links); **link previews are a particularly sensitive case** — generating a preview by fetching the URL can leak the user's IP/activity to the linked site, so this is either done very carefully (e.g., proxied, deliberately rate-limited/anonymized) or made an explicit, opt-in action rather than automatic.

## CSRF Protection

- Standard CSRF protections apply to account-management REST endpoints (e.g., changing privacy settings); the core messaging path is authenticated via the persistent, keyed WebSocket session rather than being CSRF-relevant in the traditional sense.

## Clickjacking Protection

- Standard frame-ancestors restrictions; no legitimate use case for framing this app within another site.

## Sensitive Data Handling

- **Private key material never leaves the device** in usable form — this is the central security invariant of the entire product, and any design that requires the server to possess decryptable keys violates it.
- Local message cache, where the platform allows, is encrypted at rest, since a browser profile is a more exposed environment (shared computers, browser extensions, disk access) than a dedicated mobile sandbox.

---

# PART 10 — Offline Support

## Service Workers

- Cache the app shell for fast reload; the message content itself lives in the encrypted IndexedDB store, not the service worker's static cache.

## Local Storage Usage

- Not used for message content or key material; at most, small non-sensitive UI preferences.

## IndexedDB

- The durable local store for decrypted-for-display message history (encrypted at rest where supported), the outbound send queue, and the device's own key material/session state — this is the most security-sensitive client-side data store in the entire application.

## Synchronization Strategy

- Outbound messages queue locally while offline, each carrying a client-generated unique ID; on reconnect, the queue flushes in order, with the relay deduplicating on that ID if a message had partially gone through before the disconnect.
- Inbound messages that arrived at the relay while the client was offline are delivered on reconnect; the client decrypts and applies them in the order the relay delivers them, advancing each affected chat's ratchet state accordingly.

## Conflict Resolution

- Message *content* doesn't have a meaningful "conflict" case — it's an append-only log per chat. The real synchronization challenge is **read-receipt/last-read-pointer state across multiple devices** for the same account: each device tracks its own "read up to" watermark, and the aggregate "read" state shown to others reflects whichever device read most recently, merged via straightforward max-timestamp logic rather than anything more complex.

---

# PART 11 — Monitoring

## Logging

- Structured client logs with **zero message content**, ever — only structural events (connect, disconnect, send-attempt, decryption-failure) correlated by a session ID.

## Metrics

- Message round-trip delivery latency, send-success rate, and — uniquely important here — **decryption failure rate**, which is one of the most direct signals of either a client bug or a real security-relevant problem (e.g., a key-sync issue between linked devices).

## Error Tracking

- Decryption failures and key-mismatch events are treated as **elevated-severity** by default, since a spike can indicate a protocol compatibility issue affecting message delivery or, in the worst case, a security-relevant anomaly worth investigating immediately.

## User Monitoring

- RUM is deliberately limited given the product's privacy posture; what's collected is structural performance data (load time, send latency), never anything that could reconstruct conversation content or even precise social-graph detail beyond what's operationally necessary.

## Performance Monitoring

- Synthetic tests simulate the full encrypted send/receive round trip (not just network latency) to catch regressions in crypto-module performance specifically, since that's a distinct cost from plain network latency.

---

# PART 12 — Trade-Off Analysis

## Signal-Protocol-Style E2EE vs. Transport-Layer (TLS-Only) Encryption

- **Why choose full E2EE**: the server (and anyone who compromises it) genuinely cannot read message content, which is the core trust proposition of this specific product.
- **Alternative**: TLS in transit plus encryption-at-rest on the server, with the server itself capable of decrypting (common in many other chat/collaboration products).
- **Pros of E2EE**: strongest possible privacy guarantee, resilient even to a full server compromise.
- **Cons**: precludes server-side features that rely on reading content (full-text search, server-side spam scanning of message bodies, rich server-generated link previews) and adds real client-side complexity (key management, multi-device session sync).
- **When not to use full E2EE**: a product where server-side content features (search, moderation, compliance archiving) are a hard business requirement — those are fundamentally in tension with true E2EE and most non-privacy-first chat products reasonably choose differently.

## Phone-Dependent Relay vs. Independently-Linked Multi-Device Architecture

- **Why choose phone-dependent**: simpler initial design — one device is always the source of truth, and other devices are thin mirrors.
- **Alternative**: each linked device (including the web client) maintains its own independent encrypted session and delivery path.
- **Pros of independent multi-device**: the web client keeps working even if the phone is offline or its battery has died — a real, frequently-hit limitation of the phone-dependent model.
- **Cons**: significantly more complex key/session synchronization across devices, and a larger attack surface (more devices each holding live key material).
- **When phone-dependent is still reasonable**: an early-stage product, or one where "the phone is always the primary device and other surfaces are conveniences" is an acceptable and clearly communicated limitation.

## Optimistic Local Echo vs. Wait-for-Server-Ack Before Displaying a Sent Message

- **Why choose optimistic echo**: sending a message is the single most frequent action in the product; any perceptible delay between tapping send and seeing the message appear damages the core feel of the app.
- **Cons**: requires a well-designed status-progression UI (sending → sent → delivered → read) and a clear failure/retry state, rather than a single binary "did it work."
- **When not to use it**: not applicable here — optimistic echo is essentially universal in this product category for exactly this reason; the trade-off is in how clearly failures are surfaced, not whether to use it at all.

## Custom Virtualized Message List vs. Generic List Virtualization Library

- **Why build custom**: message lists have unusual requirements (variable-height bubbles, grouped consecutive messages from the same sender, inline media, receipts) that a generic list virtualization library handles less naturally than a generic flat list.
- **Cons**: more engineering investment to get right, particularly around maintaining scroll position when new messages arrive at the bottom while the user has scrolled up to read history.
- **When to prefer a library anyway**: if the message-rendering requirements are simple enough (uniform height, no grouping) that a generic virtualization library's defaults are sufficient — many smaller chat products reasonably make this choice.

---

# PART 13 — Follow-Up Questions

1. **How does a double ratchet provide forward secrecy?** Each message uses a freshly derived key from a continuously advancing chain, so compromising one message's key doesn't expose previous or subsequent messages' keys.
2. **What happens if a recipient is offline when a message is sent?** The relay holds the ciphertext briefly and delivers it (and triggers a silent push to wake the client) once the recipient reconnects; it does not require the sender to retry manually.
3. **How do you handle read receipts in a 200-person group chat without massive overhead?** Aggregate at the relay/client level (e.g., track a "read up to" watermark per participant) rather than emitting and rendering a separate per-message-per-person receipt event.
4. **What happens to in-flight encryption sessions when a user reinstalls the app (generating new keys)?** Other clients detect the key change on the next message exchange and must re-establish a session; a well-designed UI surfaces this as a clear, honest notice (e.g., a security-code-changed indicator) rather than silently re-encrypting without any signal.
5. **Why can't push notifications contain the message text?** Under true E2EE, the push delivery infrastructure (often a third-party platform service) isn't a party to the encrypted session, so it can't decrypt content — push payloads are typically a content-free "wake up and sync" trigger.
6. **How would you implement "typing…" without it feeling laggy or spammy?** Send lightweight, throttled (not per-keystroke) signals over the ephemeral presence channel, with a short client-side timeout that clears the indicator if no further signal arrives.
7. **How do you prevent a retried send from creating a duplicate message?** Each outbound message carries a client-generated unique ID; the relay and recipient clients deduplicate on that ID.
8. **How would you support local search across message history given the server can't search content?** Maintain a client-side, on-device index built from already-decrypted message history, queried entirely locally.
9. **What's the security risk of automatic link previews, and how would you mitigate it?** Fetching the linked URL to generate a preview can leak the user's IP/timing to the link's host; mitigations include proxying the fetch through infrastructure that doesn't correlate it to the specific user/account, or making preview generation an explicit opt-in action.
10. **How do you handle message ordering when messages arrive out of send order (e.g., due to retries or multi-device delivery)?** Each message carries a server-assigned or causally-ordered sequence reference per chat; the client orders by that, not by arrival time at the network layer.
11. **What happens if a user has the web client open on two different computers simultaneously?** Both are independently linked devices in the modern architecture, each maintaining their own session and receiving the same incoming messages; read-state synchronizes via the last-read watermark mechanism described in Part 10.
12. **How would you test the crypto module's correctness?** Extensive unit and property-based tests against the protocol specification, plus interop tests against other client implementations/versions, given how severe a silent crypto bug would be.
13. **Why is decryption done in a Web Worker rather than the main thread?** To prevent a burst of incoming messages (e.g., in a very active group) from blocking UI responsiveness, since cryptographic operations are CPU-bound.
14. **How do you handle media (e.g., a large video) under end-to-end encryption?** The media is encrypted client-side before upload to blob storage; the message itself carries a reference plus the decryption key (delivered through the already-encrypted message channel), so the blob storage layer only ever holds ciphertext.
15. **What's your approach to backward compatibility when you ship a new version of the encryption protocol?** Version negotiation: clients advertise supported protocol versions and fall back to the highest mutually-supported version, with very long support windows given how slowly some users update.
16. **How would you surface a "couldn't decrypt this message" failure to the user without being alarming for an ordinary, benign cause (e.g., a brief session de-sync)?** A calm, specific inline indicator on just that message, distinct from a security warning, reserving stronger alerts for genuine identity/key-mismatch cases.
17. **How do you keep the chat list responsive with thousands of conversations?** Virtualize the list and only fully hydrate (e.g., compute unread counts, last-message previews) for the visible window, lazily for the rest.
18. **What would you monitor to catch a regression in the crypto module before it affects many users?** Decryption failure rate and send-to-delivery success rate, segmented by client version, watched closely after any crypto-module release.
19. **How do you handle the case where a message fails to send after all retries are exhausted?** Mark it with a clear, persistent "not delivered" state with a manual retry affordance — never silently drop it from the conversation.
20. **Why might typing indicators and presence be implemented over a different channel than messages, even though both go over the same WebSocket connection?** They have fundamentally different durability requirements — losing a typing indicator is harmless, losing a message is not — so they're modeled, prioritized, and reasoned about as logically separate streams even if they share a transport.

---

# PART 14 — Staff Engineer Deep Dive

## Architectural Evolution

- This product class has generally evolved from a **single-primary-device, phone-dependent relay model** toward **independently-linked multi-device architectures**, driven by the very real user pain of the web client becoming useless when the phone's battery dies or it loses connectivity — a staff engineer should frame this as a scale- and reliability-driven evolution with a genuine added-complexity cost, not a free upgrade.

## Long-Term Maintainability

- The crypto/ratchet implementation is the highest-stakes code in the system; mature teams treat it with dedicated ownership, much heavier review and testing requirements, and explicit versioning discipline that most other application code doesn't need.

## Team Scalability

- A dedicated, often security-specialized team owns the crypto protocol and key/session management as an internal platform; feature teams (chat UI, media, presence) build against a stable encrypt/decrypt interface without needing deep cryptographic expertise themselves.

## Platform Strategy

- Treating the crypto module's interface as a stable internal platform (a narrow, well-documented `encrypt`/`decrypt`/`establishSession` API) lets the broader engineering org innovate on UI and features without each team needing to re-derive cryptographic correctness.

## Technical Debt Management

- Protocol version deprecation is unusually slow and careful here — dropping support for an older protocol version means some still-active users could lose the ability to exchange messages with up-to-date clients, so deprecation timelines are measured in a long, deliberate tail rather than typical feature-deprecation cycles.

## Migration Strategy

- Any change to the underlying ratchet/session protocol ships with extensive interop testing across old and new client versions and a negotiated-capability fallback, since a global, asynchronously-updating user base means both versions will coexist in production for a long time, by design.

---

# PART 15 — Production Reality

## What Most Companies Actually Do

- Very few chat products implement a full Signal-protocol-style double ratchet — it's genuinely hard to get right, and most products that don't have privacy as a core brand promise reasonably choose simpler transport-layer encryption with server-side decryption capability, accepting the trade-off in exchange for features like server-side search and moderation.
- Even among products that do offer "encryption," many apply it more loosely than true E2EE (e.g., encryption at rest with the server holding the keys) — recognizing this distinction is itself a useful piece of staff-level judgment when evaluating or describing any real system.

## Common Anti-Patterns

- Building a generic real-time chat architecture and retrofitting encryption later — encryption constraints (no server-side content access) need to shape the architecture from the start, not be bolted on.
- Treating presence/typing indicators with the same retry/durability machinery as messages, adding unnecessary complexity and server load for data that's explicitly allowed to be lossy.
- Generating link previews via a naive client-side fetch of arbitrary URLs, which is a well-known privacy leak vector in chat products generally.

## Lessons Learned

- **Users are remarkably sensitive to message status accuracy** — a "sent" tick that doesn't reliably mean sent, or a "read" receipt that's wrong, erodes trust in the product's core promise quickly and visibly.
- Encryption key-change warnings need very careful UX calibration: too alarming for routine, benign causes (a reinstall) trains users to ignore real warnings; too subtle defeats the purpose of having the warning at all.

## Real-World Failure Patterns

- **Cross-version protocol incompatibility** is a recurring real risk in any product maintained across a huge, slowly-updating install base — a change that assumes too much about which protocol version the other party speaks can silently break delivery for a subset of users, which is part of why version negotiation and very long support windows are taken so seriously.
- **Multi-device read-state confusion** (a message showing as unread on one linked device after being read on another) is a recurring, highly visible class of bug precisely because multi-device sync of "soft" state like read receipts is easy to under-design relative to the core message-delivery path.

---

# PART 16 — Interview Summary

## 5-Minute Answer

"The defining constraint here is end-to-end encryption — every message is encrypted client-side using a Signal-style double ratchet before it ever leaves the device, so the relay server only ever handles ciphertext and can't read content, search it, or include it in push notifications. That shapes the whole frontend: a dedicated crypto module sits between the UI and the transport layer, encrypting outbound and decrypting inbound messages; local message history is cached client-side since the server fundamentally can't serve back plaintext it never had. Sending is optimistic — a message appears locally as 'sending' instantly and progresses through sent/delivered/read as acks and receipts arrive, with per-recipient granularity in group chats. Presence and typing indicators travel over a deliberately separate, lossy, low-durability channel, since losing one is harmless, unlike a lost message."

## 15-Minute Answer

Extend with: the full architecture (chat list/conversation/composer UI, the crypto module, the local encrypted store, the persistent WebSocket, the relay/fan-out service, media blob storage, push, and the device/key directory service); the QR-code device-linking flow as a real key-exchange step; the data-flow walkthroughs for sending, receiving, and linking a new device; the offline queuing and dedup strategy (client-generated message IDs); and at least two explicit trade-off discussions — full E2EE vs. transport-only encryption, and phone-dependent vs. independently-linked multi-device architecture — stated with their concrete costs and the product-specific reasons this design picks one over the other.

## 30-Minute Deep Dive

Cover everything above, plus: the full scalability story and why protocol-version interoperability across a huge, asynchronously-updating client base is the dominant scaling challenge rather than pure throughput; the accessibility approach (summarized live-region announcements, accessible status-icon labeling); the security model end-to-end (key storage invariants, device revocation, the link-preview privacy trap); the monitoring strategy centered on decryption-failure rate and send-to-delivery success as the product's most important health signals; and a staff-level closing on how the crypto module is owned as a separately-hardened internal platform, why protocol changes require extensive cross-version interop testing and unusually long deprecation tails, and how production reality (most products not attempting full E2EE, and the recurring real-world failure modes around version incompatibility and multi-device read-state sync) tempers the idealized design into something an organization can operate safely, at global scale, for years.
