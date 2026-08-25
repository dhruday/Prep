# 37. Compound Component Pattern ★

## 1. High-Level Explanation (Frontend Interview Level)

The **Compound Component Pattern** is a React (and framework-agnostic) component design pattern where a **parent component** manages shared state and **child sub-components** access that state implicitly through React Context or through direct cloneElement, without requiring explicit prop-threading between them. Classic examples include `<Select>/<Option>`, `<Tabs>/<Tab>/<TabPanel>`, and `<Accordion>/<AccordionItem>/<AccordionPanel>`. Unlike a monolithic component that accepts a config object or renders-props list, compound components expose a **declarative composition API** — the consumer controls the structure and ordering of sub-components, while the parent handles shared state. At senior level, the pattern is evaluated for the trade-off between **consumer flexibility** (high — you can reorder, skip, or conditionally render sub-components) versus **developer experience** (more verbose API than a single `<Tabs tabs={[...]} />` prop).

**Key Principle:** Compound components give the consumer structural control while the library handles state. Use them when rendering flexibility matters more than API simplicity.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Pattern Variations — Three Implementation Approaches

#### Approach 1: Context-Based Compound Components (preferred at scale)

```typescript
// Parent creates context, provides shared state
const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tab sub-components must be used inside <Tabs>');
  return ctx;
}

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  orientation: 'horizontal' | 'vertical';
}

// Parent: manages state, provides context
function Tabs({
  defaultTab,
  orientation = 'horizontal',
  children,
  onChange,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id);
    onChange?.(id);
  }, [onChange]);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange, orientation }}>
      <div role="tablist" aria-orientation={orientation} className={styles.tabs}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// Sub-components: read from context
function Tab({ id, children, disabled }: TabProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(id)}
      className={cn(styles.tab, isActive && styles.active, disabled && styles.disabled)}
    >
      {children}
    </button>
  );
}

function TabPanel({ id, children }: TabPanelProps) {
  const { activeTab } = useTabs();
  const isActive = activeTab === id;

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      hidden={!isActive}
      tabIndex={0}
    >
      {isActive ? children : null}
    </div>
  );
}

// Namespace export — the "namespaced compound component" idiom
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;
```

**Consumer usage:**
```tsx
<Tabs defaultTab="overview" onChange={handleTabChange}>
  {/* Consumer controls ordering, can conditionally render, can inject custom elements */}
  <Tabs.Tab id="overview">Overview</Tabs.Tab>
  {isAdmin && <Tabs.Tab id="config">Config</Tabs.Tab>}
  <Tabs.Tab id="logs" disabled={!hasLogs}>Logs</Tabs.Tab>

  <Tabs.Panel id="overview"><OverviewContent /></Tabs.Panel>
  {isAdmin && <Tabs.Panel id="config"><ConfigContent /></Tabs.Panel>}
  <Tabs.Panel id="logs"><LogsContent /></Tabs.Panel>
</Tabs>
```

#### Approach 2: cloneElement-Based (legacy, avoid in new code)

```typescript
// Parent iterates children with React.Children.map + cloneElement
function Select({ value, onChange, children }) {
  return (
    <div>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          isSelected: child.props.value === value,
          onSelect: onChange,
        });
      })}
    </div>
  );
}
```

**Problems with cloneElement approach:**
- Only works one level deep (wrapping children in a `<Fragment>` or `<div>` breaks it)
- Exposes implementation props (`isSelected`, `onSelect`) publicly — leaks internals
- TypeScript typing is complex and fragile

**Use Context, not cloneElement, for new implementations.**

#### Approach 3: Flexible Compound Components with `useContextSelector`

At scale with performance-sensitive UIs, avoid re-rendering all sub-components when any part of the shared context changes:

```typescript
// Use zustand store or useContextSelector to minimise re-renders
import { createContext, useContextSelector } from 'use-context-selector';

const TabsContext = createContext<TabsContextValue>({} as TabsContextValue);

function Tab({ id, children }: TabProps) {
  // Only re-renders when activeTab changes (not when orientation changes)
  const isActive = useContextSelector(TabsContext, (ctx) => ctx.activeTab === id);
  const setActiveTab = useContextSelector(TabsContext, (ctx) => ctx.setActiveTab);
  // ...
}
```

### Architecture & Component Boundaries

**When to use Compound Components vs Config-Driven Components:**

| Signal | Use Compound Components | Use Config-Driven (prop arrays) |
|---|---|---|
| Consumer needs structural flexibility | ✅ Yes — render in custom order, inject non-standard children | — |
| The content inside items is complex JSX | ✅ Yes — tabs, accordions, menus with icons/badges | — |
| Simple list of uniform items | — | ✅ Yes — `<Select options={[...]}/>` is simpler |
| Server-driven UI (config from API) | — | ✅ Yes — mapping API data to components is easier |
| Design system shared library | ✅ Yes — flexibility for consuming teams | — |
| Internal page component | ✅ or — | Choice: prefer flexibility OR simplicity for your team |

### Performance Implications

Context-based compound components cause **re-renders of all sub-components** whenever shared context changes by default. Mitigation strategies:

1. **Split contexts**: Separate the stable config context from the frequently-changing state context
```typescript
const TabsConfigContext = createContext<TabsConfig>({} as TabsConfig);   // orientation etc.
const TabsStateContext = createContext<TabsState>({} as TabsState);       // activeTab
```

2. **Memoize sub-components**: `React.memo(Tab)` prevents re-renders when props are unchanged
3. **useContextSelector**: Only re-render when the slice of context the component cares about changes
4. **Avoid putting large data in context**: Context is for coordination (which tab is active), not for data (the tab content)

### Trade-offs

| Advantage | Disadvantage |
|---|---|
| Consumer controls layout and structure | More verbose consumer API than config-driven |
| Easy conditional rendering of sub-components | Discovery problem: consumers must know which sub-components exist |
| No prop-drilling between parent and children | Incorrect nesting (using `Tab` outside `Tabs`) causes runtime errors — requires guard hook |
| Accessibility implementation centralised in parent | Testing requires rendering the parent context to test any sub-component |
| TypeScript namespace pattern improves DX | Type-checking between parent and sub-component IDs (tab ID matching panel ID) is not compile-time enforced |

### Anti-Patterns & Pitfalls

1. **Missing required sub-context guard:**
   ```typescript
   // ❌ No guard — Tab renders silently wrong when used outside Tabs
   function Tab({ id, children }) {
     const ctx = useContext(TabsContext); // ctx is null, crashes at runtime
   }
   
   // ✅ Guard with helpful error message
   function useTabs() {
     const ctx = useContext(TabsContext);
     if (!ctx) throw new Error('<Tab> must be used inside <Tabs>. Are you missing the parent <Tabs> component?');
     return ctx;
   }
   ```

2. **Leaking implementation details as public props:**
   Sub-components should only accept consumer-relevant props. Never expose `isActive`, `onSelect`, or state props — those come from context.

3. **Using compound components for simple dropdowns:**
   A `<Select options={['One', 'Two', 'Three']} />` does not need compound component architecture. Config-driven is simpler and equally maintainable.

4. **Deep nesting breaking context-less cloneElement implementations:**
   Only a problem with cloneElement approach, not context. Another reason to use context.

---

## 3. Real-World Examples

**Headless UI (Tailwind Labs):** `<Disclosure>`, `<Menu>`, `<Combobox>` — all compound components using Context providing open/close state; consumer provides all styling and structure via sub-components

**Radix UI (used by Vercel, Linear, Notion):** Every component is a compound — `<Tabs.Root>`, `<Tabs.List>`, `<Tabs.Trigger>`, `<Tabs.Content>` — context manages state and ARIA attributes; sub-components are primitives without styling; consumers style freely

**React Aria (Adobe):** Similar pattern tailored for WCAG AA compliance — parent handles full keyboard navigation and ARIA management; sub-components delegate all interaction to the parent context

**At Hruday's level (SAP Lighthouse):** Building WCAG AA-compliant components, the compound pattern was directly applicable: the `Tabs` parent manages `aria-selected`, `aria-controls`, and keyboard navigation (arrow key roving tabindex), while sub-components simply connect to context. This prevents accessibility bugs from spreading across multiple sub-components implementing their own event handlers.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "The Compound Component Pattern is how you build component APIs that give consumers structural control while keeping shared state managed internally by the parent. You've seen it in standard HTML: select and option are compound components. In React, the pattern uses Context — the parent provides shared state (which tab is active, whether the accordion is open, what value is selected) via context, and each sub-component reads from that context without needing props passed down from outside. The key architectural decision is whether to use compound components versus a simple config-driven API — I use compound components when the consumer needs to control the structure of what renders: inject custom children between items, conditionally show certain sub-components, add non-standard elements like badges or tooltips inside the component. For a simple select dropdown with a static list of strings, a prop array is cleaner. The hardest problem in production is performance — you need to either split the context into config vs state, or use a library like `use-context-selector` to prevent every sub-component re-rendering whenever any shared state changes. At SAP, we've used this pattern for all Tab, Accordion, and Wizard components in the design system, with the ARIA management centralised in the parent."

**Likely Follow-up Questions:**
1. How does the compound pattern compare to render props? → Render props = consumer controls rendering by passing a function; compound components = consumer controls structure by nesting sub-components; compound is more readable at scale but render props are more flexible for dynamic content
2. What is the TypeScript challenge with compound components? → Ensuring the namespace sub-components have proper types; using discriminated unions to prevent wrong sub-component nesting; cannot enforce at compile time that `Tab` IDs match `Panel` IDs 
3. How does Radix UI use this pattern? → Every Radix component is a compound component (Root/Trigger/Content) with context-managed state; Radix handles all ARIA and keyboard interaction internally; by design it has no styles, making it a "headless" compound component
4. How do you handle keyboard navigation in compound components? → Keyboard navigation handlers live on the parent; the parent tracks all focusable children via refs and manages roving tabindex; sub-components expose refCallback to register themselves

**Comparison With Alternatives:**
- **Config-driven (`<Tabs tabs={[...]} />`)**: Simpler API, harder to customise structure, easier to drive from server data
- **Render props**: Flexible for dynamic content but verbose; supplanted by hooks + compound components for most cases
- **HOCs**: Largely replaced; harder to type and compose

---

## 5. Code Example

```typescript
// Real-world Accordion compound component with accessibility

const AccordionContext = createContext<AccordionContextValue | null>(null);
const AccordionItemContext = createContext<AccordionItemValue | null>(null);

function useAccordion() {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error('AccordionItem must be inside an Accordion');
  return ctx;
}

function useAccordionItem() {
  const ctx = useContext(AccordionItemContext);
  if (!ctx) throw new Error('AccordionTrigger/Content must be inside AccordionItem');
  return ctx;
}

// Root — manages which items are expanded
function Accordion({ type = 'single', children }: AccordionProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(type === 'single' ? [] : prev);
      if (prev.has(id) && type !== 'always-open') {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [type]);

  return (
    <AccordionContext.Provider value={{ expanded, toggle }}>
      <div>{children}</div>
    </AccordionContext.Provider>
  );
}

// Item — provides item-level context (its own id, open state)
function AccordionItem({ id, children }: AccordionItemProps) {
  const { expanded, toggle } = useAccordion();
  const isOpen = expanded.has(id);

  return (
    <AccordionItemContext.Provider value={{ id, isOpen, toggle: () => toggle(id) }}>
      <div data-state={isOpen ? 'open' : 'closed'}>{children}</div>
    </AccordionItemContext.Provider>
  );
}

// Trigger — reads item context for ARIA + interaction
function AccordionTrigger({ children }: { children: React.ReactNode }) {
  const { id, isOpen, toggle } = useAccordionItem();

  return (
    <button
      id={`trigger-${id}`}
      aria-expanded={isOpen}
      aria-controls={`panel-${id}`}
      onClick={toggle}
      className={cn(styles.trigger, isOpen && styles.open)}
    >
      {children}
      <ChevronIcon className={cn(styles.chevron, isOpen && styles.rotate)} />
    </button>
  );
}

// Content — animated panel, hidden when closed
function AccordionContent({ children }: { children: React.ReactNode }) {
  const { id, isOpen } = useAccordionItem();

  return (
    <div
      id={`panel-${id}`}
      role="region"
      aria-labelledby={`trigger-${id}`}
      hidden={!isOpen}
      className={cn(styles.panel, isOpen && styles.visible)}
    >
      {children}
    </div>
  );
}

// Namespace export
Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Content = AccordionContent;

// Consumer usage — structural freedom is the core value
<Accordion type="single">
  <Accordion.Item id="tos">
    <Accordion.Trigger>Terms of Service</Accordion.Trigger>
    <Accordion.Content>
      <TermsContent />
    </Accordion.Content>
  </Accordion.Item>
  {isNewUser && (
    <Accordion.Item id="onboarding">
      <Accordion.Trigger>Getting Started Guide</Accordion.Trigger>
      <Accordion.Content>
        <OnboardingGuide />
      </Accordion.Content>
    </Accordion.Item>
  )}
</Accordion>
```

---

## 6. Memory Aid

**Mental Model:** Think of `<Tabs>` as a **radio button group at the component level**. The parent knows which button is "selected"; each `<Tab>` sub-component is a radio button that doesn't need to know what the other buttons are doing. Context is the shared circuit connecting them.

**Key sentence if you go blank:** "Context-based compound components: parent provides state via Context, sub-components consume it — no prop-drilling, full structural flexibility for the consumer."

**When to reach for it:** Any time a component needs to be split into sub-components that share state but where the consumer should control the layout — tabs, accordions, dropdowns, menus, wizards, segmented controls.

---

## 7. Why & How Summary

**Why it matters:**
→ UX: Compound components make it easy to build accessible, consistent interactive UI elements because ARIA management and keyboard interaction are centralised in the parent
→ DX: Consumers get structural control (conditional rendering, custom ordering) without prop-drilling complexity
→ Architecture: Headless UI libraries (Radix UI, Headless UI, React Aria) all use this pattern as their foundation — understanding it is prerequisite for using or building design system libraries

**How it works (3 sentences):**
The parent component creates a React Context holding shared state (selected item, open/closed, active value) and provides it to all children; sub-components consume that context to read relevant state and trigger state changes, without the consumer needing to pass these props explicitly. The namespace pattern (`Tabs.Tab`, `Accordion.Item`) groups sub-components with their parent for discoverability and signals that they cannot be used standalone. Performance is managed by splitting fast-changing state context from stable config context and optionally using `React.memo` or `useContextSelector` to prevent unnecessary sub-component re-renders.

**Company relevance:**
- Microsoft: Fluent UI uses compound component pattern for `Menu`, `Tooltip`, `Popover`; senior component library engineers must understand context-based compound component design
- Adobe: React Aria / React Spectrum is built entirely on compound components for accessibility-first component APIs; Hruday's WCAG AA experience at SAP is directly transferable
- Salesforce: React Lightning Design System components follow compound pattern; understanding the pattern is required for customising or extending LWC component hierarchies
- Cisco: Momentum Design System uses compound components for complex interactive elements; engineers contributing to the design system need this pattern
