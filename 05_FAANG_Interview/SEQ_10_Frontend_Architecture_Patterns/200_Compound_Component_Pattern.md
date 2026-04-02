# 200. Compound Component Pattern (applied)
**Phase:** Performance & Architecture | **Sequence:** 10 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds.

"The Compound Component Pattern is a way to build flexible, composable UI components that share state implicitly through React Context — like HTML's own `<select>` and `<option>` pair. I used this pattern at SAP when building a reusable Accordion and Tab component. Instead of a single giant component that accepts a complex config object, you expose sub-components (`Tabs.Tab`, `Tabs.Panel`) that work together naturally. This gives consumers full control over layout and order without leaking implementation details."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists
The Compound Component Pattern allows a parent component to share internal state with its child components without the consumer needing to wire them manually.

**The problem it solves:**
A `<Tabs>` component that accepts all config via props becomes hard to customize:
```tsx
// ❌ Rigid config-driven API — hard to customize layout
<Tabs tabs={[
  { label: 'Profile', content: <ProfilePanel /> },
  { label: 'Settings', content: <SettingsPanel /> }
]} />
```

**The solution — compound components:**
```tsx
// ✅ Composable API — consumer controls layout and order
<Tabs>
  <Tabs.Tab id="profile">Profile</Tabs.Tab>
  <Tabs.Tab id="settings">Settings</Tabs.Tab>
  <Tabs.Panel id="profile"><ProfilePanel /></Tabs.Panel>
  <Tabs.Panel id="settings"><SettingsPanel /></Tabs.Panel>
</Tabs>
```

This mirrors how HTML itself works: `<select>` manages state, `<option>` sub-components register themselves.

### How It Works Internally

**Three key pieces:**
1. **Parent component** holds the shared state (which tab is active)
2. **React Context** passes that state + setters to all child components without prop drilling
3. **Child sub-components** consume the context to read/update shared state

```
<Tabs> (holds activeTab state)
  ↓ provides via Context
  ├── <Tabs.Tab id="profile"> → reads context, marks active if id matches
  ├── <Tabs.Tab id="settings"> → reads context, marks active if id matches
  ├── <Tabs.Panel id="profile"> → reads context, shows only if id matches
  └── <Tabs.Panel id="settings"> → reads context, shows only if id matches
```

### Architecture & Component Boundaries

```
Pattern Structure:
  
TabsContext (React Context)
  ├── activeTab: string
  └── setActiveTab: (id: string) => void

Tabs (parent — creates and provides context)
  ├── Tabs.Tab (sub-component — consumes context to manage active state)
  └── Tabs.Panel (sub-component — consumes context to control visibility)
```

All sub-components are attached to the parent as static properties: `Tabs.Tab = TabsTab`. This gives consumers a clear namespaced API.

### Data Flow & State Flow
```
1. <Tabs> renders, creates Context with {activeTab, setActiveTab}
2. <Tabs.Tab> renders inside the context, reads activeTab
   → if its id matches, adds 'active' class
   → onClick calls setActiveTab(id)
3. Context value changes
4. All <Tabs.Tab> and <Tabs.Panel> in the context re-render
5. Active tab shows, inactive panels hide
```

State lives in the parent. Children are kept dumb — they only react to context.

### Performance Implications
- Context value changes on every tab switch — all consumers re-render
- **Optimization:** Split context into `ActiveTabContext` (changes) and `RegisterTabsContext` (stable api) to reduce unnecessary re-renders
- `React.memo` on sub-components helps prevent re-renders in sibling panels that are already hidden

### Scalability Considerations
- Compound components stay manageable at any scale because the API is explicit and composable
- For extremely complex compound components (e.g., a full data grid), split state management into `useReducer` inside the parent
- Can be built with Angular using a shared service or `@ContentChildren` + template references

### Trade-offs
| Compound Component | Config-Driven (props) | When to Choose Compound |
|---|---|---|
| Flexible layout — consumer controls order | Fixed structure | When consumers need layout control |
| Sub-component API is self-documenting | Config objects can be opaque | When used across many teams |
| Requires React Context | No context needed | When implicit state sharing is required |
| Slightly more setup to build | Simpler to build | When building a shared design system component |

### ⚠️ Anti-Patterns & Pitfalls
- **Rendering sub-components outside parent:** A `<Tabs.Tab>` rendered outside a `<Tabs>` will have no context — add a check and throw a helpful error: `if (!context) throw new Error('<Tabs.Tab> must be inside <Tabs>')`
- **Too many responsibilities in the parent:** The parent should only manage state and provide context — not handle API calls or complex logic
- **Over-using the pattern:** A simple `<Alert>` with title and description doesn't need compound components — use it only when consumer layout control is genuinely needed

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, I built a reusable `<FilterPanel>` using the compound component pattern. The parent managed filter state. Child sub-components (`FilterPanel.DateRange`, `FilterPanel.MultiSelect`, `FilterPanel.Reset`) could be arranged in any order by each product team. Three different product modules used the same `<FilterPanel>` but with entirely different sub-component combinations. Zero prop-drilling, zero duplication.

**At FAANG scale:**
- **Reach UI / Radix UI** (used at Adobe, Microsoft): All components (Accordions, Tabs, Dialogs) use compound component pattern for maximum consumer flexibility
- **Headless UI (Tailwind Labs):** Used at Adobe — explicitly designed as compound components with zero styling, letting consumer add their own UI
- **React Aria (Adobe):** Adobe's own accessibility-first component library uses this pattern heavily
- **Microsoft Fluent UI:** Tabs, Accordion, CommandBar all built as compound components

**How it evolves with scale:**
- 1 team: Direct compound component with React Context
- Multi-team design system: Published as npm package with full TypeScript types for each sub-component
- FAANG scale: Combine with headless pattern — compound component manages state and accessibility, consumer provides all styling

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "The Compound Component Pattern builds flexible, composable UI where sub-components share state without explicit prop passing. The classic example is a Tabs component — the parent holds which tab is active in state, shares it via React Context, and the Tab and Panel sub-components read from that context to know what to render. The consumer gets full control over layout and order without needing to manage the state themselves. I used this at SAP for a shared Filter Panel that different product teams used in completely different arrangements. The key technical decision is whether to share context via a single context value or split it to minimize re-renders."

### Likely Follow-up Questions
1. "How does it differ from just passing props?" → Implicit state sharing — sub-components don't need the parent to pass every prop through them manually
2. "How do you prevent misuse — Tab outside Tabs?" → Check context for `undefined` in sub-component and throw a descriptive error
3. "How does this work in Angular?" → Use `@ContentChildren` to query projected sub-components, or use a shared service injected at component level
4. "When would you NOT use this?" → When the component structure is always the same — use config props; compound components add complexity only worth it when layout flexibility is needed

### vs Alternatives
| Compound Component | Config Object Prop | Render Props |
|---|---|---|
| Composable layout | Fixed layout | Flexible rendering, more boilerplate |
| Implicit state sharing | Explicit state control | State exposed via render function |
| Self-documenting API | Config must be documented | Requires understanding of render props |
| Best for shared design systems | Best for quick implementation | Best when rendering logic varies per consumer |

### How to Signal Senior Thinking
> "The pattern is fundamentally about API design. Config-driven APIs are easier to build but harder for consumers to customize. Compound component APIs are harder to build but give consumers full control. At design system scale, consumer flexibility is worth the extra complexity."

---

## 💻 5. Code Example

```typescript
// Compound Component Pattern — Tabs implementation
// TypeScript + React — complete and interview-ready

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Must be used inside <Tabs>');
  return ctx;
}

// ─── Parent ─────────────────────────────────────────────────
interface TabsProps {
  defaultTab: string;
  children: React.ReactNode;
}

function Tabs({ defaultTab, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// ─── Sub-components ─────────────────────────────────────────
interface TabProps { id: string; children: React.ReactNode; }

function Tab({ id, children }: TabProps) {
  const { activeTab, setActiveTab } = useTabs();
  return (
    <button
      role="tab"
      aria-selected={activeTab === id}
      className={activeTab === id ? 'tab tab--active' : 'tab'}
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  );
}

interface PanelProps { id: string; children: React.ReactNode; }

function Panel({ id, children }: PanelProps) {
  const { activeTab } = useTabs();
  if (activeTab !== id) return null;
  return <div role="tabpanel" className="tab-panel">{children}</div>;
}

// Attach sub-components as static properties
Tabs.Tab = Tab;
Tabs.Panel = Panel;

// ─── Consumer usage ─────────────────────────────────────────
function ProfilePage() {
  return (
    <Tabs defaultTab="profile">
      <div className="tab-list" role="tablist">
        <Tabs.Tab id="profile">Profile</Tabs.Tab>
        <Tabs.Tab id="settings">Settings</Tabs.Tab>
      </div>
      <Tabs.Panel id="profile"><ProfileForm /></Tabs.Panel>
      <Tabs.Panel id="settings"><SettingsForm /></Tabs.Panel>
    </Tabs>
  );
}
```

**Interview vs Production difference:**
In an interview, the above is complete and impressive. In production, add keyboard navigation (arrow keys between tabs), ARIA attributes for full accessibility, and animation support via CSS transitions on the Panel.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** "HTML's `<select>` + `<option>` — the parent owns state, children register themselves"
**If you go blank:** "Compound components use React Context to share state between a parent and its designated children without prop drilling."
**Mnemonic:** **PSC** — **P**arent holds state, **S**hares via Context, **C**hildren consume

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Components are flexible — consumers can arrange sub-components in any order to fit their layout
→ Performance: State is centralized in parent — sub-components only re-render on context change
→ Business: Design system components with compound APIs are more adoptable across diverse team needs

**How it works (3 sentences):**
The parent component holds shared state and provides it via React Context. Sub-components (attached as static properties like `Tabs.Tab`) consume the context to read and update that shared state. The consumer composes these sub-components in any order, giving full layout control without managing the internal state themselves.

**Company relevance:**
- Microsoft: Fluent UI Tab and Accordion are built this way — expects engineers to recognize and implement the pattern
- Adobe: React Aria and Headless UI are compound-component-based — central to Adobe's design system contribution work
- Salesforce: LWC uses slot-based composition which follows the same concept (parent provides shared context)
- Cisco: Momentum Design System tabs and accordions — compound component knowledge expected for design system contribution

---
**✅ Topic 200/486 complete → continuing to Topic 201: SPA Architecture**
