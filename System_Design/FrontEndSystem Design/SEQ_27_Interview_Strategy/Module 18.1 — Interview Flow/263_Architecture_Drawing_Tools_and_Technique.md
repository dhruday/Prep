# 263 – Architecture Drawing — Tools & Technique

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Architecture diagrams in interviews communicate your design visually. You need to draw **quickly** and **clearly** — not beautifully. Use **boxes for components**, **arrows for data flow**, **labels for protocols/technologies**, and **color/grouping for layers**. In virtual interviews, tools like Excalidraw, draw.io, or even just a shared whiteboard work well. The key skill is translating requirements into a visual component hierarchy with clear data flow in under 5 minutes.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture Diagram Elements

```
┌─────────────────────────────────────────────────────────┐
│ CLIENT (Browser)                                         │
│                                                          │
│ ┌──────────┐  ┌──────────┐  ┌───────────────────────┐  │
│ │ App Shell │──│ Router   │──│ Feature Module        │  │
│ └──────────┘  └──────────┘  │ ┌─────┐ ┌──────────┐ │  │
│                              │ │View │ │ State    │ │  │
│                              │ │     │ │ (Redux)  │ │  │
│                              │ └─────┘ └──────────┘ │  │
│                              └───────────────────────┘  │
│                                        │                 │
│                              ┌─────────▼──────────┐     │
│                              │ API Layer (fetch)   │     │
│                              └─────────┬──────────┘     │
└────────────────────────────────────────┼────────────────┘
                                         │ HTTPS / WebSocket
                              ┌──────────▼─────────┐
                              │ API Gateway / BFF   │
                              └──────────┬─────────┘
                                         │
                     ┌───────────────────┼──────────────────┐
                     │                   │                   │
              ┌──────▼─────┐    ┌───────▼──────┐   ┌──────▼──────┐
              │ Auth Service│    │ Data Service │   │ CDN / Assets│
              └────────────┘    └──────────────┘   └─────────────┘
```

### Drawing Technique (5+1 Rule)

1. **Start top-down**: User → Browser → Components → APIs → Backend
2. **Draw the boundaries**: Client vs Server vs Third-party
3. **Show data flow**: Arrows with labels (REST, WebSocket, SSE)
4. **Highlight state**: Where does state live? Circle it
5. **Mark critical paths**: Bold the performance-critical flow
6. **+1: Add numbers**: Number the flows (1→2→3) so you can reference them

### Virtual Interview Tools

| Tool | Best For | Tip |
|------|----------|-----|
| **Excalidraw** | Quick sketches | Hand-drawn aesthetic, fast |
| **draw.io** | Detailed diagrams | More shapes, export options |
| **Miro** | Collaborative | If interviewer wants to co-draw |
| **Text/ASCII** | Fallback | Works in any shared editor |

### Common Mistakes

- ❌ Spending too long on the diagram (>5 min)
- ❌ Drawing everything at once — start high-level, zoom in when asked
- ❌ No labels on arrows — "what flows through this connection?"
- ❌ Mixing abstraction levels — don't put React components and database schemas in the same diagram

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, architecture reviews required clear diagrams showing: UI layer (Fiori), middleware (Node BFF), OData services, and HANA DB — with arrows labeled by protocol. This production practice maps directly to interview diagram skills.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I draw architecture diagrams top-down: starting with the user, then browser boundary, component tree with state management, API layer, then backend services. I label every arrow with the protocol or data type. I use the 5+1 rule: boundaries, data flow, state location, critical paths, and numbered flows. I keep it under 5 minutes for the initial diagram and zoom into specific areas when the interviewer asks."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```
// ASCII architecture for "Design a Chat Application"
// (This is what you'd draw in the interview)

┌─ BROWSER ─────────────────────────────────────────────┐
│                                                        │
│  ①  ┌─────────────┐    ②  ┌──────────────────┐       │
│     │ Channel List │ ──▶  │ Message Panel     │       │
│     │ (sidebar)    │      │ ┌──────────────┐  │       │
│     └─────────────┘      │ │ MessageList   │  │       │
│                           │ │   (virtualized)│  │       │
│  ③  ┌─────────────┐      │ └──────────────┘  │       │
│     │ Presence     │      │ ┌──────────────┐  │       │
│     │ Indicators   │      │ │ MessageInput │  │       │
│     └─────────────┘      │ └──────────────┘  │       │
│                           └──────────────────┘       │
│                                    │                   │
│  ④  ┌──────────────────────────────▼────────────┐     │
│     │ WebSocket Manager (reconnect, heartbeat)   │     │
│     └──────────────────────────────┬────────────┘     │
└────────────────────────────────────┼──────────────────┘
                                     │ ws://
                          ┌──────────▼──────────┐
                     ⑤    │ WebSocket Gateway    │
                          └──────────┬──────────┘
                                     │
                 ┌───────────────────┼───────────────┐
            ⑥   │              ⑦   │          ⑧   │
         ┌──────▼──┐      ┌───────▼──┐    ┌──────▼──┐
         │ Auth    │      │ Message  │    │ Presence │
         │ Service │      │ Service  │    │ Service  │
         └─────────┘      └──────────┘    └──────────┘
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Draw top-down: User → Browser → Components → API → Backend. Label arrows. Number flows. Under 5 minutes."** Use Excalidraw for virtual interviews. Start high-level, zoom in on request. Always show: boundaries (client/server), data flow direction, state location, and critical path.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Visual communication is expected in system design rounds. Clear diagrams show structured thinking.
**How:** Top-down drawing, labeled arrows, numbered flows, boundary separation. 5+1 rule. Under 5 minutes.
**Companies:** All four require diagram skills. Microsoft and Adobe use virtual whiteboards extensively.
