# 104. Compound Component Pattern
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

The Compound Component pattern lets a parent component share implicit state with a set of child components that are designed to work together, without passing props through intermediate layers. The parent manages state internally; child components access that state via Context. API consumers compose the parts: `<Select><Select.Option value="a">A</Select.Option></Select>`. The child components (`Select.Option`) are typically exposed as static properties of the parent (`Select.Option = OptionComponent`). This is the dominant pattern in mature UI libraries (Radix UI, Headless UI, Reach UI, React Aria) because it's composable, accessible by default, and gives consumers full control over markup and styling without re-implementing behavior.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Problem Compound Components Solve

```typescript
// ❌ Monolithic component with configuration props — inflexible, props explosion
<Select
  options={[{ label: 'Australia', value: 'au', flag: '🦘', disabled: false }]}
  placeholder="Select country"
  isSearchable={true}
  isGrouped={true}
  renderOption={(opt) => <>{opt.flag} {opt.label}</>}  // custom render prop creep
  onSelectedChange={setCountry}
/>
// Adding any new feature requires a new prop — prop explosion pattern
// Consumers cannot control the structure, only configuration

// ✅ Compound component — composable, full structural control
<Select value={country} onChange={setCountry}>
  <Select.Trigger placeholder="Select country" />
  <Select.Dropdown>
    <Select.Group label="Oceania">
      <Select.Option value="au">🦘 Australia</Select.Option>
      <Select.Option value="nz">🥝 New Zealand</Select.Option>
    </Select.Group>
    <Select.Option value="jp" disabled>🗾 Japan (unavailable)</Select.Option>
  </Select.Dropdown>
</Select>
// Consumers control the full structure — add icons, groups, disabled states freely
```

### Implementation — Context-Based Compound Component

```typescript
// select.tsx — full compound component implementation

import { createContext, useContext, useState, useId } from 'react';

// ========================
// 1. Internal Context — shared state between compound components
// ========================
interface SelectContextValue {
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  labelId: string;
  listboxId: string;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext(componentName: string): SelectContextValue {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error(`<${componentName}> must be used inside <Select>`);
  return ctx;
}

// ========================
// 2. Root component — manages state, provides context
// ========================
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

function Select({ value, onChange, children }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const uid = useId();

  return (
    <SelectContext.Provider value={{
      value, onChange,
      isOpen, setIsOpen,
      labelId: `${uid}-label`,
      listboxId: `${uid}-listbox`,
    }}>
      <div className="select-root">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

// ========================
// 3. Child components — access shared context
// ========================
interface TriggerProps {
  placeholder?: string;
  className?: string;
}

function SelectTrigger({ placeholder = 'Select...', className }: TriggerProps) {
  const { value, isOpen, setIsOpen, labelId, listboxId } = useSelectContext('Select.Trigger');

  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-labelledby={labelId}
      aria-controls={listboxId}
      className={className}
    >
      {value || placeholder}
      <span aria-hidden>{isOpen ? '▲' : '▼'}</span>
    </button>
  );
}

interface DropdownProps { children: React.ReactNode; }

function SelectDropdown({ children }: DropdownProps) {
  const { isOpen, listboxId, value } = useSelectContext('Select.Dropdown');

  if (!isOpen) return null;

  return (
    <ul
      role="listbox"
      id={listboxId}
      aria-activedescendant={value}
      tabIndex={-1}
    >
      {children}
    </ul>
  );
}

interface OptionProps {
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function SelectOption({ value, disabled = false, children }: OptionProps) {
  const { value: selectedValue, onChange, setIsOpen } = useSelectContext('Select.Option');
  const isSelected = selectedValue === value;

  const handleSelect = () => {
    if (disabled) return;
    onChange(value);
    setIsOpen(false);
  };

  return (
    <li
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      onClick={handleSelect}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {children}
      {isSelected && <span aria-hidden> ✓</span>}
    </li>
  );
}

interface GroupProps {
  label: string;
  children: React.ReactNode;
}

function SelectGroup({ label, children }: GroupProps) {
  const id = useId();
  return (
    <li role="presentation">
      <span id={id} role="group" aria-labelledby={id}>
        {label}
      </span>
      <ul role="group" aria-labelledby={id}>
        {children}
      </ul>
    </li>
  );
}

// ========================
// 4. Attach sub-components as static properties
// ========================
Select.Trigger = SelectTrigger;
Select.Dropdown = SelectDropdown;
Select.Option = SelectOption;
Select.Group = SelectGroup;

export { Select };

// ========================
// 5. Consumer usage
// ========================
function CountrySelector() {
  const [country, setCountry] = useState('');

  return (
    <Select value={country} onChange={setCountry}>
      <Select.Trigger placeholder="Select country" />
      <Select.Dropdown>
        <Select.Group label="Oceania">
          <Select.Option value="au">🦘 Australia</Select.Option>
          <Select.Option value="nz">🥝 New Zealand</Select.Option>
        </Select.Group>
        <Select.Option value="jp" disabled>🗾 Japan (unavailable)</Select.Option>
      </Select.Dropdown>
    </Select>
  );
}
```

### Controlled vs Uncontrolled Compound Components

```typescript
// Controlled: parent owns the value
<Select value={value} onChange={setValue}>
  ...
</Select>

// Uncontrolled: component manages its own state
<Select defaultValue="au">
  ...
</Select>
```

```typescript
// Implementation supporting both patterns
function Select({ value, onChange, defaultValue, children }: SelectProps) {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');

  // If value prop is provided: controlled mode
  // If only defaultValue: uncontrolled mode
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : internalValue;

  const handleChange = (newValue: string) => {
    if (!isControlled) setInternalValue(newValue);
    onChange?.(newValue);
  };

  return (
    <SelectContext.Provider value={{ value: activeValue, onChange: handleChange, ... }}>
      {children}
    </SelectContext.Provider>
  );
}
```

### Validating Compound Component Children

```typescript
// Optional: validate that children are only compound-component sub-types
React.Children.forEach(children, (child) => {
  if (React.isValidElement(child)) {
    const childType = (child as React.ReactElement).type;
    if (![SelectOption, SelectGroup].includes(childType as any)) {
      console.warn('Select.Dropdown: only Select.Option and Select.Group are valid children');
    }
  }
});
// Use sparingly — enforcing structure rigidly reduces consumer flexibility
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the accordion component was built as a monolithic component with `items: AccordionItem[]` prop — adding custom icons, badges, or supplementary actions inside accordion headers required adding more props until the API became unwieldy. Refactoring to compound component pattern: `<Accordion><Accordion.Item><Accordion.Header>Custom header</Accordion.Header><Accordion.Panel>Content</Accordion.Panel></Accordion.Item></Accordion>` allowed teams to compose any markup inside headers without new props.

**At FAANG scale:**
- **Radix UI / shadcn/ui (Microsoft/Adobe widely adopt):** `<Dialog.Root><Dialog.Trigger /><Dialog.Portal><Dialog.Overlay /><Dialog.Content /></Dialog.Portal></Dialog.Root>` — full compound component; consumers style everything freely
- **Adobe React Spectrum:** `<Picker label="Country"><Item key="au">Australia</Item></Picker>` — compound component with Picker.Item
- **Salesforce Lightning:** `<AccordionSection title="Account Details">` is a child of `<Accordion>` — classic compound component pattern in LWC-React layer
- **Cisco:** Network device selector UI implemented as compound `<DeviceTree.Node>`, `<DeviceTree.Leaf>`, `<DeviceTree.Root>` components

---

## 💬 4. Interview Execution

### Sample Answer

> "The Compound Component pattern lets a set of components share implicit state through Context, composing together like HTML elements. The parent manages state; children access it without needing it passed as props. The API consumer gets full structural control — they choose which children to include, in what order, with what content.
>
> The implementation: the root component creates a Context with its state, wraps `children` in the Provider, and exposes sub-components as static properties — `Select.Option`, `Select.Trigger`, `Select.Dropdown`. Each sub-component reads from the Context with a custom hook that throws a helpful error if used outside the root.
>
> This is how all major headless UI libraries are built — Radix UI, Headless UI, React Aria. The key insight is that 'headless' means: the behavior (accessibility, keyboard navigation, ARIA relationships) lives in the compound component, but the visual markup and styling are entirely up to the consumer. You don't fight against an opinion on how the HTML should look.
>
> The alternative patterns — render props and HOCs — can achieve similar goals but with more nesting and indirection in the component tree. Compound components keep the tree clean and the API readable."

---

## 💻 5. Code Example

```typescript
// Tabs compound component — full production implementation
import { createContext, useContext, useState, useId } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  tablistId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(name: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${name}> must be rendered inside <Tabs>`);
  return ctx;
}

// Root
function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const tablistId = useId();
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, tablistId }}>
      {children}
    </TabsContext.Provider>
  );
}

// Tab List container
function TabList({ children }: { children: React.ReactNode }) {
  const { tablistId } = useTabs('Tabs.List');
  return (
    <div role="tablist" id={tablistId} aria-label="Tabs">
      {children}
    </div>
  );
}

// Individual Tab button
function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab, tablistId } = useTabs('Tabs.Tab');
  const isSelected = activeTab === id;
  return (
    <button
      role="tab"
      id={`${tablistId}-tab-${id}`}
      aria-selected={isSelected}
      aria-controls={`${tablistId}-panel-${id}`}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  );
}

// Tab Panel content
function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  const { activeTab, tablistId } = useTabs('Tabs.Panel');
  if (activeTab !== id) return null;
  return (
    <div
      role="tabpanel"
      id={`${tablistId}-panel-${id}`}
      aria-labelledby={`${tablistId}-tab-${id}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

// Attach as static properties
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage
function SettingsPage() {
  return (
    <Tabs defaultTab="profile">
      <Tabs.List>
        <Tabs.Tab id="profile">Profile</Tabs.Tab>
        <Tabs.Tab id="security">Security</Tabs.Tab>
        <Tabs.Tab id="notifications">Notifications</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel id="profile">
        <ProfileForm />
      </Tabs.Panel>
      <Tabs.Panel id="security">
        <SecuritySettings />
      </Tabs.Panel>
      <Tabs.Panel id="notifications">
        <NotificationPreferences />
      </Tabs.Panel>
    </Tabs>
  );
}

declare function ProfileForm(): JSX.Element;
declare function SecuritySettings(): JSX.Element;
declare function NotificationPreferences(): JSX.Element;
```

---

## 🧠 6. Memory Aid

**Compound Components = HTML elements pattern applied to React.** Like `<table><tr><td>` — each element knows about its parent context implicitly, without explicit prop passing.

**Three ingredients:**
1. Context — shared between parent and children
2. Static properties — `Parent.Child = ChildComponent`
3. Error guard — `if (!ctx) throw new Error('<Child> must be inside <Parent>')`

**Mnemonic:** **COPES** — **C**ontext shared, **O**ne root component, **P**arts exposed as static props, **E**rror guard in hook, **S**ubcomponents access context not props.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ This is the pattern behind every major headless UI library — knowing it means you can build production-grade, accessible component APIs that don't lock consumers into your markup decisions
→ API design: compound components score well on the API design principle of "most common use is easy; complex use is possible" — add one child for simple case, compose many children for complex case
→ Accessibility: shared Context makes it natural to coordinate ARIA attributes between triggerant and content (aria-controls, aria-labelledby, id relationships) — the root component can assign IDs and pass them to children

**How it works (2 sentences):**
The root component creates React Context containing its managed state (active tab, open/closed, selected value) and wraps its `children` in the Context Provider; child components call `useContext` to read this state implicitly, providing them access to coordinated state without explicit prop passing through intermediate components.
Sub-components are attached as static properties of the root function object (`Select.Option = SelectOption`), giving the API a namespaced, discoverable shape that communicates the expected composition in both the JSX and TypeScript types.

**Company relevance:**
- Microsoft: Fluent UI uses compound component pattern extensively (Accordion, Dialog, Menu, Dropdown)
- Adobe: React Spectrum / React Aria — entire library is built as compound components with behavior hooks
- Salesforce: Lightning Design React uses compound component pattern for forms, lists, cards
- Cisco: DevNet UI Kit components (TreeView, ConfigForm) use compound component pattern for extensibility

---
✅ Topic 104/486 complete → Continuing to Topic 105: Render Props Pattern — When Still Useful
