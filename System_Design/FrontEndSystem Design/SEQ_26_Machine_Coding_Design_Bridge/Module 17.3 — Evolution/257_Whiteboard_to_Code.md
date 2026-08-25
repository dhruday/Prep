# 257 – Whiteboard to Code

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Whiteboard-to-Code is the skill of translating a high-level system design (boxes, arrows, data flows) into working code within the time constraints of a machine coding round. The key is having a **systematic translation process**: (1) identify components from diagram boxes, (2) define data models from the arrows, (3) build the component tree top-down, (4) implement state management, (5) add interactions. Senior engineers don't jump into coding — they spend 5-10 minutes structuring before touching the editor.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### The Translation Framework (5-Step Process)

**Step 1: Identify Components (2 min)**
```
Diagram boxes → React components
┌─────────────────────────────────┐
│ App                             │
│ ┌──────────┐ ┌───────────────┐ │
│ │ Sidebar   │ │ Main Panel    │ │
│ │           │ │ ┌───────────┐ │ │
│ │ NavItem   │ │ │ Header    │ │ │
│ │ NavItem   │ │ │ Content   │ │ │
│ │ NavItem   │ │ │ Footer    │ │ │
│ └──────────┘ │ └───────────┘ │ │
│              └───────────────┘ │
└─────────────────────────────────┘

Components: App, Sidebar, NavItem, MainPanel, Header, Content, Footer
```

**Step 2: Define Data Models (2 min)**
```typescript
// Arrows between boxes = data contracts
interface NavItem { id: string; label: string; icon: string; route: string; }
interface User { id: string; name: string; role: 'admin' | 'user'; }
interface ContentData { title: string; body: string; lastUpdated: Date; }
```

**Step 3: Build Component Tree Top-Down (1 min)**
```typescript
// Start with the outermost shell, fill in details
function App() {
  return (
    <div className="app-layout">
      <Sidebar items={navItems} activeItem={activeRoute} onNavigate={setActiveRoute} />
      <MainPanel>
        <Header user={currentUser} />
        <Content data={contentForRoute} />
        <Footer />
      </MainPanel>
    </div>
  );
}
```

**Step 4: State Management (2 min)**
```typescript
// Identify: What changes? Where does it live?
// - activeRoute → App (shared between Sidebar and Content)
// - currentUser → App (passed down to Header)
// - contentData → Content (local, fetched per route)
```

**Step 5: Implement Interactions (remaining time)**
```typescript
// Wire up events based on diagram arrows
// Sidebar NavItem click → updates activeRoute → Content re-fetches
```

### Time Allocation (45-min round)

| Phase | Time | Activity |
|-------|------|----------|
| Clarify | 3 min | Ask requirements, edge cases |
| Plan | 5 min | Component tree, data models, state plan |
| Scaffold | 5 min | All components as empty shells |
| Core logic | 20 min | State, handlers, main feature |
| Polish | 10 min | Edge cases, accessibility, styling |
| Buffer | 2 min | Test, explain trade-offs |

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, our sprint planning involved whiteboard sessions for new Fiori components. I'd translate the UX wireframes into component hierarchies, define OData entity interfaces, and scaffold the Angular/UI5 component tree before implementing any logic. This is exactly the whiteboard-to-code process.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I follow a 5-step translation process: First, I identify components from the diagram boxes. Second, I define TypeScript interfaces from the data flows (arrows). Third, I build the component tree top-down as empty shells. Fourth, I plan state — what changes, where it lives. Fifth, I implement interactions. I spend 5-8 minutes planning before coding. This approach gives me a clear roadmap and prevents wasted time from architectural mistakes mid-coding."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Example: Whiteboard shows "Chat App" with Sidebar + MessageList + MessageInput

// Step 1: Data models from diagram arrows
interface Channel { id: string; name: string; unreadCount: number; }
interface Message { id: string; channelId: string; author: string; text: string; timestamp: Date; }

// Step 2: Component tree from diagram boxes
function ChatApp() {
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = (text: string) => {
    if (!activeChannel) return;
    const msg: Message = { id: crypto.randomUUID(), channelId: activeChannel, author: 'Hruday', text, timestamp: new Date() };
    setMessages(prev => [...prev, msg]);
  };

  const channelMessages = useMemo(() => messages.filter(m => m.channelId === activeChannel), [messages, activeChannel]);

  return (
    <div className="chat-layout">
      <ChannelSidebar channels={channels} active={activeChannel} onSelect={setActiveChannel} />
      <div className="chat-main">
        <MessageList messages={channelMessages} />
        <MessageInput onSend={handleSend} disabled={!activeChannel} />
      </div>
    </div>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Whiteboard → Code = 5 Steps: Components, Models, Tree, State, Interactions."** Diagram boxes become components, arrows become data contracts (interfaces), the nesting becomes the component tree, shared data becomes lifted state, and arrow directions become event handlers. Spend 5-8 min planning. Never code without a component tree.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Machine coding rounds often start with a design diagram. Translating it efficiently shows systematic thinking.
**How:** 5-step process — identify components, define data models, build tree top-down, plan state ownership, implement interactions.
**Companies:** All four use this format. Microsoft and Adobe particularly test whiteboard-to-code translation.
