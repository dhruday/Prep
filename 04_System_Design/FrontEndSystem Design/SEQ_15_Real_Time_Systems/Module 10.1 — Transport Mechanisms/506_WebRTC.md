# 506. WebRTC (Web Real-Time Communication)

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
WebRTC (Web Real-Time Communication) is a set of browser APIs and protocols that enable **peer-to-peer** audio, video, and arbitrary data transfer directly between browsers without requiring an intermediary server for the media stream. It provides `RTCPeerConnection` for media/data channels, `getUserMedia` for camera/mic access, and `RTCDataChannel` for arbitrary binary/text data — all built into every modern browser with no plugins.

**Why it exists:**
Before WebRTC, real-time audio/video communication required Flash, Java applets, or proprietary plugins. WebRTC was standardized by the W3C and IETF to give browsers native, low-latency, encrypted peer-to-peer communication. It eliminates server bandwidth costs for media relay, reduces latency by removing the server hop, and provides end-to-end encryption by default (SRTP + DTLS).

**When and where it's used:**
- Video conferencing (Google Meet, Microsoft Teams, Zoom web client)
- Voice calls (Google Duo, Discord, Slack Huddles)
- Screen sharing (Figma live multiplayer, VS Code Live Share)
- Peer-to-peer file transfer (ShareDrop, WebTorrent)
- Live streaming with ultra-low latency (Twitch's sub-second beta)
- IoT and drone control (real-time telemetry data channels)
- Online gaming (peer-to-peer game state sync)

**Role in large-scale applications:**
At FAANG scale, WebRTC is the backbone of real-time collaboration. Google Meet handles 100M+ daily participants using WebRTC with SFU (Selective Forwarding Unit) architecture. Understanding ICE negotiation, STUN/TURN servers, codec selection (VP8/VP9/AV1, Opus), and bandwidth estimation is critical for senior frontend engineers building real-time features. Interview questions test your understanding of the signaling → offer/answer → ICE → DTLS → SRTP pipeline and when to use peer-to-peer vs. SFU vs. MCU topologies.

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. WebRTC Architecture & Protocol Stack**

```
┌──────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                         │
│  getUserMedia()  │  RTCPeerConnection  │  RTCDataChannel          │
├──────────────────┼─────────────────────┼─────────────────────────┤
│                        SESSION LAYER                             │
│              SRTP (Secure RTP)    │    SCTP (Data Channel)       │
│              ↓                    │    ↓                         │
│              DTLS (Encryption)    │    DTLS (Encryption)         │
├──────────────────────────────────────────────────────────────────┤
│                       TRANSPORT LAYER                            │
│                      ICE (Connectivity)                          │
│                  STUN ←──→ TURN (Relay Fallback)                 │
├──────────────────────────────────────────────────────────────────┤
│                       NETWORK LAYER                              │
│                    UDP (preferred) / TCP fallback                 │
└──────────────────────────────────────────────────────────────────┘
```

**Protocol breakdown:**

| Protocol | Layer | Purpose |
|----------|-------|---------|
| **ICE** | Connectivity | Finds the best network path between peers (host, srflx, relay) |
| **STUN** | NAT Traversal | Discovers public IP:port (reflexive candidate) |
| **TURN** | Relay | Relays media when direct connection fails (~15% of connections) |
| **DTLS** | Encryption | Key exchange for SRTP and SCTP — mandatory, no opt-out |
| **SRTP** | Media Transport | Encrypted audio/video packets over UDP |
| **SCTP** | Data Transport | Reliable/unreliable data channels over DTLS |
| **SDP** | Session Description | Describes codecs, ICE candidates, media capabilities |
| **RTP** | Media Framing | Timestamps, sequence numbers, payload type for A/V frames |
| **RTCP** | Feedback | Packet loss reports, jitter stats, bandwidth estimation |

### **B. Signaling — The Part WebRTC Doesn't Define**

WebRTC intentionally does NOT define a signaling protocol. You must build your own signaling server to exchange SDP offers/answers and ICE candidates. Common choices:

```
┌─────────┐    WebSocket / HTTP     ┌──────────────┐    WebSocket / HTTP     ┌─────────┐
│ Peer A  │ ──────────────────────▶ │   Signaling  │ ──────────────────────▶ │ Peer B  │
│ Browser │ ◀────────────────────── │    Server    │ ◀────────────────────── │ Browser │
└─────────┘    SDP + ICE Candidates └──────────────┘    SDP + ICE Candidates └─────────┘
                                          │
                                          │ (No media flows through here)
                                          │
                                    ┌─────┴──────┐
                                    │ Database   │ Room state, user registry
                                    └────────────┘
```

**Signaling flow (Offer/Answer model):**

```
Peer A                          Signaling Server                     Peer B
  │                                   │                                │
  │  1. createOffer()                 │                                │
  │  2. setLocalDescription(offer)    │                                │
  │  3. send offer ─────────────────▶ │                                │
  │                                   │  4. forward offer ───────────▶ │
  │                                   │                                │
  │                                   │                  5. setRemoteDescription(offer)
  │                                   │                  6. createAnswer()
  │                                   │                  7. setLocalDescription(answer)
  │                                   │  8. send answer ◀──────────── │
  │  9. receive answer ◀───────────── │                                │
  │  10. setRemoteDescription(answer) │                                │
  │                                   │                                │
  │  ─── ICE candidates trickle in both directions simultaneously ──  │
  │                                   │                                │
  │  11. ICE connectivity checks      │                                │
  │  12. DTLS handshake (peer-to-peer)│                                │
  │  13. SRTP media flows directly ◀─────────────────────────────────▶│
```

### **C. ICE (Interactive Connectivity Establishment) Deep Dive**

ICE is the most complex part of WebRTC. It handles NAT traversal by gathering candidates and testing connectivity:

**Candidate types (priority order):**

| Type | Source | Latency | Reliability | Cost |
|------|--------|---------|-------------|------|
| **host** | Local IP | Lowest | Works only on same LAN | Free |
| **srflx** (Server Reflexive) | STUN server | Low | Works through most NATs | Free (STUN is cheap) |
| **prflx** (Peer Reflexive) | Discovered during checks | Low | NAT mapping learned from peer | Free |
| **relay** | TURN server | Highest | Works through all firewalls | Expensive (bandwidth cost) |

**NAT types and their WebRTC impact:**

| NAT Type | Direct Connection? | STUN Works? | Notes |
|----------|-------------------|-------------|-------|
| Full Cone | Yes | Yes | Easiest — any external host can reach mapped port |
| Address-Restricted | Sometimes | Yes | Only IPs peer has sent to can reach back |
| Port-Restricted | Sometimes | Yes | IP + port must match — stricter |
| Symmetric | No | Partially | Different mapping per destination — TURN required |

**ICE candidate gathering states:**

```
┌──────────┐     gathering      ┌────────────┐     complete      ┌───────────┐
│   new    │ ──────────────────▶│  gathering │ ──────────────────▶│ complete  │
└──────────┘                    └────────────┘                    └───────────┘
                                      │
                         onicecandidate fires
                         for each candidate found
```

**Trickle ICE vs. Vanilla ICE:**
- **Vanilla ICE:** Wait for ALL candidates before sending SDP — slower startup
- **Trickle ICE:** Send candidates as they arrive — faster connection (~2-5× faster)
- Google Meet, Teams use Trickle ICE exclusively

### **D. Codec Negotiation & Media Pipeline**

```
Camera/Mic  ──▶  Encoding  ──▶  Packetization  ──▶  SRTP  ──▶  Network
                  (VP8/H.264)     (RTP packets)       (encrypted)
                  (Opus audio)
```

**Video codecs in WebRTC:**

| Codec | Mandatory? | Quality | CPU Cost | Hardware Accel | Browser Support |
|-------|-----------|---------|----------|----------------|-----------------|
| VP8 | Yes (was) | Good | Medium | Limited | All |
| VP9 | No | Better | High | Growing | Chrome, Firefox, Edge |
| H.264 | Yes | Good | Low (HW) | Excellent | All |
| AV1 | No | Best | Very High | Emerging | Chrome 90+, Firefox 98+ |

**Audio codecs:**

| Codec | Mandatory? | Bitrate | Quality | Use Case |
|-------|-----------|---------|---------|----------|
| Opus | Yes | 6-510 kbps | Excellent | Voice + music (adaptive) |
| G.711 | Yes | 64 kbps | Phone quality | Fallback, PSTN interop |
| AAC | No | 8-320 kbps | Good | Safari-only scenarios |

**Simulcast and SVC (Scalable Video Coding):**

```
┌──────────────────────────────────────────┐
│              Sender encodes:             │
│   High   (1280×720, 2 Mbps)            │
│   Medium (640×360, 500 kbps)            │
│   Low    (320×180, 150 kbps)            │
└─────────────────┬────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│         SFU selects per receiver:        │
│   Desktop user → High                   │
│   Tablet user  → Medium                 │
│   Mobile user  → Low                    │
│   Thumbnail    → Low                    │
└──────────────────────────────────────────┘
```

### **E. Topologies — P2P vs. SFU vs. MCU**

| Aspect | P2P (Mesh) | SFU | MCU |
|--------|-----------|-----|-----|
| **Architecture** | Each peer connects to every other | Peers send to server, server forwards | Server mixes all into one stream |
| **Upload streams** | N-1 per peer | 1 per peer | 1 per peer |
| **Download streams** | N-1 per peer | N-1 per peer (selective) | 1 per peer |
| **Max participants** | 4-6 | 50-1000+ | 50-100 |
| **Server CPU** | None | Low (forwarding only) | Very High (transcoding) |
| **Latency** | Lowest | Low | Higher (mixing delay) |
| **Quality control** | No server control | Per-receiver quality (simulcast) | Single quality for all |
| **Cost** | Free (no server) | Medium | High |
| **Examples** | Small 1:1 calls | Google Meet, Zoom, Teams | Legacy conferencing |
| **Bandwidth** | Scales O(N²) client-side | Scales O(N) client-side | O(1) client-side |
| **Fault tolerance** | No SPOF | SFU is SPOF | MCU is SPOF |

**Google Meet's SFU architecture:**

```
┌──────────┐         ┌─────────────────────────┐         ┌──────────┐
│  User A  │────────▶│                         │────────▶│  User B  │
│ (Chrome) │◀────────│      Google SFU          │◀────────│ (Chrome) │
└──────────┘         │   (Selective Forwarding) │         └──────────┘
                     │                         │
┌──────────┐         │  - Receives all streams  │         ┌──────────┐
│  User C  │────────▶│  - Forwards selectively  │────────▶│  User D  │
│ (Safari) │◀────────│  - Bandwidth estimation  │◀────────│ (Firefox)│
└──────────┘         │  - Simulcast layer pick  │         └──────────┘
                     │  - Dominant speaker det. │
                     └─────────────────────────┘
```

### **F. RTCDataChannel — Beyond Audio/Video**

RTCDataChannel provides a generic bidirectional data transport:

```typescript
// Creating a data channel
const pc = new RTCPeerConnection(config);
const dataChannel = pc.createDataChannel('game-state', {
  ordered: false,         // UDP-like: no ordering guarantee
  maxRetransmits: 0,      // Fire-and-forget for real-time games
});

// Or for reliable transfer:
const reliableChannel = pc.createDataChannel('file-transfer', {
  ordered: true,          // TCP-like: ordered delivery
  // maxRetransmits and maxPacketLifeTime omitted = fully reliable
});
```

**DataChannel vs. WebSocket:**

| Aspect | RTCDataChannel | WebSocket |
|--------|---------------|-----------|
| **Transport** | SCTP over DTLS over UDP | TCP (or TLS) |
| **Topology** | Peer-to-peer | Client-server |
| **Latency** | Lower (no server hop, UDP) | Higher (server relay, TCP) |
| **Reliability** | Configurable (reliable or unreliable) | Always reliable (TCP) |
| **Ordering** | Configurable | Always ordered |
| **Encryption** | Mandatory (DTLS) | Optional (wss://) |
| **NAT traversal** | ICE/STUN/TURN required | Not needed (server has public IP) |
| **Binary support** | ArrayBuffer, Blob | ArrayBuffer, Blob, text |
| **Max message size** | 256 KiB (Chrome) | Unlimited (framing) |
| **Use case** | Gaming, P2P file transfer | Chat, notifications, live feeds |

### **G. Security Model**

WebRTC has mandatory security — you cannot disable encryption:

1. **DTLS handshake** between peers — key exchange happens peer-to-peer
2. **SRTP** encrypts all media packets — even TURN relay cannot decrypt
3. **Fingerprint verification** — SDP contains DTLS certificate fingerprints
4. **Permission prompts** — `getUserMedia()` requires user consent, browser shows recording indicator
5. **Same-origin policy** — `RTCPeerConnection` respects CORS for TURN credentials

**Attack vectors and mitigations:**

| Attack | Vector | Mitigation |
|--------|--------|------------|
| Eavesdropping | Man-in-the-middle on signaling | Verify DTLS fingerprints, use secure signaling (WSS) |
| IP leakage | ICE candidates expose local/public IP | `iceTransportPolicy: 'relay'` forces TURN only |
| Oeniaal | Flood STUN/TURN | Rate limiting, authentication on TURN |
| OWASP injections | Malicious SDP manipulation | Validate/sanitize SDP before `setRemoteDescription()` |
| Camera/mic hijack | Consent bypass | Browser-enforced permission prompt, tab indicator |

### **H. Anti-Patterns & Pitfalls**

1. **Not implementing Trickle ICE** — Waiting for all candidates adds 5-15 seconds to connection time
2. **Skipping TURN servers** — 10-15% of users are behind symmetric NATs; without TURN, they simply can't connect
3. **Ignoring `iceConnectionState` monitoring** — Connection can degrade silently; you must handle `disconnected`, `failed`, and `closed` states
4. **Hardcoding codec preferences** — Let the browser negotiate; use `RTCRtpTransceiver.setCodecPreferences()` only when you need specific behavior
5. **Not implementing bandwidth adaptation** — On poor networks, must reduce resolution/bitrate; use `RTCRtpSender.setParameters()` for dynamic adjustment
6. **Single TURN server** — Production needs geo-distributed TURN (Twilio, Cloudflare) for latency
7. **Ignoring `getStats()` API** — Without monitoring RTCStatsReport, you can't diagnose quality issues
8. **Not handling renegotiation** — Adding/removing tracks requires re-offer; use `negotiationneeded` event
9. **Memory leaks** — Not calling `pc.close()` and `stream.getTracks().forEach(t => t.stop())` on cleanup

────────────────────────────────────
## 3. Real-World Examples
────────────────────────────────────

### Google Meet
- SFU architecture with simulcast (3 layers)
- Bandwidth estimation: REMB → Transport-CC → GCC (Google Congestion Control)
- Adaptive quality: downgrades inactive speakers to low resolution
- Uses **Jingle** (XMPP-based) for signaling over HTTPS
- AV1 codec for screen sharing (2023+)
- Participant limit: 500 (view-only), 25 active video

### Microsoft Teams
- SFU with TURN relay via Azure Communication Services
- Proprietary codecs for Teams Rooms
- Deep integration with Edge's WebRTC implementation
- Together Mode: composites video feeds server-side (MCU hybrid)

### Hruday's Experience Mapping
- **Bosch WebSocket Dashboard:** The real-time telemetry system at Bosch used WebSockets for sensor data. For live video feeds from factory cameras, WebRTC DataChannels would reduce latency vs. HLS/DASH streaming — a direct upgrade path Hruday could propose
- **SAP:** Fiori apps with screen sharing for support scenarios — WebRTC enables in-browser agent-customer screen share without plugins

### Scale Evolution

| Scale | Architecture | Key Changes |
|-------|-------------|-------------|
| 1K users | P2P mesh for 1:1 calls | Simple signaling server, STUN only |
| 100K users | SFU cluster + TURN relay | Load balancing, geo-distributed TURN, simulcast |
| 10M users | Multi-region SFU mesh | Inter-SFU cascading, edge PoPs, dynamic codec selection |
| 100M+ users | Google Meet architecture | GCC bandwidth estimation, AV1, AI noise suppression, hardware-accelerated encoding |

────────────────────────────────────
## 4. Interview-Oriented Answer
────────────────────────────────────

**Sample Answer (7+ years level):**

> "WebRTC is a browser-native API suite for peer-to-peer audio, video, and data transfer. The key insight is that media flows directly between browsers — the server is only needed for signaling, which exchanges SDP offers/answers and ICE candidates.
>
> The connection lifecycle is: getUserMedia to capture media, then createOffer/createAnswer to negotiate codecs and ICE parameters, then ICE connectivity checks find the best path using STUN for NAT traversal with TURN as a relay fallback for symmetric NATs. Once connected, DTLS provides mandatory encryption, and SRTP carries the encrypted media.
>
> At scale, you move from P2P mesh (good for 2-4 participants) to an SFU topology where the server forwards streams selectively. With simulcast, the sender encodes multiple quality layers and the SFU picks the right one per receiver based on bandwidth estimation. Google Meet uses this with Transport-CC for congestion control.
>
> At Bosch, I built a real-time dashboard using WebSockets. For the factory camera feeds, WebRTC DataChannels would have given us lower latency with configurable reliability — that's something I'd recommend as an evolution of that architecture."

**Likely Follow-up Questions:**

1. **"How does ICE actually work?"** → Explain candidate gathering (host/srflx/relay), connectivity checks as a matrix of candidate pairs, and nomination
2. **"P2P vs SFU vs MCU — when to use each?"** → P2P for ≤4 users, SFU for 5-500, MCU for legacy/constrained clients; SFU is the standard for modern apps
3. **"How do you handle packet loss in video calls?"** → NACK (retransmission request), FEC (Forward Error Correction), PLI (Picture Loss Indication for keyframes), jitter buffer tuning
4. **"What happens when a user's bandwidth drops?"** → Bandwidth estimation triggers simulcast layer switch, sender reduces bitrate via `setParameters()`, UI shows quality indicator
5. **"How would you debug a connection failure?"** → Check ICE state machine, inspect `getStats()` for candidate pairs, verify TURN credentials, look at DTLS handshake, check firewall rules
6. **"How do you prevent IP leakage?"** → `iceTransportPolicy: 'relay'` forces all traffic through TURN, or use mDNS candidates (Chrome default for private IPs)

**Comparison With Alternatives:**

| Aspect | WebRTC | WebSocket | HTTP/2 SSE | HLS/DASH |
|--------|--------|-----------|------------|----------|
| Latency | <100ms (P2P) | 50-200ms (server) | 100-500ms | 3-30 seconds |
| Direction | Bidirectional P2P | Bidirectional (server relay) | Server→Client | Server→Client |
| Media support | Audio/Video/Data | Data only | Data only | Audio/Video |
| Encryption | Mandatory | Optional | Optional | Optional |
| NAT traversal | ICE/STUN/TURN | Not needed | Not needed | Not needed |
| Scalability | Limited (P2P) or SFU | Server-limited | Server-limited | CDN-scaled |
| Use case | Video calls, P2P | Chat, notifications | Live feeds | VOD, live streaming |

**How to Explain Trade-offs Verbally:**

> "When the interviewer asks why not just use WebSockets for video — the answer is latency and topology. WebSockets require all media to bounce through a server, adding a full RTT. WebRTC's peer-to-peer path eliminates that hop. But WebRTC's complexity — ICE negotiation, STUN/TURN, codec negotiation — means you use it when latency matters (video calls, gaming) and WebSockets when simplicity matters (chat, notifications)."

────────────────────────────────────
## 5. Code Example (TypeScript)
────────────────────────────────────

### Complete WebRTC Connection Setup

```typescript
// ─── Types ───────────────────────────────────────
interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate' | 'bye';
  from: string;
  to: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
}

interface WebRTCConfig {
  iceServers: RTCIceServer[];
  signalingUrl: string;
  roomId: string;
  userId: string;
}

// ─── WebRTC Manager ──────────────────────────────
class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private ws: WebSocket;
  private config: WebRTCConfig;
  private statsInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: WebRTCConfig) {
    this.config = config;
    this.ws = new WebSocket(config.signalingUrl);
    this.ws.onmessage = (event) => this.handleSignalingMessage(JSON.parse(event.data));
  }

  // ─── 1. Capture Local Media ─────────────────────
  async startLocalStream(constraints: MediaStreamConstraints = {
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  }): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.localStream;
  }

  // ─── 2. Create Peer Connection ──────────────────
  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: this.config.iceServers,
      iceCandidatePoolSize: 10,  // Pre-allocate candidates for faster startup
    });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE candidate trickle
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignaling({
          type: 'candidate',
          from: this.config.userId,
          to: 'peer',  // In production: actual peer ID
          payload: event.candidate.toJSON(),
        });
      }
    };

    // Connection state monitoring
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE state: ${pc.iceConnectionState}`);
      switch (pc.iceConnectionState) {
        case 'connected':
          this.startStatsMonitoring();
          break;
        case 'disconnected':
          this.handleDisconnection();
          break;
        case 'failed':
          this.handleConnectionFailure();
          break;
        case 'closed':
          this.cleanup();
          break;
      }
    };

    // Remote stream handling
    pc.ontrack = (event) => {
      const remoteVideo = document.getElementById('remote-video') as HTMLVideoElement;
      if (remoteVideo) {
        remoteVideo.srcObject = event.streams[0];
      }
    };

    // Renegotiation needed (track added/removed)
    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.sendSignaling({
          type: 'offer',
          from: this.config.userId,
          to: 'peer',
          payload: pc.localDescription!,
        });
      } catch (err) {
        console.error('Renegotiation failed:', err);
      }
    };

    this.pc = pc;
    return pc;
  }

  // ─── 3. Offer/Answer Flow ──────────────────────
  async createOffer(): Promise<void> {
    const pc = this.createPeerConnection();
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);
    this.sendSignaling({
      type: 'offer',
      from: this.config.userId,
      to: 'peer',
      payload: offer,
    });
  }

  private async handleSignalingMessage(msg: SignalingMessage): Promise<void> {
    switch (msg.type) {
      case 'offer':
        await this.handleOffer(msg.payload as RTCSessionDescriptionInit);
        break;
      case 'answer':
        await this.handleAnswer(msg.payload as RTCSessionDescriptionInit);
        break;
      case 'candidate':
        await this.handleCandidate(msg.payload as RTCIceCandidateInit);
        break;
      case 'bye':
        this.cleanup();
        break;
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.sendSignaling({
      type: 'answer',
      from: this.config.userId,
      to: 'peer',
      payload: answer,
    });
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  private async handleCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return;
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  // ─── 4. Quality Monitoring ─────────────────────
  private startStatsMonitoring(): void {
    this.statsInterval = setInterval(async () => {
      if (!this.pc) return;
      const stats = await this.pc.getStats();
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          console.log(`Video: ${report.framesPerSecond} fps, ` +
            `${report.bytesReceived} bytes, ` +
            `${report.packetsLost} lost`);
        }
      });
    }, 3000);
  }

  // ─── 5. Bandwidth Adaptation ───────────────────
  async setBandwidthConstraint(maxBitrateKbps: number): Promise<void> {
    if (!this.pc) return;
    const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
    if (!sender) return;

    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    params.encodings[0].maxBitrate = maxBitrateKbps * 1000;
    await sender.setParameters(params);
  }

  // ─── 6. Simulcast Setup ────────────────────────
  async enableSimulcast(): Promise<void> {
    if (!this.pc || !this.localStream) return;
    const videoTrack = this.localStream.getVideoTracks()[0];
    const sender = this.pc.getSenders().find(s => s.track === videoTrack);
    if (!sender) return;

    const params = sender.getParameters();
    params.encodings = [
      { rid: 'low', maxBitrate: 150_000, scaleResolutionDownBy: 4 },
      { rid: 'mid', maxBitrate: 500_000, scaleResolutionDownBy: 2 },
      { rid: 'high', maxBitrate: 2_000_000 },
    ];
    await sender.setParameters(params);
  }

  // ─── 7. Data Channel ──────────────────────────
  createDataChannel(label: string, options?: RTCDataChannelInit): RTCDataChannel {
    if (!this.pc) throw new Error('PeerConnection not initialized');
    return this.pc.createDataChannel(label, options);
  }

  // ─── 8. Cleanup ────────────────────────────────
  cleanup(): void {
    if (this.statsInterval) clearInterval(this.statsInterval);
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.ws.close();
  }

  private handleDisconnection(): void {
    // ICE restart attempt
    if (this.pc) {
      this.pc.restartIce();
    }
  }

  private handleConnectionFailure(): void {
    console.error('WebRTC connection failed — attempting ICE restart');
    this.handleDisconnection();
    // After timeout, escalate to full reconnection
    setTimeout(() => {
      if (this.pc?.iceConnectionState === 'failed') {
        this.cleanup();
        this.createOffer(); // Full reconnection
      }
    }, 5000);
  }

  private sendSignaling(msg: SignalingMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}

// ─── Usage ───────────────────────────────────────
const rtc = new WebRTCManager({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:turn.example.com:443?transport=tcp',
      username: 'user',
      credential: 'pass',
    },
  ],
  signalingUrl: 'wss://signal.example.com',
  roomId: 'room-123',
  userId: 'hruday',
});

async function startCall(): Promise<void> {
  const localStream = await rtc.startLocalStream();
  const localVideo = document.getElementById('local-video') as HTMLVideoElement;
  localVideo.srcObject = localStream;
  await rtc.createOffer();
  await rtc.enableSimulcast();
}
```

────────────────────────────────────
## 6. Memory Aid (Quick Recall)
────────────────────────────────────

**The WebRTC pipeline in 7 words:** "Signal → Offer → ICE → DTLS → Media flows."

**Decision framework:**
- ≤4 participants → P2P mesh
- 5–500 participants → SFU (Google Meet model)
- Legacy/constrained → MCU
- Just data, no media → Consider DataChannel vs. WebSocket (P2P = lower latency, server = simpler)

**The one sentence if you go blank:** "WebRTC enables peer-to-peer audio, video, and data transfer between browsers using ICE for NAT traversal, DTLS for mandatory encryption, and SDP for capability negotiation — the server only handles signaling, not media."

────────────────────────────────────
## 7. Why & How Summary
────────────────────────────────────

**Why it matters:**
→ WebRTC powers every major video conferencing platform (Google Meet, Teams, Zoom web). Understanding it shows you can build real-time, latency-sensitive systems — a core Staff-level skill.

**How it works:**
→ Browsers exchange SDP offers/answers through your signaling server to negotiate codecs and ICE parameters. ICE uses STUN/TURN to traverse NATs and find the optimal peer-to-peer path. Once connected, DTLS encrypts the channel and SRTP carries audio/video directly between browsers.

**Company relevance:**
→ **Google:** Built WebRTC (originally acquired GIPS). Google Meet is the flagship WebRTC product. L5+ interviews test ICE, SFU design, bandwidth estimation, and codec selection.
→ **Microsoft:** Teams uses WebRTC for browser clients. Azure Communication Services provides WebRTC infrastructure.
→ **SAP (Hruday's current):** Fiori support tools can use WebRTC for in-browser screen sharing and co-browsing without plugins.
