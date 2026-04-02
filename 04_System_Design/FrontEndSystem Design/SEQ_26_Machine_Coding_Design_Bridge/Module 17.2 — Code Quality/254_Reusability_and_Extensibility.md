# 254 – Reusability & Extensibility

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Reusable and extensible components work across multiple contexts without modification and can be extended for new use cases without touching internal code. This tests your API design skills — can you create a component with the right abstraction level? Too rigid = not reusable. Too flexible = too complex. The sweet spot is a component with **sensible defaults**, **composition via children/slots**, **callback props for behavior customization**, and **style overrides without forking**. In machine coding rounds, demonstrating reusable thinking (even for a one-off component) shows design maturity.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Patterns for Reusability

**1. Composition over Configuration:**
```typescript
// ❌ Configuration hell — too many props
<Card variant="horizontal" showImage imagePosition="left" showActions showBadge badgeColor="red" />

// ✅ Composition — flexible, readable
<Card>
  <Card.Image src={img} position="left" />
  <Card.Body>
    <Card.Title>Product A</Card.Title>
    <Card.Badge color="red">Sale</Card.Badge>
  </Card.Body>
  <Card.Actions>
    <Button>Buy</Button>
  </Card.Actions>
</Card>
```

**2. Render Props / Headless Components:**
```typescript
// Headless — provides behavior, consumer provides UI
function useToggle(initial = false) {
  const [isOn, setIsOn] = useState(initial);
  const toggle = useCallback(() => setIsOn(prev => !prev), []);
  return { isOn, toggle, setOn: setIsOn };
}

// Full control over rendering
function FeatureFlag({ flag }: { flag: string }) {
  const { isEnabled } = useFeatureFlag(flag);
  return isEnabled ? <NewUI /> : <LegacyUI />;
}
```

**3. Polymorphic Components (as prop):**
```typescript
// Render as different HTML elements
function Box<T extends React.ElementType = 'div'>({ as, ...props }: { as?: T } & React.ComponentPropsWithoutRef<T>) {
  const Component = as || 'div';
  return <Component {...props} />;
}

// Usage
<Box as="section" className="panel">Content</Box>
<Box as="main" style={{ padding: 16 }}>Main content</Box>
```

### Extensibility Principles

- **Open/Closed Principle**: Open for extension, closed for modification
- **Inversion of Control**: Let the consumer decide rendering (render props, children)
- **Prop Forwarding**: `...rest` props forwarded to root element
- **Ref Forwarding**: `React.forwardRef` for DOM access from parent
- **Style Extension**: `className` prop merged with internal classes, or `style` override

### Anti-Patterns

- ❌ Boolean prop explosion: `showHeader`, `showFooter`, `showSidebar`, `showActions`
- ❌ Internal `if/else` for every variant instead of composition
- ❌ Not forwarding refs — breaks parent's ability to focus/measure
- ❌ Hardcoded styles without override mechanism
- ❌ Building for hypothetical future reuse — YAGNI (You Aren't Gonna Need It)

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Headless UI (Tailwind Labs)
Headless UI provides accessible behavior without any styles — the ultimate in extensibility. Consumers get WAI-ARIA-compliant interactions (dropdown, dialog, combobox) and provide all the rendering.

### Hruday @ SAP Labs
At SAP, our design system used compound components extensively — `sap.m.Table` with `sap.m.Column` and `sap.m.ColumnListItem` follow this exact composition pattern. Building reusable Fiori components taught me the value of composition over configuration.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I design reusable components using composition over configuration. Instead of 15 boolean props, I use compound components: `<Card><Card.Image /><Card.Body /><Card.Actions /></Card>`. For behavior reuse without UI, I use headless hooks. I always forward refs and spread rest props to the root element. The key is choosing the right abstraction level — not too rigid, not too flexible. At SAP, our design system components followed these exact patterns."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Reusable DataTable with Compound Components
function DataTable<T>({ data, children }: { data: T[]; children: React.ReactNode }) {
  return <table role="table"><thead><tr>{children}</tr></thead>
    <tbody>{data.map((row, i) => <tr key={i}>{React.Children.map(children, (col: any) => 
      <td>{col.props.render(row)}</td>
    )}</tr>)}</tbody></table>;
}

DataTable.Column = function Column<T>({ header, render }: { header: string; render: (row: T) => React.ReactNode }) {
  return <th>{header}</th>;
};

// Usage — consumer controls columns
<DataTable data={users}>
  <DataTable.Column header="Name" render={(u: User) => u.name} />
  <DataTable.Column header="Email" render={(u: User) => u.email} />
  <DataTable.Column header="Actions" render={(u: User) => <Button onClick={() => edit(u.id)}>Edit</Button>} />
</DataTable>
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Reusable = Composition + Headless Hooks + Ref Forwarding + Rest Props."** Compound components over boolean props. Headless hooks for behavior without UI. Always forward refs and spread rest props. Polymorphic `as` prop for element flexibility. Don't build for hypothetical reuse — YAGNI.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Demonstrates API design skills and component library thinking — critical for design system work at all target companies.
**How:** Compound component pattern, headless hooks, polymorphic `as` prop, ref forwarding, prop spreading, className merging.
**Companies:** Microsoft (Fluent UI), Adobe (Spectrum), Salesforce (Lightning Design System), Cisco (component libraries).
