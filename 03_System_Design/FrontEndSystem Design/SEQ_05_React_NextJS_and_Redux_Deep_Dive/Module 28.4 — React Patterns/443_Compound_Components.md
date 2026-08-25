# 443 – Compound Components Pattern

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Compound Components** are a set of components that work together, sharing implicit state via Context. The parent manages state; children consume it. Think `<select>` + `<option>` — they're meaningless alone but powerful together. Provides a flexible, declarative API.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── COMPOUND COMPONENT: Accordion ────
import { createContext, useContext, useState, ReactNode } from 'react';

// 1. Shared Context
interface AccordionContextType {
  openItems: Set<string>;
  toggle: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

function useAccordion() {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error('Accordion children must be used within <Accordion>');
  return ctx;
}

// 2. Parent — manages state
interface AccordionProps {
  children: ReactNode;
  multiple?: boolean;
}

function Accordion({ children, multiple = false }: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  
  const toggle = (id: string) => {
    setOpenItems(prev => {
      const next = new Set(multiple ? prev : []);
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div role="tablist">{children}</div>
    </AccordionContext.Provider>
  );
}

// 3. Child — consumes context
function AccordionItem({ id, title, children }: {
  id: string; title: string; children: ReactNode;
}) {
  const { openItems, toggle } = useAccordion();
  const isOpen = openItems.has(id);
  
  return (
    <div>
      <button role="tab" onClick={() => toggle(id)} aria-expanded={isOpen}>
        {title} {isOpen ? '▲' : '▼'}
      </button>
      {isOpen && <div role="tabpanel">{children}</div>}
    </div>
  );
}

// 4. Attach children to parent
Accordion.Item = AccordionItem;

// ──── USAGE ────
function App() {
  return (
    <Accordion multiple>
      <Accordion.Item id="1" title="Section 1">
        Content for section 1
      </Accordion.Item>
      <Accordion.Item id="2" title="Section 2">
        Content for section 2
      </Accordion.Item>
      <Accordion.Item id="3" title="Section 3">
        Content for section 3
      </Accordion.Item>
    </Accordion>
  );
}

// ──── ANOTHER EXAMPLE: Tabs ────
const TabsContext = createContext<{ activeTab: string; setActiveTab: (t: string) => void } | null>(null);

function Tabs({ children, defaultTab }: { children: ReactNode; defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }: { children: ReactNode }) {
  return <div role="tablist">{children}</div>;
}

function Tab({ id, children }: { id: string; children: ReactNode }) {
  const { activeTab, setActiveTab } = useContext(TabsContext)!;
  return (
    <button role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)}>
      {children}
    </button>
  );
}

function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  const { activeTab } = useContext(TabsContext)!;
  return activeTab === id ? <div role="tabpanel">{children}</div> : null;
}

// Usage:
// <Tabs defaultTab="tab1">
//   <TabList><Tab id="tab1">One</Tab><Tab id="tab2">Two</Tab></TabList>
//   <TabPanel id="tab1">Content 1</TabPanel>
//   <TabPanel id="tab2">Content 2</TabPanel>
// </Tabs>
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Compound Components share implicit state via Context. Parent manages state, children consume it. Like HTML select + option. Benefits: flexible composition, declarative API, no prop drilling. Used in Tabs, Accordion, Dropdown, Menu. Context + custom hook for type-safe access."*

## 4. 🧠 MEMORY AID
**"Compound = Parent (Context.Provider + state) + Children (useContext). select/option pattern. Attach: Parent.Child = ChildComponent."**
